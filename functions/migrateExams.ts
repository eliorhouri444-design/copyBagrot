import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Allow admin only
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("Starting migration...");

        // 1. Delete AI generated exams (GenericExam where is_generated = true)
        // We do this carefully to not delete the ones we are about to create if they are flagged generated (but real ones are is_generated: false in processRealBagrut)
        const generatedExams = await base44.asServiceRole.entities.GenericExam.filter({ is_generated: true });
        console.log(`Found ${generatedExams.length} generated exams to delete.`);
        
        let deletedCount = 0;
        for (const exam of generatedExams) {
            await base44.asServiceRole.entities.GenericExam.delete(exam.id);
            deletedCount++;
        }

        // 2. Delete GeneratedExam logs
        const generatedLogs = await base44.asServiceRole.entities.GeneratedExam.list();
        for (const log of generatedLogs) {
            await base44.asServiceRole.entities.GeneratedExam.delete(log.id);
        }

        // 3. Process existing BagrutExams
        const bagruts = await base44.asServiceRole.entities.BagrutExam.list();
        console.log(`Found ${bagruts.length} Bagrut exams to process.`);

        let processedCount = 0;
        let errors = [];

        for (const b of bagruts) {
            // Check if already exists in GenericExam (by file url)
            const existing = await base44.asServiceRole.entities.GenericExam.filter({ exam_file_url: b.exam_file_url });
            
            if (existing.length === 0) {
                console.log(`Processing ${b.title}...`);
                try {
                    // Call the processing function
                    // Note: invoking other functions might have timeout limits, so we do it one by one
                    await base44.asServiceRole.functions.invoke('processRealBagrut', {
                        exam_pdf_url: b.exam_file_url,
                        solution_pdf_url: b.solution_file_url,
                        subject: b.subject_id,
                        unit: b.unit_level,
                        year: b.year,
                        season: b.season,
                        module_symbol: b.module_symbol
                    });
                    processedCount++;
                } catch (e) {
                    console.error(`Failed to process ${b.id}:`, e);
                    errors.push({ id: b.id, title: b.title, error: e.message });
                }
            } else {
                console.log(`Skipping ${b.title} (already exists)`);
            }
        }

        return Response.json({
            success: true,
            deleted_generated: deletedCount,
            deleted_logs: generatedLogs.length,
            processed_real: processedCount,
            errors: errors
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});