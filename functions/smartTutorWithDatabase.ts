import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.0';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            question, 
            subject_id, 
            topic_id,
            context 
        } = await req.json();

        if (!question) {
            return Response.json({ 
                error: 'Missing question' 
            }, { status: 400 });
        }

        console.log('🤖 Smart Tutor with Database - Processing:', question);

        // שלב 1: חיפוש בבסיס נתונים - שאלות דומות
        let relatedQuestions = [];
        let relatedSolutions = [];

        try {
            const filter = {
                is_active: true
            };

            if (subject_id) filter.subject_id = subject_id;
            if (topic_id) filter.topic_id = topic_id;

            // חיפוש בבנק שאלות
            const questions = await base44.entities.QuestionBank.filter(filter);
            
            // מציאת שאלות רלוונטיות (חיפוש טקסטואלי פשוט)
            relatedQuestions = questions.filter(q => {
                const questionLower = question.toLowerCase();
                const qTextLower = q.question_text.toLowerCase();
                
                // בדיקת מילות מפתח משותפות
                const keywords = questionLower.split(' ').filter(w => w.length > 3);
                return keywords.some(keyword => qTextLower.includes(keyword));
            }).slice(0, 5);

            // שלוף פתרונות לשאלות אלו
            if (relatedQuestions.length > 0) {
                const questionIds = relatedQuestions.map(q => q.question_id);
                const solutions = await base44.entities.SolutionBank.list();
                relatedSolutions = solutions.filter(s => questionIds.includes(s.question_id));
            }

            console.log(`✅ Found ${relatedQuestions.length} related questions`);
        } catch (error) {
            console.error('Error searching database:', error);
        }

        // שלב 2: בניית פרומפט עם קונטקסט מהמאגר
        let knowledgeContext = '';

        if (relatedSolutions.length > 0) {
            knowledgeContext = `\n\n# 📚 פתרונות מהמאגר לשאלות דומות:\n\n`;
            
            relatedSolutions.slice(0, 3).forEach((solution, idx) => {
                const question = relatedQuestions.find(q => q.question_id === solution.question_id);
                
                knowledgeContext += `## דוגמה ${idx + 1}:\n`;
                knowledgeContext += `**שאלה:** ${question?.question_text.substring(0, 200)}...\n\n`;
                knowledgeContext += `**פתרון:**\n${solution.solution_text.substring(0, 500)}...\n\n`;
                
                if (solution.solution_steps?.length > 0) {
                    knowledgeContext += `**שלבי הפתרון:**\n`;
                    solution.solution_steps.slice(0, 3).forEach(step => {
                        knowledgeContext += `${step.step}. ${step.description}\n`;
                    });
                    knowledgeContext += `\n`;
                }
            });
        }

        // שלב 3: בניית פרומפט למורה החכם
        const prompt = `אתה מורה פרטי מומחה. התלמיד שואל:

"${question}"

${knowledgeContext ? `${knowledgeContext}\n---\n\n# הנחיות:\n` : '# הנחיות:\n'}

1. **אם יש פתרונות דומים במאגר** - השתמש בהם כבסיס, התאם למקרה הספציפי
2. **אם אין במאגר** - פתור בעצמך, אבל בסגנון דומה לדוגמאות
3. **תמיד:**
   - הסבר צעד אחר צעד
   - השתמש בשפה פשוטה וברורה
   - תן דוגמאות
   - ודא שהתלמיד מבין

${context ? `\n**הקשר נוסף מהתלמיד:**\n${context}\n` : ''}

---

**תפקידך:** תן תשובה מפורטת ומועילה שתעזור לתלמיד להבין.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: "אתה מורה פרטי מומחה שמשתמש בפתרונות מהמאגר כהשראה, אך תמיד מתאים את ההסבר למקרה הספציפי." 
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.3
        });

        const answer = response.choices[0].message.content;

        console.log('✅ Smart Tutor answered (with database context)');

        return Response.json({
            success: true,
            answer,
            used_database: relatedSolutions.length > 0,
            related_questions_count: relatedQuestions.length
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});