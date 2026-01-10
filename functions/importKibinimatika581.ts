import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simple utility to sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Extract all hrefs from html
function extractLinks(html) {
  const hrefRegex = /href\s*=\s*"([^"]+)"/g;
  const links = [];
  let m;
  while ((m = hrefRegex.exec(html)) !== null) {
    links.push(m[1]);
  }
  return links;
}

// Try to infer year from URL or surrounding text
function inferYearFromUrl(url) {
  // kibinimatika uses /YYYY/ in post URLs and /YYYY/ in uploads path
  const m = url.match(/\/([12][0-9]{3})\//);
  if (m) return parseInt(m[1], 10);
  return null;
}

// Map anchor ids (if present) to season
function mapAnchorToSeason(anchor) {
  if (!anchor) return 'summer';
  const a = anchor.toLowerCase();
  if (a.includes('moedh')) return 'winter';
  // moedm (special) -> treat as summer visually
  return 'summer';
}

// Heuristics to classify exam vs solution from filename or nearby words
function isExamPdf(url) {
  const u = decodeURIComponent(url).toLowerCase();
  if (!u.endsWith('.pdf')) return false;
  // Common Hebrew words for exam
  return (
    u.includes('שאלון') ||
    u.includes('טופס') ||
    u.includes('question') ||
    (!u.includes('פתרון') && !u.includes('solution'))
  );
}

function isSolutionPdf(url) {
  const u = decodeURIComponent(url).toLowerCase();
  if (!u.endsWith('.pdf')) return false;
  return u.includes('פתרון') || u.includes('פתרונות') || u.includes('solution');
}

// Fetch a page and collect PDF links (exam/solution)
async function collectPdfPairsFromPage(base44, pageUrl) {
  const results = [];
  const res = await fetch(pageUrl, { redirect: 'follow' });
  if (!res.ok) return results;
  const html = await res.text();
  const links = extractLinks(html);

  // Group by page sections via anchors if present
  // If URL has anchors like #moedh, we can map season per anchor
  const anchorMatch = pageUrl.split('#')[1];
  const defaultSeason = mapAnchorToSeason(anchorMatch);

  // Filter to same domain and PDFs or inner post links
  const absolute = (l) => (l.startsWith('http') ? l : new URL(l, pageUrl).href);

  // First, collect direct PDF links from this page
  const pdfs = links
    .map(absolute)
    .filter((l) => l.toLowerCase().endsWith('.pdf'));

  // Pair exams and solutions heuristically by year in path
  const byYear = new Map();
  for (const pdf of pdfs) {
    const y = inferYearFromUrl(pdf) || 0;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(pdf);
  }

  for (const [year, urls] of byYear.entries()) {
    if (!year) continue; // skip if no year detected
    const exams = urls.filter(isExamPdf);
    const solutions = urls.filter(isSolutionPdf);

    // Try to pair by simple proximity (take first matching)
    if (exams.length > 0 && solutions.length > 0) {
      results.push({
        year,
        season: defaultSeason,
        exam_pdf_url: exams[0],
        solution_pdf_url: solutions[0],
      });
    }
  }

  // Second, follow inner post links (non-PDF) found on this page that belong to kibinimatika
  const postLinks = links
    .map(absolute)
    .filter((l) => l.includes('kibinimatika.org/') && !l.toLowerCase().endsWith('.pdf'));

  // Limit to reasonable count per page
  const uniquePosts = Array.from(new Set(postLinks)).slice(0, 25);

  for (const postUrl of uniquePosts) {
    try {
      const pr = await fetch(postUrl, { redirect: 'follow' });
      if (!pr.ok) continue;
      const phtml = await pr.text();
      const plinks = extractLinks(phtml).map((l) => (l.startsWith('http') ? l : new URL(l, postUrl).href));
      const ppdfs = plinks.filter((l) => l.toLowerCase().endsWith('.pdf'));
      if (ppdfs.length === 0) continue;

      const year = inferYearFromUrl(postUrl) || inferYearFromUrl(ppdfs[0]);
      if (!year) continue;

      const exams = ppdfs.filter(isExamPdf);
      const solutions = ppdfs.filter(isSolutionPdf);
      if (exams.length && solutions.length) {
        // Infer season from anchor in post URL if exists
        const season = mapAnchorToSeason(postUrl.split('#')[1]);
        results.push({
          year,
          season,
          exam_pdf_url: exams[0],
          solution_pdf_url: solutions[0],
        });
      }
    } catch (_e) {
      // ignore
    }
    // be gentle
    await sleep(150);
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      url = 'https://kibinimatika.org/2019/12/12/%d7%a4%d7%aa%d7%a8%d7%95%d7%a0%d7%95%d7%aa-%d7%9e%d7%9c%d7%90%d7%99%d7%9d-%d7%9c%d7%91%d7%97%d7%99%d7%a0%d7%aa-%d7%94%d7%91%d7%92%d7%a8%d7%95%d7%aa-%d7%91%d7%9e%d7%aa%d7%9e%d7%98%d7%99%d7%a7%d7%94/',
      start_year = 2025,
      end_year = 2018,
      dry_run = false,
      throttle_ms = 300,
    } = body || {};

    console.log('Starting Kibinimatika 581 import...', { url, start_year, end_year, dry_run });

    // 1) Collect pairs from main page
    const pairs = await collectPdfPairsFromPage(base44, url);

    // Filter by year range and uniqueness (exam url key)
    const filtered = [];
    const seen = new Set();
    for (const p of pairs) {
      if (!p.year || p.year > start_year || p.year < end_year) continue;
      const key = `${p.year}|${p.exam_pdf_url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      filtered.push({ ...p, module_symbol: '581' });
    }

    console.log(`Collected ${filtered.length} candidate exams with solutions in range.`);

    if (dry_run) {
      return Response.json({ success: true, count: filtered.length, items: filtered });
    }

    const results = [];
    for (const item of filtered) {
      try {
        console.log('Processing exam:', item);
        const payload = {
          exam_pdf_url: item.exam_pdf_url,
          solution_pdf_url: item.solution_pdf_url,
          subject: 'מתמטיקה',
          unit: 5,
          year: item.year,
          season: item.season === 'winter' ? 'winter' : 'summer',
          module_symbol: item.module_symbol,
        };

        // Invoke the existing processor
        const resp = await base44.asServiceRole.functions.invoke('processRealBagrut', payload);
        results.push({ year: item.year, season: item.season, exam_pdf_url: item.exam_pdf_url, status: resp?.data?.success ? 'imported' : 'failed' });
      } catch (err) {
        console.error('Failed to import item', item.exam_pdf_url, err);
        results.push({ year: item.year, season: item.season, exam_pdf_url: item.exam_pdf_url, status: 'failed', error: String(err?.message || err) });
      }
      await sleep(throttle_ms);
    }

    const imported = results.filter((r) => r.status === 'imported').length;
    const failed = results.length - imported;

    return Response.json({ success: true, imported, failed, details: results });
  } catch (error) {
    console.error('Import Kibinimatika 581 Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});