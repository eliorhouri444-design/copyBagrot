import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url = "https://kibinimatika.org/2019/12/12/%d7%a4%d7%aa%d7%a8%d7%95%d7%a0%d7%95%d7%aa-%d7%9e%d7%9c%d7%90%d7%99%d7%9d-%d7%9c%d7%91%d7%97%d7%99%d7%a0%d7%aa-%d7%94%d7%91%d7%92%d7%a8%d7%95%d7%aa-%d7%91%d7%9e%d7%aa%d7%9e%d7%98%d7%99%d7%a7%d7%94/" } = await req.json();

        console.log(`Scanning URL: ${url}`);
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const foundExams = [];
        
        // The structure seems to be Elementor Accordion items, usually representing years
        const accordionItems = $('.elementor-accordion-item');

        for (const item of accordionItems) {
            const titleElement = $(item).find('.elementor-tab-title');
            const titleText = titleElement.text().trim();
            
            // Extract year (e.g. "שנת 2024")
            const yearMatch = titleText.match(/20\d{2}/);
            if (!yearMatch) continue;
            
            const year = parseInt(yearMatch[0]);
            const contentId = titleElement.attr('aria-controls');
            const contentDiv = $(`#${contentId}`);
            
            // Look for links inside the content div
            // Usually organized in tables or lists: "מועד חורף", "מועד א", "מועד ב"
            const links = contentDiv.find('a');
            
            for (const link of links) {
                const linkText = $(link).text().trim();
                const href = $(link).attr('href');
                
                if (!href) continue;

                let season = 'summer';
                let term = 'a';
                let label = linkText;

                if (linkText.includes('חורף')) {
                    season = 'winter';
                    term = 'a'; // Winter usually has one term, or A
                } else if (linkText.includes('קיץ')) {
                    season = 'summer';
                }

                if (linkText.includes('מועד ב')) {
                    term = 'b';
                } else if (linkText.includes('מועד ג') || linkText.includes('מיוחד')) {
                    term = 'special';
                }

                // Identify if it's a direct PDF or a post page
                let examUrl = null;
                let solutionUrl = null;

                if (href.endsWith('.pdf')) {
                    // It's likely the exam or solution directly (older years sometimes behave like this)
                    // But usually Kibinimatika links to a post page for recent years
                    // We'll assume if it's a PDF in the main list, it might be the exam
                    examUrl = href; 
                } else {
                    // It's a post page. We need to fetch it to find the PDF links.
                    try {
                        console.log(`Fetching sub-page for ${year} ${season} ${term}: ${href}`);
                        const subRes = await fetch(href);
                        const subHtml = await subRes.text();
                        const $sub = cheerio.load(subHtml);
                        
                        // Look for PDF links in the sub-page
                        const pdfLinks = $sub('a[href$=".pdf"]');
                        
                        for (const pdf of pdfLinks) {
                            const pdfHref = $sub(pdf).attr('href');
                            const pdfText = $sub(pdf).text().trim();
                            
                            // Heuristic to detect Exam vs Solution
                            if (pdfText.includes('שאלון') || pdfText.includes('בחינה') || pdfHref.includes('exam') || pdfHref.includes('question')) {
                                if (!examUrl) examUrl = pdfHref;
                            } else if (pdfText.includes('פתרון') || pdfText.includes('תשובות') || pdfHref.includes('solution') || pdfHref.includes('sol')) {
                                if (!solutionUrl) solutionUrl = pdfHref;
                            } else if ($sub(pdf).find('i.fa-file-pdf').length > 0) {
                                // Fallback: button with PDF icon
                                if (!examUrl) examUrl = pdfHref; // Assume first is exam
                            }
                        }
                        
                        // If only one found, logic might be tricky. 
                        // Kibinimatika specific: "להורדת השאלון" vs "לצפיה בפתרון"
                        if (!examUrl) {
                             const examBtn = $sub('a:contains("השאלון")');
                             if (examBtn.length) examUrl = examBtn.attr('href');
                        }
                        if (!solutionUrl) {
                             const solBtn = $sub('a:contains("בפתרון")');
                             if (solBtn.length) solutionUrl = solBtn.attr('href');
                        }

                    } catch (e) {
                        console.error(`Error fetching sub-page ${href}:`, e);
                    }
                }

                if (examUrl) {
                    foundExams.push({
                        id: `kibinimatika_581_${year}_${season}_${term}`,
                        title: `${season === 'winter' ? 'חורף' : 'קיץ'} ${year} מועד ${term === 'a' ? "א'" : (term === 'b' ? "ב'" : "מיוחד")}`,
                        year,
                        season,
                        term,
                        module: "581",
                        examUrl,
                        solutionUrl,
                        status: "ready"
                    });
                }
            }
        }

        return Response.json({ success: true, exams: foundExams });

    } catch (error) {
        console.error("Scan Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});