import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

// Fetch helper with friendly headers
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Base44Crawler/1.0)',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function absUrl(base, href) {
  try {
    if (!href) return '';
    return new URL(href, base).toString();
  } catch {
    return href || '';
  }
}

function normalizeText(str = '') {
  return String(str).replace(/\s+/g, ' ').trim();
}

// Parse season/term/year from the first cell text, e.g. "קיץ (א) 2022 תשפ\"ב"
function parseSession(cellText) {
  const t = normalizeText(cellText);
  const yearMatch = t.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 0;
  const season = /חורף/.test(t) ? 'winter' : 'summer';
  let term = 'a';
  if (/\(ב\)/.test(t)) term = 'b';
  if (/\(א\)/.test(t)) term = 'a';
  return { year, season, term, raw: t };
}

function withinRange({ year, season, term }, start, end) {
  // Compare by (year, season, term) where winter < summer a < summer b
  function key(y, s, tm) {
    const sVal = s === 'winter' ? 0 : 1;
    const tVal = tm === 'a' ? 0 : 1;
    return y * 100 + sVal * 10 + tVal;
  }
  const k = key(year, season, term);
  const ks = key(start.year, start.season, start.term);
  const ke = key(end.year, end.season, end.term);
  return k >= ks && k <= ke;
}

function extractModuleFromHeader(thText) {
  const t = normalizeText(thText);
  // Expect something like "שאלון 801" or just "801"; fallback to digits
  const d = t.match(/\d{3}/);
  return d ? d[0] : '';
}

async function resolveExamPdfFromPage(pageUrl) {
  try {
    const html = await fetchHtml(pageUrl);
    const $ = cheerio.load(html);

    // 1) direct links to PDF
    const direct = $('a[href$=".pdf"]').first().attr('href');
    if (direct) return absUrl(pageUrl, direct);

    // 2) links with download/expand/fullscreen wording
    let pdfCandidate = '';
    $('a').each((_, a) => {
      const href = $(a).attr('href') || '';
      const txt = normalizeText($(a).text());
      if (/להורדה|הורדה|לחץ כאן|לחצו כאן|פתח|צפייה|בגודל מלא|fullscreen|download/i.test(txt + ' ' + href)) {
        if (/\.pdf(\?|$)/i.test(href)) pdfCandidate = absUrl(pageUrl, href);
      }
    });
    if (pdfCandidate) return pdfCandidate;

    // 3) embedded viewer
    const frame = $('iframe, embed, object').first();
    const src = frame.attr('src') || frame.attr('data') || '';
    if (src) return absUrl(pageUrl, src);
  } catch (e) {
    console.warn('resolveExamPdfFromPage error', pageUrl, e?.message);
  }
  return pageUrl; // fallback (may not be a direct pdf but better than empty)
}

async function collectSolutionPartPdfs(solutionPageUrl) {
  try {
    const html = await fetchHtml(solutionPageUrl);
    const $ = cheerio.load(html);

    const urls = new Set();
    $('a[href$=".pdf"]').each((_, a) => {
      urls.add(absUrl(solutionPageUrl, $(a).attr('href')));
    });
    $('iframe, embed, object').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data') || '';
      if (/\.pdf(\?|$)/i.test(src)) urls.add(absUrl(solutionPageUrl, src));
    });

    return Array.from(urls);
  } catch (e) {
    console.warn('collectSolutionPartPdfs error', solutionPageUrl, e?.message);
    return [];
  }
}

