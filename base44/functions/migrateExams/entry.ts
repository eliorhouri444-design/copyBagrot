import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Clean slate: Delete all GenericExams
        const existingExams = await base44.asServiceRole.entities.GenericExam.list();
        for (const exam of existingExams) {
            await base44.asServiceRole.entities.GenericExam.delete(exam.id);
        }

        // 2. Process all BagrutExams
        const bagruts = await base44.asServiceRole.entities.BagrutExam.list();
        let processed = 0;
        let errors = [];

        for (const b of bagruts) {
            try {
                await base44.asServiceRole.functions.invoke('processRealBagrut', {
                    exam_pdf_url: b.exam_file_url,
                    solution_pdf_url: b.solution_file_url,
                    subject: b.subject_id,
                    unit: b.unit_level,
                    year: b.year,
                    season: b.season,
                    module_symbol: b.module_symbol
                });
                processed++;
            } catch (e) {
                errors.push({ title: b.title, error: e.message });
            }
        }

        return Response.json({ success: true, processed, errors });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});