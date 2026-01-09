import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { module } = await req.json();
        let { url } = await req.json();

        // Main navigation page for all modules
        const MAIN_URL = "https://kibinimatika.org/2019/04/17/%d7%a4%d7%aa%d7%a8%d7%95%d7%a0%d7%95%d7%aa-%d7%9e%d7%9c%d7%90%d7%99%d7%9d-%d7%9c%d7%9e%d7%91%d7%97%d7%a0%d7%99-%d7%94%d7%91%d7%92%d7%a8%d7%95%d7%aa-%d7%91%d7%9e%d7%aa%d7%9e%d7%98%d7%99%d7%a7%d7%94/";

        // 1. If module is provided, find the specific page URL first
        if (module && !url) {
            console.log(`Searching for module ${module} on main page...`);
            const mainRes = await fetch(MAIN_URL);
            const mainHtml = await mainRes.text();
            const $main = cheerio.load(mainHtml);
            
            // Try to find a link containing the module number
            const links = $main('a');
            for (const link of links) {
                const text = $main(link).text().trim();
                // Check if text contains module number (e.g. "581" or "806")
                // Kibinimatika often writes "שאלון 581" or "581 (806)"
                if (text.includes(module)) {
                    url = $main(link).attr('href');
                    console.log(`Found URL for module ${module}: ${url}`);
                    break;
                }
            }
            
            if (!url) {
                return Response.json({ error: `Could not find a page for module ${module} on the main site.` }, { status: 404 });
            }
        }

        if (!url) {
             return Response.json({ error: "No URL or Module provided" }, { status: 400 });
        }

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
            // Limit scanning to 2018+ to save resources, can be adjusted
            if (year < 2018) continue; 

            const contentId = titleElement.attr('aria-controls');
            const contentDiv = $(`#${contentId}`);
            
            // Inside the year content, there are usually rows or lists for each term
            // Often it's links like "Moed A", "Winter", etc.
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
                        // Sometimes the main link is the exam or solution directly
                        // We can't be sure which one it is without context
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
                                else if (fullText.includes('שאלון') || fullText.includes('בחינה') || fullText.includes('טופס') || fullText.includes('נקיה') || pdf.href.includes('exam') || pdf.href.includes('question')) {
                                    if (!examUrl) examUrl = pdf.href;
                                }
                            }

                            // 3. Fallback: If we have exactly 2 PDFs and couldn't decide, assume order (usually Exam then Solution or vice versa, site specific)
                            // Kibinimatika usually puts Exam button then Solution button
                            if ((!examUrl || !solutionUrl) && pdfCandidates.length >= 2) {
                                // Reset and try strict order
                                // Typically: Left button is Exam, Right is Solution (or top/bottom)
                                // Let's try to detect by checking if one text contains "Questionnaire"
                                
                                const first = pdfCandidates[0];
                                const second = pdfCandidates[1];
                                
                                if (!examUrl && !solutionUrl) {
                                     // Blind guess if text didn't help: first is exam?
                                     // Actually usually they label them clearly.
                                     // If we are here, text matching failed.
                                     // Let's assume the one with shorter text or specific keywords
                                     examUrl = first.href;
                                     solutionUrl = second.href;
                                }
                            } else if (!examUrl && pdfCandidates.length === 1) {
                                // Only one PDF found
                                if (!pdfCandidates[0].text.includes('פתרון')) {
                                    examUrl = pdfCandidates[0].href;
                                } else {
                                    solutionUrl = pdfCandidates[0].href;
                                }
                            }

                        } catch (e) {
                            console.error(`Error fetching sub-page ${href}:`, e);
                        }
                    }

                    if (examUrl || solutionUrl) {
                        foundExams.push({
                            id: `kibinimatika_${module || 'unknown'}_${year}_${season}_${term}`,
                            title: `${season === 'winter' ? 'חורף' : 'קיץ'} ${year} מועד ${term === 'a' ? "א'" : (term === 'b' ? "ב'" : "מיוחד")}`,
                            year,
                            season,
                            term,
                            module: module || "581", // Default or passed module
                            examUrl: examUrl || "",
                            solutionUrl: solutionUrl || "",
                            status: "ready"
                        });
                    }
                })());
            }
        }

        await Promise.all(processPromises);
        foundExams.sort((a, b) => b.year - a.year);

        return Response.json({ success: true, exams: foundExams, sourceUrl: url });

    } catch (error) {
        console.error("Scan Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});