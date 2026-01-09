import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

// Helpers
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

function containsDigits(txt, digits) {
  // true if all digits of `digits` appear in order inside txt
  const d = String(digits).replace(/[^0-9]/g, '');
  const t = String(txt).replace(/[^0-9]/g, '');
  return t.includes(d);
}

function getAliases(moduleId) {
  const m = String(moduleId).replace(/[^0-9]/g, '');
  const map = {
    '381': ['381', '802'],
    '382': ['382', '803'],
    '481': ['481', '804'],
    '482': ['482', '805'],
    '581': ['581', '806'],
    '582': ['582', '807'],
    '801': ['801'], '802': ['802'], '803': ['803'], '804': ['804'], '805': ['805'], '806': ['806'], '807': ['807'],
    '471': ['471'], '472': ['472'], '571': ['571'], '572': ['572']
  };
  return map[m] || [m];
}

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

// Try to find the specific module page from the main “פתרונות מלאים” page
function findModulePageUrl(mainHtml, mainUrl, aliases) {
  const $ = cheerio.load(mainHtml);
  let found = '';
  $('a').each((_, a) => {
    const text = normalizeText($(a).text());
    const href = $(a).attr('href') || '';
    const inText = aliases.some(id => containsDigits(text, id));
    const inHref = aliases.some(id => containsDigits(href, id));
    if (inText || inHref) {
      const target = absUrl(mainUrl, href);
      // prefer links that mention "פתרונות"/"שאלון"
      if (!found || /פתרונות|שאלון/i.test(text)) found = target;
    }
  });
  return found;
}

// Parse a module page (accordion by year). Return list of post links of the chosen module
function collectPostLinksForModule(moduleHtml, moduleUrl, aliases) {
  const $ = cheerio.load(moduleHtml);
  const links = new Set();

  const isMatch = (text) => aliases.some(id => containsDigits(text, id));

  // Strategy 1: inside Elementor accordion items per year
  $('.elementor-accordion-item, .elementor-accordion').each((_, item) => {
    $(item).find('a').each((__, a) => {
      const text = normalizeText($(a).text());
      const href = $(a).attr('href');
      if (!href) return;
      // Typical post titles contain year + season + "שאלון <id>"
      if (isMatch(text) || /מועד|חורף|קיץ|שנת|פתרון/.test(text)) {
        links.add(absUrl(moduleUrl, href));
      }
    });
  });

  // Strategy 2: any link on the page that clearly mentions the module id
  $('a').each((_, a) => {
    const text = normalizeText($(a).text());
    const href = $(a).attr('href');
    if (!href) return;
    if (isMatch(text) || isMatch(href)) links.add(absUrl(moduleUrl, href));
  });

  // Filter obvious non-posts (pdf direct links we will handle later anyway)
  return Array.from(links).filter(u => !u.toLowerCase().endsWith('.pdf'));
}

