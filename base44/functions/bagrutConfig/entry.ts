export const bagrutConfig = {
  "system_name": "BagrutMathSolverIL",
  "version": "2.0",
  "locale": "he-IL",
  "supported_units": [3, 4, 5],
  
  "global_quality": {
    "routing": {
      "use_scored_rules": true,
      "min_confidence_to_auto_solve": 0.72,
      "tie_breakers": ["more_specific_regex", "higher_units_match", "template_success_rate"]
    },
    "solution_levels": {
      "hint1": "give_strategy_only_no_algebra",
      "hint2": "give_equations_setup_no_final",
      "skeleton": "give_key_steps_with_missing_gaps",
      "full": "complete_bagrut_solution"
    },
    "verification_strict": {
      "always": ["domain_check", "substitution_check_if_equation", "numeric_sanity_check"],
      "if_geometry": ["constraint_sampling", "distance_ratio_check"],
      "if_calculus": ["differentiate_to_check_integral", "plug_critical_points"],
      "if_prob": ["0<=P<=1", "sum_to_1_when_applicable"]
    },
    "retry_policy": {
      "max_attempts": 2,
      "on_fail_try_templates": "next_in_priority",
      "on_second_fail": "return_partial_with_error_and_best_hint"
    },
    "output": {
      "include_common_mistakes": true,
      "include_grading_rubric": true,
      "include_hint_buttons": true
    }
  },

  "router_rules": [
    {
      "id": "R-SEQ-RECUR-STRONG",
      "units": [5],
      "topic": "sequences_series",
      "regex_any": [
        "a_\\{n\\+1\\}\\s*=\\s*\\d+\\s*a_n\\s*[\\+\\-]\\s*\\d+",
        "a\\_{n\\+1}\\s*=\\s*\\d+a\\_n\\s*[\\+\\-]\\s*\\d+",
        "נסיגה|סדרה\\s+מוגדרת"
      ],
      "score_weights": {
        "regex_hit": 0.55,
        "keyword_hit": 0.20,
        "units_match": 0.15,
        "history_success_rate": 0.10
      },
      "template_priority": ["T-SEQ-LINREC-SHIFT"]
    },
    {
      "id": "R-FUNC-INVEST-STRONG",
      "units": [4, 5],
      "topic": "functions_calculus",
      "regex_any": [
        "חקור|נגזרת|קיצון|סקיצה|עליה|ירידה|קעירות|אסימפטוטה|פונקציה"
      ],
      "score_weights": { "regex_hit": 0.50, "keyword_hit": 0.30, "units_match": 0.20 },
      "template_priority": ["T4-FUNC-INVEST-STD", "T-FUNC-INVEST-STD"]
    },
    {
      "id": "R-TRIG-EQ-STRONG",
      "units": [4, 5],
      "topic": "trigonometry",
      "regex_any": [
        "sin|cos|tan|טריגו|זהות|משוואה\\s+טריגונומטרית"
      ],
      "score_weights": { "regex_hit": 0.50, "keyword_hit": 0.30, "units_match": 0.20 },
      "template_priority": ["T-TRIG-EQ-STD", "T4-TRIG-EQ-STD"]
    },
    {
      "id": "R3-GEO-SIMILARITY-STRONG",
      "units": [3, 4],
      "topic": "geometry_plane",
      "regex_any": [
        "משולש|דמיון|תלס|חוצה\\s+זווית|יחס\\s+צלעות"
      ],
      "score_weights": { "regex_hit": 0.60, "keyword_hit": 0.20, "units_match": 0.20 },
      "template_priority": ["T3-GEO-SIMILARITY-THALES"]
    }
  ],

  "templates": [
    // --- 5 Units: Sequences (Upgraded) ---
    {
      "id": "T-SEQ-LINREC-SHIFT",
      "topic": "sequences_series",
      "units": [5],
      "title": "נסיגה ליניארית: הזזה לסדרה הנדסית",
      "keywords_strict": {
        "regex_any": [
          "a_\\{n\\+1\\}\\s*=\\s*\\d+\\s*a_n\\s*[\\+\\-]\\s*\\d+",
          "a\\_{n\\+1}\\s*=\\s*\\d+a\\_n\\s*[\\+\\-]\\s*\\d+"
        ],
        "must_not_have": ["מטריצה", "וקטור"]
      },
      "plan": [
        { "step": 1, "action": "identify_k_c" },
        { "step": 2, "action": "shift_sequence", "method": "b_n=a_n + c/(k-1)", "guard": "k!=1" },
        { "step": 3, "action": "prove_geometric", "check": "b_{n+1}/b_n=k" },
        { "step": 4, "action": "compute_terms_sums", "methods": ["geometric_sum"] },
        { "step": 5, "action": "solve_for_unknowns", "tools": ["cas"] },
        { "step": 6, "action": "verify", "methods": ["substitution", "numeric_sanity"] }
      ],
      "hint_steps": {
        "hint1": [
          "זו נסיגה מהצורה a_{n+1}=k a_n + c. כדי להפוך להנדסית עושים הזזה: b_n=a_n+const."
        ],
        "hint2": [
          "בחר/י b_n=a_n+ c/(k-1). אז תקבל/י b_{n+1}=k b_n."
        ],
        "skeleton": [
          "הגדרה: b_n=a_n+ c/(k-1).",
          "הוכחה: b_{n+1}=a_{n+1}+c/(k-1)=k a_n+c+c/(k-1)=k(a_n+c/(k-1))=k b_n.",
          "נוסחת סכום/איבר כללי ואז פותרים את הנעלם."
        ],
        "full": [
          "פתרון מלא בכתיבה בגרותית + חישוב + בדיקה."
        ]
      },
      "common_mistakes": [
        "שוכחים ש-k≠1 לפני ההזזה.",
        "טועים בקבוע ההזזה: צריך בדיוק c/(k-1).",
        "שוכחים לבדוק בהצבה את התוצאה."
      ],
      "grading_rubric": [
        {"points": 2, "for": "זיהוי הצורה והגדרת b_n נכונה"},
        {"points": 3, "for": "הוכחה ש-b_n הנדסית"},
        {"points": 3, "for": "שימוש נכון בנוסחת סכום/איבר"},
        {"points": 2, "for": "פתרון הנעלם ובדיקה"}
      ],
      "solution_variants": {
        "short": "להציג רק צעדים קריטיים ונוסחאות.",
        "detailed": "להציג הסבר מילולי לכל צעד + בדיקות."
      },
      "verifier": [
        {"type": "substitution", "target": "original_recurrence"},
        {"type": "numeric_sanity", "samples": 3}
      ]
    },

    // --- 4 Units: Function Investigation (Upgraded) ---
    {
      "id": "T4-FUNC-INVEST-STD",
      "topic": "functions_calculus",
      "units": [4],
      "title": "חקירת פונקציה: תחום→חיתוכים→נגזרת→קיצון→סקיצה",
      "keywords_strict": {
        "regex_any": ["חקור|נגזרת|קיצון|סקיצה|עליה|ירידה"],
        "must_not_have": ["הסתברות", "וקטור"]
      },
      "plan": [
        {"step": 1, "action": "domain_analysis"},
        {"step": 2, "action": "intercepts"},
        {"step": 3, "action": "differentiate"},
        {"step": 4, "action": "critical_points_and_type", "methods": ["sign_chart"]},
        {"step": 5, "action": "sketch_summary"},
        {"step": 6, "action": "verify", "methods": ["sample_points"]}
      ],
      "hint_steps": {
        "hint1": ["תתחיל/י מתחום וחיתוכים, רק אחרי זה נגזרת."],
        "hint2": ["אפסי נגזרת → נקודות חשודות לקיצון → טבלת סימנים."],
        "skeleton": ["תחום → חיתוכים → f'(x) → f'(x)=0 → טבלת סימנים → סקיצה."],
        "full": ["פתרון מלא כולל בדיקות נקודות לדוגמה."]
      },
      "common_mistakes": [
        "שוכחים תחום (במיוחד שברים/לוג).",
        "מסיקים מינימום/מקסימום בלי טבלת סימנים.",
        "טועים בחיתוך עם ציר y בגלל הצבה שגויה."
      ],
      "grading_rubric": [
        {"points": 2, "for": "תחום וחיתוכים"},
        {"points": 4, "for": "נגזרת + פתרון f'(x)=0"},
        {"points": 3, "for": "טבלת סימנים וקביעת קיצון"},
        {"points": 1, "for": "סקיצה/תיאור גרף עקבי"}
      ],
      "solution_variants": {
        "short": "גרף, טבלה ונגזרת.",
        "detailed": "הסבר מלא כולל הצבות בטבלה."
      },
      "verifier": [
        {"type": "domain", "rules": ["no_log_of_nonpositive", "no_div_by_zero", "no_sqrt_of_negative"]},
        {"type": "numeric_sanity", "samples": 3}
      ]
    },

    // --- 3 Units: Geometry Similarity/Thales (Upgraded) ---
    {
      "id": "T3-GEO-SIMILARITY-THALES",
      "topic": "geometry_plane",
      "units": [3],
      "title": "דמיון + תלס (מקבילים → יחסים)",
      "keywords_strict": {
        "regex_any": ["מקביל|תלס|דמיון|יחס\\s*קטעים|הוכח"],
        "must_not_have": ["נגזרת", "אינטגרל"]
      },
      "plan": [
        {"step": 1, "action": "mark_parallel_angles"},
        {"step": 2, "action": "prove_similarity", "methods": ["AA"]},
        {"step": 3, "action": "write_proportions"},
        {"step": 4, "action": "solve_for_unknown"},
        {"step": 5, "action": "verify_ratio_consistency"}
      ],
      "hint_steps": {
        "hint1": ["חפש/י שתי זוויות שוות בגלל מקבילים."],
        "hint2": ["אחרי הדמיון: כתוב/כתבי יחס צלעות מתאימות."],
        "skeleton": ["ז.ז → דמיון → יחס צלעות → פתרון."],
        "full": ["פתרון מלא עם ציון 'צלע מול זווית' והתאמה נכונה."]
      },
      "common_mistakes": [
        "מתאימים צלעות לא נכון בין המשולשים.",
        "משתמשים בתלס בלי להוכיח מקביליות.",
        "שוכחים לבדוק שמדובר באותן זוויות (לא זוויות חיצוניות)."
      ],
      "grading_rubric": [
        {"points": 3, "for": "זיהוי ורישום זוויות שוות"},
        {"points": 3, "for": "רישום דמיון/תלס נכון"},
        {"points": 4, "for": "חישוב נכון והגעה לתשובה סופית"}
      ],
      "solution_variants": {
        "short": "יחס דמיון וחישוב.",
        "detailed": "הוכחת דמיון מלאה (טענה/נימוק)."
      },
      "verifier": [
        {"type": "numeric_sanity", "samples": 1},
        {"type": "constraints", "rules": ["positive_lengths"]}
      ]
    },

    // --- Placeholder/Standard Templates (Backward Compatibility) ---
    {
      "id": "T-TRIG-EQ-STD",
      "topic": "trigonometry",
      "units": [4, 5],
      "title": "משוואות טריגונומטריות (גורם משותף/זהויות)",
      "keywords_strict": { "regex_any": ["sin|cos|tan"] },
      "plan": [
        {"step": 1, "action": "standardize"},
        {"step": 2, "action": "use_identities"},
        {"step": 3, "action": "solve_basic"},
        {"step": 4, "action": "verify"}
      ],
      "hint_steps": {
        "hint1": ["השתמש בזהויות כדי להגיע לפונקציה אחת."],
        "skeleton": ["זהות → פירוק לגורמים → פתרון כללי → פתרון בתחום."]
      },
      "grading_rubric": [],
      "verifier": [{"type": "substitution", "target": "original_equation"}]
    },
    {
      "id": "T4-TRIG-EQ-STD",
      "topic": "trigonometry",
      "units": [4],
      "title": "משוואות טריגו (4 יח׳) בתחום נתון",
      "keywords_strict": { "regex_any": ["sin|cos|tan"] },
      "plan": [
        {"step": 1, "action": "use_basic_identities"},
        {"step": 2, "action": "solve_basic_trig"},
        {"step": 3, "action": "apply_interval"},
        {"step": 4, "action": "verify"}
      ],
      "hint_steps": {
        "hint1": ["פשט את המשוואה ל-sin(x)=a או cos(x)=a."],
        "skeleton": ["פישוט → פתרון כללי → הצבת k למציאת פתרונות בתחום."]
      },
      "grading_rubric": [],
      "verifier": [{"type": "substitution", "target": "original_equation"}]
    }
  ]
};