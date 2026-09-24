import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🤖 Multi-Agent System - מערכת מומחים
 * 
 * סוכנים שונים לתחומים שונים
 */

Deno.serve(async (req) => {
  console.log("🤖 MULTI-AGENT SYSTEM");
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { question, subject } = body;

    // בחירת הסוכן המתאים
    const agent = selectAgent(subject);
    
    console.log(`🎯 Selected agent: ${agent.name}`);

    // קריאה ל-LLM עם פרומפט של הסוכן
    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: `${agent.systemPrompt}\n\nשאלה: ${question}`,
      add_context_from_internet: false
    });

    // קונסולידציה (אם צריך יותר מסוכן אחד)
    const needsConsolidation = checkIfNeedsMultipleAgents(question);
    
    let finalAnswer = answer;
    
    if (needsConsolidation) {
      console.log("🔄 Needs consolidation from multiple agents");
      
      const secondaryAgent = selectSecondaryAgent(subject, question);
      const secondaryAnswer = await base44.integrations.Core.InvokeLLM({
        prompt: `${secondaryAgent.systemPrompt}\n\nשאלה: ${question}`,
        add_context_from_internet: false
      });

      // מיזוג תשובות
      finalAnswer = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מנחה המאחד תשובות ממומחים שונים.

תשובה של ${agent.name}:
${answer}

תשובה של ${secondaryAgent.name}:
${secondaryAnswer}

אחד את התשובות למענה אחד מקיף וברור בעברית.`,
        add_context_from_internet: false
      });
    }

    return Response.json({
      success: true,
      answer: finalAnswer,
      metadata: {
        primaryAgent: agent.name,
        needsConsolidation,
        agentsUsed: needsConsolidation ? [agent.name, secondaryAgent?.name] : [agent.name]
      }
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

/**
 * בחירת סוכן ראשי
 */
function selectAgent(subject) {
  const agents = {
    'מתמטיקה': {
      name: '🔢 פרופ\' מתמטיקה',
      systemPrompt: `אתה פרופסור למתמטיקה מומחה בעל ניסיון של 30 שנה.

התמחות שלך:
- אלגברה, חשבון דיפרנציאלי ואינטגרלי
- גיאומטריה אנליטית
- טריגונומטריה
- הסתברות וסטטיסטיקה

סגנון ההוראה שלך:
1. תמיד תתחיל בהגדרות ברורות
2. תשתמש בנוסחאות LaTeX
3. תציג צעד אחר צעד עם הסברים
4. תן דוגמאות נוספות
5. הסבר את האינטואיציה מאחורי הנוסחאות

ענה בעברית ברורה עם LaTeX לנוסחאות.`
    },
    'פיזיקה': {
      name: '⚛️ ד"ר פיזיקה',
      systemPrompt: `אתה פיזיקאי מחקר בעל ניסיון רב בהוראה.

התמחות שלך:
- מכניקה קלאסית
- חשמל ומגנטיות
- אופטיקה
- תרמודינמיקה
- פיזיקה מודרנית

סגנון ההוראה שלך:
1. תמיד הסבר את התופעה הפיזיקלית
2. צייר דיאגרמות (ASCII art)
3. הראה את הנוסחאות ואת היחידות
4. תן דוגמאות מהחיים
5. הסבר קשרים בין תופעות

ענה בעברית עם LaTeX ודיאגרמות.`
    },
    'אנגלית': {
      name: '📚 מורה לאנגלית',
      systemPrompt: `You are an experienced English teacher specializing in Hebrew speakers.

Your expertise:
- Grammar and syntax
- Vocabulary building
- Reading comprehension
- Writing skills
- American and British English

Your teaching style:
1. Explain in clear Hebrew
2. Give examples in English with Hebrew translations
3. Use tables for grammar rules
4. Provide practice exercises
5. Point out common mistakes for Hebrew speakers

Answer in Hebrew with English examples.`
    }
  };

  return agents[subject] || {
    name: '👨‍🏫 מורה כללי',
    systemPrompt: `אתה מורה פרטי מעולה עם ידע רחב.
    
ענה בצורה ברורה ופדגוגית, עם דוגמאות והסברים מפורטים.
אם צריך - השתמש ב-LaTeX, טבלאות ורשימות.`
  };
}

/**
 * בדיקה אם צריך יותר מסוכן אחד
 */
function checkIfNeedsMultipleAgents(question) {
  const multiDisciplinaryKeywords = [
    'מתמטיקה ופיזיקה',
    'ביולוגיה וכימיה',
    'קשר בין',
    'השווה',
    'ההבדל בין'
  ];

  return multiDisciplinaryKeywords.some(keyword => 
    question.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * בחירת סוכן משני
 */
function selectSecondaryAgent(primarySubject, question) {
  if (question.includes('פיזיקה') && primarySubject !== 'פיזיקה') {
    return selectAgent('פיזיקה');
  }
  if (question.includes('מתמטיקה') && primarySubject !== 'מתמטיקה') {
    return selectAgent('מתמטיקה');
  }
  
  return selectAgent('כללי');
}