// From a specific post (e.g., "פתרון בגרות חורף 2025 שאלון 471"), collect the PDF links
async function extractExamAndSolutionFromPost(postUrl) {
  try {
    const html = await fetchHtml(postUrl);
    const $ = cheerio.load(html);

    const pdfs = [];
    $('a[href$=".pdf"]').each((_, a) => {
      pdfs.push({
        href: absUrl(postUrl, $(a).attr('href')),
        text: normalizeText($(a).text()),
        parentText: normalizeText($(a).parent().text())
      });
    });

    let exam = '';
    let solution = '';

    for (const p of pdfs) {
      const t = `${p.text} ${p.parentText}`;
      // solution cues
      if (/פתרון|תשובות|כתוב|מלא/i.test(t)) {
        if (!solution) solution = p.href;
        continue;
      }
      // exam cues
      if (/שאלון|בחינה|טופס|נקיה/i.test(t)) {
        if (!exam) exam = p.href;
        continue;
      }
    }

    // Fallback: if exactly two pdfs, guess first=exam second=solution
    if ((!exam || !solution) && pdfs.length >= 2) {
      exam = exam || pdfs[0].href;
      solution = solution || pdfs[1].href;
    } else if (!exam && pdfs.length === 1) {
      const t = `${pdfs[0].text} ${pdfs[0].parentText}`;
      if (!/פתרון|תשובות|כתוב/i.test(t)) exam = pdfs[0].href; else solution = pdfs[0].href;
    }

    // infer year + season from title if present
    let title = normalizeText($('h1, .entry-title, .elementor-heading-title').first().text()) || postUrl;
    let year = 0;
    const ym = title.match(/20\d{2}/);
    if (ym) year = parseInt(ym[0]);
    let season = /חורף/.test(title) ? 'winter' : (/קיץ/.test(title) ? 'summer' : 'summer');

    return { examUrl: exam, solutionUrl: solution, meta: { title, year, season } };
  } catch (e) {
    console.error('Post parse error', postUrl, e);
    return { examUrl: '', solutionUrl: '', meta: { title: postUrl, year: 0, season: 'summer' } };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const moduleId = String(body?.module || '').replace(/[^0-9]/g, '') || '581';
    const aliases = getAliases(moduleId);
    let startUrl = body?.url || '';

    const MAIN_URLS = [
      'https://kibinimatika.org/2019/04/17/%d7%a4%d7%aa%d7%a8%d7%95%d7%a0%d7%95%d7%aa-%d7%9e%d7%9c%d7%90%d7%99%d7%9d-%d7%9c%d7%9e%d7%91%d7%97%d7%a0%d7%99-%d7%94%d7%91%d7%92%d7%a8%d7%95%d7%aa-%d7%91%d7%9e%d7%aa%d7%9e%d7%98%d7%99%d7%a7%d7%94/',
      'https://kibinimatika.org/2019/12/12/%d7%a4%d7%aa%d7%a8%d7%95%d7%a0%d7%95%d7%aa-%d7%9e%d7%9c%d7%90%d7%99%d7%9d-%d7%9c%d7%9c%d7%91%d7%97%d7%99%d7%a0%d7%aa-%d7%94%d7%91%d7%92%d7%a8%d7%95%d7%aa-%d7%91%d7%9e%d7%aa%d7%9e%d7%98%d7%99%d7%a7%d7%94/'
    ];

    // Resolve module page
    if (!startUrl) {
      for (const MAIN_URL of MAIN_URLS) {
        try {
          const mainHtml = await fetchHtml(MAIN_URL);
          startUrl = findModulePageUrl(mainHtml, MAIN_URL, aliases);
          if (startUrl) break;
        } catch (e) {
          console.warn('Failed fetching main url', MAIN_URL, e?.message);
        }
      }
      if (!startUrl) {
        return Response.json({ success: false, error: `לא נמצא עמוד לשאלון ${moduleId}` }, { status: 404 });
      }
    }

    // Collect post links from module page
    const moduleHtml = await fetchHtml(startUrl);
    const postLinks = collectPostLinksForModule(moduleHtml, startUrl, aliases)
      // remove duplicates & keep only links that look like single post pages (usually contain year or the word "פתרון")
      .filter(u => /20\d{2}|פתרון|מועד|חורף|קיץ/.test(decodeURIComponent(u)));

    if (postLinks.length === 0) {
      return Response.json({ success: true, exams: [], sourceUrl: startUrl, note: 'לא נמצאו פוסטים לשנים/מועדים' });
    }

    // Limit concurrency to avoid hammering site
    const results = [];
    const queue = [...postLinks];
    const inFlight = new Set();
    const MAX = 4;

    async function runNext() {
      if (queue.length === 0) return;
      while (inFlight.size < MAX && queue.length) {
        const url = queue.shift();
        const p = extractExamAndSolutionFromPost(url).then(r => {
          results.push({ url, ...r });
        }).catch(e => console.error('extract error', url, e)).finally(() => inFlight.delete(p));
        inFlight.add(p);
      }
      if (inFlight.size) {
        await Promise.race(inFlight);
        await runNext();
      }
    }

    await runNext();

    // Build exams array
    const exams = results
      .map(r => {
        const year = r.meta.year || 0;
        const season = r.meta.season || 'summer';
        if (!r.examUrl && !r.solutionUrl) return null;
        return {
          id: `kib_${moduleId}_${year || 'y'}_${season}`,
          title: `${season === 'winter' ? 'חורף' : 'קיץ'} ${year || ''}`.trim() + ` • שאלון ${moduleId}`,
          year: year || 0,
          season,
          term: 'a',
          module: moduleId,
          examUrl: r.examUrl || '',
          solutionUrl: r.solutionUrl || '',
          status: 'ready'
        };
      })
      .filter(Boolean)
      // sort by year desc, winter after summer same year
      .sort((a, b) => (b.year - a.year) || (a.season === 'winter' ? -1 : 1));

    return Response.json({ success: true, sourceUrl: startUrl, exams });
  } catch (error) {
    console.error('scanKibinimatika fatal', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});