async function scanBagrutOnline(url, { start, end, units = 3 }) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Find all tables; parse headers to detect module columns (801/802/803 for 3 units)
  const exams = [];

  $('table').each((ti, table) => {
    const headers = [];
    $(table).find('thead tr th').each((_, th) => {
      headers.push(extractModuleFromHeader($(th).text()));
    });

    // Fallback if no thead
    if (headers.length === 0) {
      const firstRowTh = $(table).find('tr').first().find('th');
      if (firstRowTh.length) {
        firstRowTh.each((_, th) => headers.push(extractModuleFromHeader($(th).text())));
      }
    }

    // Identify indices for module columns by any 3-digit code in header
    const moduleIndices = [];
    headers.forEach((m, idx) => {
      if (/^\d{3}$/.test(m)) moduleIndices.push({ idx, module: m });
    });

    if (moduleIndices.length === 0) return; // not a 3-units table

    // Iterate rows
    $(table).find('tbody tr, tr').each((ri, tr) => {
      const tds = $(tr).find('td');
      if (tds.length === 0) return;

      const sessionCell = tds.first();
      const sess = parseSession(sessionCell.text());
      if (!sess.year || !withinRange(sess, start, end)) return;

      for (const { idx, module } of moduleIndices) {
        const cell = tds.eq(idx);
        if (!cell || !cell.length) continue;
        // Look for two anchors: "שאלון" and "פתרון"
        let examPage = '';
        let solutionPage = '';
        cell.find('a').each((_, a) => {
          const txt = normalizeText($(a).text());
          const href = $(a).attr('href');
          if (!href) return;
          if (/שאלון/.test(txt)) examPage = absUrl(url, href);
          if (/פתרון/.test(txt)) solutionPage = absUrl(url, href);
        });
        if (!examPage && !solutionPage) continue;

        exams.push({
          module,
          session: sess,
          examPage,
          solutionPage
        });
      }
    });
  });

  // Enrich: resolve direct PDFs and collect solution parts (lightweight)
  const results = [];
  for (const item of exams) {
    const examPdf = item.examPage ? await resolveExamPdfFromPage(item.examPage) : '';
    const solutionParts = item.solutionPage ? await collectSolutionPartPdfs(item.solutionPage) : [];

    const title = `${item.session.season === 'winter' ? 'חורף' : 'קיץ'}${item.session.season === 'summer' ? (item.session.term === 'b' ? ' (ב)' : ' (א)') : ''} ${item.session.year} • שאלון ${item.module}`;

    results.push({
      id: `bo_${item.module}_${item.session.year}_${item.session.season}_${item.session.term}`,
      title,
      year: item.session.year,
      season: item.session.season,
      term: item.session.term,
      module: item.module,
      exam_pdf_url: examPdf,
      solution_part_urls: solutionParts
    });
  }

  // Sort by year desc, then winter after summer A
  results.sort((a, b) => (b.year - a.year) || (a.season === 'winter' ? -1 : a.term === 'a' ? -1 : 1));
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pageUrl = body?.page_url || 'https://www.bagrutonline.co.il/page/108/%D7%91%D7%92%D7%A8%D7%95%D7%AA-%D7%91%D7%9E%D7%AA%D7%9E%D7%98%D7%99%D7%A7%D7%94-%D7%9B%D7%9C-%D7%94%D7%A9%D7%90%D7%9C%D7%95%D7%A0%D7%99%D7%9D-%D7%95%D7%9B%D7%9C-%D7%94%D7%A4%D7%AA%D7%A8%D7%95%D7%A0%D7%95%D7%AA-%D7%9E%D7%9B%D7%9C-%D7%94%D7%A9%D7%A0%D7%99%D7%9D---%D7%91%D7%92%D7%A8%D7%95%D7%AA-%D7%90%D7%95%D7%A0%D7%9C%D7%99%D7%99.aspx';

    const start = {
      year: body?.start_year ?? 2012,
      season: body?.start_season ?? 'winter',
      term: body?.start_term ?? 'a'
    };
    const end = {
      year: body?.end_year ?? 2022,
      season: body?.end_season ?? 'summer',
      term: body?.end_term ?? 'a'
    };

    const units = body?.units ?? 3;

    const exams = await scanBagrutOnline(pageUrl, { start, end, units });

    // Return in a structure similar to the existing Admin UI expectations
    const normalized = exams.map(e => ({
      id: e.id,
      title: e.title,
      year: e.year,
      season: e.season,
      term: e.term,
      module: e.module,
      examUrl: e.exam_pdf_url,
      solutionUrl: '',
      solutionParts: e.solution_part_urls,
      status: 'ready'
    }));

    return Response.json({ success: true, exams: normalized, source: 'bagrutonline' });
  } catch (error) {
    console.error('scanBagrutOnline fatal', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});