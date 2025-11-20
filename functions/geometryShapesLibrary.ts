{
  "shape_definitions": {
    "triangle": {
      "hebrew": "משולש",
      "vertices": 3,
      "properties": ["3 צלעות", "3 קודקודים", "סכום זוויות 180°"],
      "types": [
        {"name": "שווה צלעות", "properties": ["כל הצלעות שוות", "כל הזוויות 60°"]},
        {"name": "שווה שוקיים", "properties": ["2 צלעות שוות", "2 זוויות שוות"]},
        {"name": "ישר זווית", "properties": ["זווית של 90°"]},
        {"name": "חד זווית", "properties": ["כל הזוויות < 90°"]},
        {"name": "נרחב זווית", "properties": ["זווית אחת > 90°"]}
      ],
      "common_labels": ["A", "B", "C"],
      "detection_keywords": ["משולש", "triangle", "3 קודקודים", "3 צלעות"]
    },
    "rectangle": {
      "hebrew": "מלבן",
      "vertices": 4,
      "properties": ["4 צלעות", "4 זוויות ישרות", "צלעות מקבילות זוגיות שוות"],
      "types": [
        {"name": "רגיל", "properties": ["אנכי ואופקי"]},
        {"name": "מוטה", "properties": ["בזווית", "לא ישר"]},
        {"name": "הפוך", "properties": ["מסובב 180°"]},
        {"name": "על הצד", "properties": ["מסובב 90°"]}
      ],
      "common_labels": ["A", "B", "C", "D"],
      "detection_keywords": ["מלבן", "rectangle", "4 זוויות ישרות"]
    },
    "square": {
      "hebrew": "ריבוע",
      "vertices": 4,
      "properties": ["4 צלעות שוות", "4 זוויות ישרות"],
      "types": [
        {"name": "רגיל", "properties": ["ישר"]},
        {"name": "מוטה", "properties": ["מסובב בזווית"]},
        {"name": "על קודקוד", "properties": ["עומד על נקודה אחת"]}
      ],
      "common_labels": ["A", "B", "C", "D"],
      "detection_keywords": ["ריבוע", "square", "4 צלעות שוות"]
    },
    "trapezoid": {
      "hebrew": "טרפז",
      "vertices": 4,
      "properties": ["4 צלעות", "זוג אחד של צלעות מקבילות"],
      "types": [
        {"name": "שווה שוקיים", "properties": ["השוקיים שוות"]},
        {"name": "ישר זווית", "properties": ["2 זוויות ישרות"]},
        {"name": "כללי", "properties": ["אין סימטריה מיוחדת"]},
        {"name": "הפוך", "properties": ["הבסיס הקצר למעלה"]}
      ],
      "common_labels": ["A", "B", "C", "D", "E"],
      "detection_keywords": ["טרפז", "trapezoid", "צלעות מקבילות"]
    },
    "parallelogram": {
      "hebrew": "מקבילית",
      "vertices": 4,
      "properties": ["4 צלעות", "2 זוגות צלעות מקבילות", "צלעות נגדיות שוות"],
      "types": [
        {"name": "רגילה", "properties": ["ללא זוויות ישרות"]},
        {"name": "מוטה", "properties": ["בזווית חדה או נרחבת"]}
      ],
      "common_labels": ["A", "B", "C", "D"],
      "detection_keywords": ["מקבילית", "parallelogram", "צלעות מקבילות"]
    },
    "rhombus": {
      "hebrew": "מעוין",
      "vertices": 4,
      "properties": ["4 צלעות שוות", "צלעות נגדיות מקבילות"],
      "common_labels": ["A", "B", "C", "D"],
      "detection_keywords": ["מעוין", "rhombus", "4 צלעות שוות"]
    },
    "circle": {
      "hebrew": "מעגל",
      "vertices": 0,
      "properties": ["כל הנקודות במרחק שווה מהמרכז", "רדיוס קבוע"],
      "types": [
        {"name": "מלא", "properties": ["עם מילוי"]},
        {"name": "ריק", "properties": ["רק קו היקף"]},
        {"name": "עם רדיוס", "properties": ["מסומן קו רדיוס"]},
        {"name": "עם קוטר", "properties": ["מסומן קו קוטר"]}
      ],
      "common_labels": ["O", "M", "r", "R"],
      "detection_keywords": ["מעגל", "circle", "רדיוס", "קוטר"]
    },
    "pentagon": {
      "hebrew": "מחומש",
      "vertices": 5,
      "properties": ["5 צלעות", "5 קודקודים"],
      "common_labels": ["A", "B", "C", "D", "E"],
      "detection_keywords": ["מחומש", "pentagon", "5 צלעות"]
    },
    "hexagon": {
      "hebrew": "משושה",
      "vertices": 6,
      "properties": ["6 צלעות", "6 קודקודים"],
      "common_labels": ["A", "B", "C", "D", "E", "F"],
      "detection_keywords": ["משושה", "hexagon", "6 צלעות"]
    },
    "ellipse": {
      "hebrew": "אליפסה",
      "vertices": 0,
      "properties": ["צורה אובלית", "2 מוקדים"],
      "detection_keywords": ["אליפסה", "ellipse", "אובל"]
    },
    "arc": {
      "hebrew": "קשת",
      "vertices": 0,
      "properties": ["חלק ממעגל", "2 נקודות קצה"],
      "detection_keywords": ["קשת", "arc", "חלק ממעגל"]
    },
    "sector": {
      "hebrew": "גזרה",
      "vertices": 0,
      "properties": ["חלק ממעגל", "2 רדיוסים + קשת"],
      "detection_keywords": ["גזרה", "sector", "פיצה"]
    }
  },
  "combined_patterns": {
    "trapezoid_in_triangle": {
      "description": "טרפז בתוך משולש",
      "example": "ABDE טרפז, BDG משולש",
      "detection": "זהה בסיס משותף + קודקוד חיצוני"
    },
    "triangle_in_triangle": {
      "description": "משולש בתוך משולש",
      "example": "ABC בתוך DEF",
      "detection": "כל קודקוד פנימי בין שני חיצוניים"
    },
    "rectangle_in_rectangle": {
      "description": "מלבן בתוך מלבן",
      "example": "ABCD בתוך EFGH",
      "detection": "מלבן פנימי קטן יותר"
    },
    "circle_in_triangle": {
      "description": "מעגל חסום במשולש",
      "detection": "מעגל שנוגע ב-3 צלעות"
    },
    "circle_around_triangle": {
      "description": "מעגל חוסם משולש",
      "detection": "משולש שקודקודיו על המעגל"
    },
    "multiple_triangles": {
      "description": "מספר משולשים",
      "example": "3-5 משולשים בציור אחד",
      "detection": "זהה כל משולש בנפרד"
    },
    "overlapping_shapes": {
      "description": "צורות חופפות",
      "detection": "צורות שחולקות קודקודים או צלעות"
    },
    "perpendicular_lines": {
      "description": "קווים מאונכים",
      "detection": "סימון זווית ישרה ב-90°"
    },
    "parallel_lines": {
      "description": "קווים מקבילים",
      "detection": "חיצים או סימונים של קבילות"
    },
    "diagonal_lines": {
      "description": "אלכסונים",
      "detection": "קווים המחברים קודקודים לא סמוכים"
    }
  },
  "orientation_handling": {
    "upright": "ישר - רגיל",
    "rotated_45": "מסובב 45 מעלות",
    "rotated_90": "מסובב 90 מעלות",
    "rotated_180": "הפוך לחלוטין",
    "skewed": "מוטה/עקום",
    "tilted": "נוטה בזווית",
    "detection_rule": "זהה את הכיוון הויזואלי - אל תתקן אותו!"
  },
  "special_markings": {
    "right_angle": "סימון ריבוע קטן לזווית ישרה",
    "equal_sides": "סימוני קווים על צלעות שוות",
    "parallel_arrows": "חיצים לצלעות מקבילות",
    "midpoint": "סימון נקודת אמצע",
    "angle_arc": "קשת לסימון זווית",
    "dashed_line": "קו מקווקו - עזר או הארכה",
    "dotted_line": "קו מנוקד - קו עזר"
  },
  "detection_rules": [
    "1. ספור נקודות - כל אות שאתה רואה",
    "2. ספור קווים - כל קו, כולל אלכסונים",
    "3. זהה צורות - כל צורה בנפרד",
    "4. רשום קווים חוצים - כל אלכסון או קו פנימי",
    "5. שמור על מיקום - העתק הדבק ויזואלי",
    "6. אל תתקן כיוון - אם הצורה מוטה, כתוב שהיא מוטה",
    "7. צורות משולבות - רשום כל צורה ברשימת shapes",
    "8. קווים משותפים - זהה קווים שמשותפים ל-2 צורות"
  ]
}