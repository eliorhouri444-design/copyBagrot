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
        
        const accordionItems = $('.elementor-accordion-item');

        for (const item of accordionItems) {
            const titleElement = $(item).find('.elementor-tab-title');
            const titleText = titleElement.text().trim();
            
            const yearMatch = titleText.match(/20\d{2}/);
            if (!yearMatch) continue;
            
            const year = parseInt(yearMatch[0]);
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

                processPromises.push((async () => {
                    let examUrl = null;
                    let solutionUrl = null;

                    if (href.endsWith('.pdf')) {
                        examUrl = href; 
                    } else {
                        // Fetch sub-page to find the actual PDF links
                        try {
                            const subRes = await fetch(href);
                            const subHtml = await subRes.text();
                            const $sub = cheerio.load(subHtml);
                            
                            // 1. Look for all links ending in .pdf
                            const pdfCandidates = [];
                            $sub('a[href$=".pdf"]').each((i, el) => {
                                pdfCandidates.push({
                                    href: $sub(el).attr('href'),
                                    text: $sub(el).text().trim(),
                                    parentText: $sub(el).parent().text().trim(),
                                    isButton: $sub(el).find('.elementor-button-text').length > 0 || $sub(el).hasClass('elementor-button')
                                });
                            });

                            // 2. Filter and Assign
                            for (const pdf of pdfCandidates) {
                                const fullText = (pdf.text + " " + pdf.parentText).toLowerCase();
                                
                                // Solution detection
                                if (fullText.includes('פתרון') || fullText.includes('תשובות') || fullText.includes('מלא') || pdf.href.includes('sol')) {
                                    if (!solutionUrl) solutionUrl = pdf.href;
                                }
                                // Exam detection
                                else if (fullText.includes('שאלון') || fullText.includes('בחינה') || fullText.includes('טופס') || fullText.includes('נקיה') || pdf.href.includes('exam')) {
                                    if (!examUrl) examUrl = pdf.href;
                                }
                            }

                            // 3. Fallback: If we have exactly 2 PDFs and couldn't decide, assume order (usually Exam then Solution or vice versa, site specific)
                            // Kibinimatika usually puts Exam button then Solution button
                            if ((!examUrl || !solutionUrl) && pdfCandidates.length >= 2) {
                                if (!examUrl) examUrl = pdfCandidates[0].href;
                                if (!solutionUrl) solutionUrl = pdfCandidates[1].href;
                            } else if (!examUrl && pdfCandidates.length === 1) {
                                // Only one PDF found
                                if (!pdfCandidates[0].text.includes('פתרון')) {
                                    examUrl = pdfCandidates[0].href;
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

        await Promise.all(processPromises);
        foundExams.sort((a, b) => b.year - a.year);

        return Response.json({ success: true, exams: foundExams });

    } catch (error) {
        console.error("Scan Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});