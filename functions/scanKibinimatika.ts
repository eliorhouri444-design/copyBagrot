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
        const processPromises = [];
        
        // The structure seems to be Elementor Accordion items
        const accordionItems = $('.elementor-accordion-item');

        for (const item of accordionItems) {
            const titleElement = $(item).find('.elementor-tab-title');
            const titleText = titleElement.text().trim();
            
            // Extract year (e.g. "שנת 2024")
            const yearMatch = titleText.match(/20\d{2}/);
            if (!yearMatch) continue;
            
            const year = parseInt(yearMatch[0]);
            // Limit to recent years to avoid timeout/too much data if needed, or keep all
            if (year < 2018) continue; 

            const contentId = titleElement.attr('aria-controls');
            const contentDiv = $(`#${contentId}`);
            const links = contentDiv.find('a');
            
            for (const link of links) {
                const linkText = $(link).text().trim();
                const href = $(link).attr('href');
                
                if (!href) continue;

                let season = 'summer';
                let term = 'a';

                if (linkText.includes('חורף')) {
                    season = 'winter';
                }
                
                if (linkText.includes('מועד ב')) {
                    term = 'b';
                } else if (linkText.includes('מועד ג') || linkText.includes('מיוחד') || linkText.includes('נבצרים')) {
                    term = 'special';
                }

                // Create a promise for processing each exam entry to run in parallel
                processPromises.push((async () => {
                    let examUrl = null;
                    let solutionUrl = null;

                    if (href.endsWith('.pdf')) {
                        examUrl = href; 
                    } else {
                        // Fetch sub-page
                        try {
                            const subRes = await fetch(href);
                            const subHtml = await subRes.text();
                            const $sub = cheerio.load(subHtml);
                            
                            // Look for PDF links
                            const pdfLinks = $sub('a[href$=".pdf"]');
                            
                            // Heuristics
                            const candidates = [];
                            pdfLinks.each((i, el) => {
                                candidates.push({
                                    href: $sub(el).attr('href'),
                                    text: $sub(el).text().trim(),
                                    isButton: $sub(el).find('.elementor-button-text').length > 0
                                });
                            });

                            for (const pdf of candidates) {
                                const lowerText = pdf.text.toLowerCase();
                                const lowerHref = pdf.href.toLowerCase();

                                if (lowerText.includes('שאלון') || lowerText.includes('בחינה') || lowerText.includes('טופס')) {
                                    if (!examUrl) examUrl = pdf.href;
                                } else if (lowerText.includes('פתרון') || lowerText.includes('תשובות') || lowerText.includes('מלא')) {
                                    if (!solutionUrl) solutionUrl = pdf.href;
                                }
                            }

                            // If distinct text not found, try fallback based on button text or order
                            if (!examUrl && !solutionUrl && candidates.length >= 2) {
                                // Assume first is exam, second is solution if typical layout
                                examUrl = candidates[0].href;
                                solutionUrl = candidates[1].href;
                            } else if (!examUrl && candidates.length === 1) {
                                // If only one PDF, determine what it is
                                if (candidates[0].text.includes('פתרון')) {
                                    solutionUrl = candidates[0].href;
                                } else {
                                    examUrl = candidates[0].href;
                                }
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
                            solutionUrl: solutionUrl || "",
                            status: "ready"
                        });
                    }
                })());
            }
        }

        // Wait for all sub-pages to be scraped
        await Promise.all(processPromises);

        // Sort by year descending
        foundExams.sort((a, b) => b.year - a.year);

        return Response.json({ success: true, exams: foundExams });

    } catch (error) {
        console.error("Scan Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});