import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl, questionText, subject, forceSubject, useCache = true } = await req.json();

        if (!imageUrl && !questionText) {
            return Response.json({ error: 'Missing imageUrl or questionText' }, { status: 400 });
        }

        console.log('🚀 Starting OPTIMIZED unified solver...');

        const startTime = Date.now();
        let pipeline = {
            ocr: null,
            classification: null,
            solution: null,
            diagram: null
        };

        // **אופטימיזציה 1: Parallel Processing**
        // אם יש תמונה - נריץ OCR וסיווג במקביל
        if (imageUrl) {
            console.log('📸 Running OCR + Classification in parallel...');
            
            const [ocrResult, classificationResult] = await Promise.all([
                base44.functions.invoke('mathOCR', { imageUrl: imageUrl }).catch(e => ({ data: null })),
                !forceSubject ? base44.functions.invoke('smartClassifier', {
                    text: questionText || '',
                    imageUrl: imageUrl
                }).catch(e => ({ data: null })) : Promise.resolve({ data: null })
            ]);

            if (ocrResult.data?.success) {
                pipeline.ocr = ocrResult.data.ocr_result;
            }

            if (classificationResult.data?.success) {
                pipeline.classification = classificationResult.data.classification;
            }
        } else if (!forceSubject && questionText) {
            // רק סיווג אם אין תמונה
            const classificationResult = await base44.functions.invoke('smartClassifier', {
                text: questionText
            });
            
            if (classificationResult.data?.success) {
                pipeline.classification = classificationResult.data.classification;
            }
        }

        const textForSolving = questionText || pipeline.ocr?.full_text || '';
        const detectedSubject = forceSubject || pipeline.classification?.recommended_solver || subject || 'math';
        
        console.log('🎯 Solving with', detectedSubject);

        // **אופטימיזציה 2: Cache-First Strategy**
        let solverFunction = 'mathSolver';
        if (detectedSubject === 'physics' || pipeline.classification?.subject === 'פיזיקה') {
            solverFunction = 'physicsSolver';
        } else if (detectedSubject === 'chemistry' || pipeline.classification?.subject === 'כימיה') {
            solverFunction = 'chemistrySolver';
        } else if (detectedSubject === 'biology' || pipeline.classification?.subject === 'ביולוגיה') {
            solverFunction = 'biologySolver';
        }

        const solverResult = await base44.functions.invoke(solverFunction, {
            question: textForSolving,
            latexFormulas: pipeline.ocr?.latex_formulas,
            diagram: pipeline.ocr?.diagram_elements,
            imageUrl: imageUrl,
            topic: pipeline.classification?.topic,
            difficulty: pipeline.classification?.difficulty,
            useCache: useCache
        });

        if (solverResult.data?.success) {
            pipeline.solution = solverResult.data.solution;
        }

        // **אופטימיזציה 3: Diagram רק אם באמת צריך**
        if (pipeline.ocr?.has_diagram && 
            pipeline.ocr?.diagram_elements && 
            Object.keys(pipeline.ocr.diagram_elements.points || {}).length > 0) {
            
            console.log('📐 Creating diagram...');
            
            try {
                const visualResult = await base44.functions.invoke('geometryVisualizer', {
                    diagramDescription: pipeline.ocr.diagram_description
                });

                if (visualResult.data?.success) {
                    pipeline.diagram = visualResult.data;
                }
            } catch (error) {
                console.warn('⚠️ Diagram skipped');
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ OPTIMIZED pipeline: ${totalTime}s (was ~15-20s before)`);

        // שמירה
        try {
            await base44.asServiceRole.entities.MathLabSession.create({
                question_text: textForSolving,
                question_image_url: imageUrl,
                subject: pipeline.classification?.subject || subject || 'מתמטיקה',
                topic: pipeline.classification?.topic,
                difficulty: pipeline.classification?.difficulty,
                ocr_analysis: pipeline.ocr,
                solution: pipeline.solution,
                session_duration: parseInt(totalTime)
            });
        } catch (error) {
            console.warn('⚠️ Session save failed (non-critical)');
        }

        return Response.json({
            success: true,
            pipeline: {
                ocr: pipeline.ocr,
                classification: pipeline.classification,
                solution: pipeline.solution,
                diagram: pipeline.diagram
            },
            metadata: {
                processing_time: totalTime + 's',
                solver_used: solverFunction,
                steps_count: pipeline.solution?.steps?.length || 0,
                from_cache: solverResult.data?.from_cache || false,
                optimization_applied: true
            }
        });

    } catch (error) {
        console.error('❌ Unified Solver Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});