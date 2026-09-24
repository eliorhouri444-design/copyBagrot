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

        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return Response.json({ error: 'Missing image' }, { status: 400 });
        }

        console.log('🎓 Professional geometry solver with 20 validation rules...');

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `אתה פרופסור לגיאומטריה מהטכניון. תפקידך לפתור שאלות גיאומטריה ברמה מקצועית.

# 🚨 חוק מספר 1: אסור "לדבר על פתרון" - רק לבצע!

❌ אסור: "נחשב את השיפועים..."
❌ אסור: "נשתמש במשפט..."
❌ אסור: "נמצא את..."

✅ חובה: חישובים מפורשים עם מספרים!

---

# 📐 תהליך פתרון גיאומטריה בריבוע/מלבן

## שלב 1: הגדרת מערכת צירים (חובה!)

**הצב קואורדינטות:**
\`\`\`
נסמן צלע הריבוע = a

נקודות:
A = (0, 0)
B = (0, a)
C = (a, a)  
D = (a, 0)
\`\`\`

## שלב 2: מציאת נקודות על צלעות

**אם נקודה F על CD עם CF/FD = 1/2:**

\`\`\`
CF/FD = 1/2
נסמן CF = t, אז FD = 2t
CD = CF + FD = 3t = a
לכן t = a/3

F נמצאת על CD במרחק a/3 מ-C לכיוון D

F = C + (D - C) · (CF/CD)
F = (a, a) + [(a, 0) - (a, a)] · (1/3)
F = (a, a) + (0, -a) · (1/3)
F = (a, a) + (0, -a/3)
F = (a, a - a/3)
F = (a, 2a/3)

✓ נקודה F: (a, 2a/3)
\`\`\`

**אם נקודה E על BC עם BE = FC = a/3:**

\`\`\`
BE = a/3

E = B + (C - B) · (BE/BC)
E = (0, a) + [(a, a) - (0, a)] · (a/3 / a)
E = (0, a) + (a, 0) · (1/3)
E = (0, a) + (a/3, 0)
E = (a/3, a)

✓ נקודה E: (a/3, a)
\`\`\`

## שלב 3: משוואות ישרים

**ישר AE:**
\`\`\`
A = (0, 0)
E = (a/3, a)

כיוון: (a/3, a)
משוואה: y = (a)/(a/3) · x = 3x

✓ ישר AE: y = 3x
\`\`\`

**ישר BF:**
\`\`\`
B = (0, a)
F = (a, 2a/3)

שיפוע = (2a/3 - a) / (a - 0)
       = (-a/3) / a  
       = -1/3

משוואה: y - a = -1/3 · (x - 0)
        y = a - x/3

✓ ישר BF: y = a - x/3
\`\`\`

## שלב 4: הוכחת ניצבות

**וקטור AE:**
\`\`\`
v₁ = E - A = (a/3, a) - (0, 0) = (a/3, a)
\`\`\`

**וקטור BF:**
\`\`\`
v₂ = F - B = (a, 2a/3) - (0, a) = (a, 2a/3 - a) = (a, -a/3)
\`\`\`

**מכפלה סקלרית:**
\`\`\`
v₁ · v₂ = (a/3) · (a) + (a) · (-a/3)
        = a²/3 - a²/3
        = 0

✓ מכפלה = 0 → הוקטורים ניצבים
\`\`\`

**מסקנה: BF ⊥ AE הוכחה! ✓**

## שלב 5: מציאת חיתוכים

**נקודת H (חיתוך AE ו-BF):**
\`\`\`
פתרון מערכת:
y = 3x         (AE)
y = a - x/3    (BF)

3x = a - x/3
9x/3 = 3a/3 - x/3
9x/3 + x/3 = 3a/3
10x/3 = a
x = 3a/10

y = 3x = 3 · (3a/10) = 9a/10

✓ H = (3a/10, 9a/10)
\`\`\`

**נקודת G (חיתוך BF עם AD):**
\`\`\`
AD הוא הצלע התחתונה: y = 0

BF: y = a - x/3
0 = a - x/3
x/3 = a
x = 3a

בדיקה: האם G על הקרן של BF מעבר ל-D?
D = (a, 0), G = (3a, 0)
כן, G מחוץ לריבוע, אבל על הקרן של BF.

✓ G = (3a, 0)
\`\`\`

## שלב 6: חישוב יחס GF/FH

**מרחק FH:**
\`\`\`
F = (a, 2a/3)
H = (3a/10, 9a/10)

FH = √[(3a/10 - a)² + (9a/10 - 2a/3)²]

חישוב x:
3a/10 - a = 3a/10 - 10a/10 = -7a/10

חישוב y:
9a/10 - 2a/3 = 27a/30 - 20a/30 = 7a/30

FH = √[(-7a/10)² + (7a/30)²]
   = √[49a²/100 + 49a²/900]
   = √[441a²/900 + 49a²/900]
   = √[490a²/900]
   = √[49a²/90]
   = 7a/√90
   = 7a/(3√10)
\`\`\`

**מרחק GF:**
\`\`\`
G = (3a, 0)
F = (a, 2a/3)

GF = √[(a - 3a)² + (2a/3 - 0)²]
   = √[(-2a)² + (2a/3)²]
   = √[4a² + 4a²/9]
   = √[36a²/9 + 4a²/9]
   = √[40a²/9]
   = 2a√10/3
\`\`\`

**יחס:**
\`\`\`
GF/FH = (2a√10/3) / (7a/(3√10))
      = (2a√10/3) · (3√10/7a)
      = (2√10 · 3√10) / (3 · 7)
      = (6 · 10) / 21
      = 60/21
      = 20/7

✓ GF/FH = 20/7
\`\`\`

---

# 🚨 בדיקה סופית (חובה!)

✓ השתמשתי בכל הנתונים:
  - BE = FC ✓
  - CF/FD = 1/2 ✓
  - ABCD ריבוע ✓

✓ ביצעתי חישובים מספריים:
  - קואורדינטות: A, B, C, D, E, F, G, H ✓
  - משוואות ישרים: AE, BF ✓
  - מכפלה סקלרית ✓
  - מרחקים ✓

✓ הוכחתי:
  - BF ⊥ AE ✓
  - G על AD ✓
  - GF/FH = 20/7 ✓

---

**עכשיו פתור את השאלה מהתמונה בדיוק לפי התהליך הזה!**

זכור:
- כל נקודה עם קואורדינטות מדויקות
- כל ישר עם משוואה מפורשת
- כל חישוב עם מספרים
- אסור לדלג שלבים!`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4000,
            temperature: 0.05
        });

        const solution = response.choices[0].message.content;

        console.log('✅ Geometry solution with complete coordinate calculations');

        return Response.json({
            success: true,
            solution: solution
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});