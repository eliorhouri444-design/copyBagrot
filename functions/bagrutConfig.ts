export const bagrutConfig = {
  "system_name": "BagrutMathSolverIL",
  "version": "1.0",
  "locale": "he-IL",
  "supported_units": [3, 4, 5],
  "global_policies": {
    "solution_style": {
      "default": "bagrut_step_by_step",
      "tone": "clear_short",
      "show_formulas": true,
      "show_checks": true,
      "avoid_unjustified_claims": true
    },
    "verification": {
      "always_check_domain_for": ["log", "sqrt", "division_by_expression"],
      "always_check_substitution_for": ["equations", "systems", "inequalities"],
      "numeric_sanity_checks": {
        "enabled": true,
        "samples": 3,
        "avoid_singularities": true
      }
    }
  },

  "router_rules": [
    {
      "id": "R-FUNC-INVEST",
      "units": [4, 5],
      "match_any": ["חקור", "נגזרת", "קיצון", "סקיצה", "תחום", "עליה", "ירידה", "קעירות", "אסימפטוטה", "פונקציה"],
      "topic": "functions_calculus",
      "template_priority": ["T-FUNC-INVEST-STD"]
    },
    {
      "id": "R-EXP-LOG",
      "units": [4, 5],
      "match_any": ["e^", "ln", "log", "מעריכית", "לוגריתמית"],
      "topic": "exponential_logarithmic",
      "template_priority": ["T-EXPLOG-EQ"]
    },
    {
      "id": "R-SEQUENCE-RECUR",
      "units": [5],
      "match_any": ["a_(n+1)", "נסיגה", "סדרה מוגדרת", "a_{n+1}", "סכום האיברים", "הנדסית", "חשב k"],
      "topic": "sequences_series",
      "template_priority": ["T-SEQ-LINREC-SHIFT"]
    },
    {
      "id": "R-TRIG-EQ",
      "units": [4, 5],
      "match_any": ["sin", "cos", "tan", "טריגו", "זהות", "משוואה טריגונומטרית"],
      "topic": "trigonometry",
      "template_priority": ["T-TRIG-EQ-STD"]
    },
    {
      "id": "R-GEO-PLANE",
      "units": [3, 4, 5],
      "match_any": ["משולש", "מעגל", "חוצה זווית", "תלס", "דמיון", "משיק", "חזקת נקודה", "ריבוע", "מלבן", "יחס", "הוכח"],
      "topic": "geometry_plane",
      "template_priority": ["T-GEO-COORD"]
    },
    {
      "id": "R-GEO-SPACE",
      "units": [5],
      "match_any": ["פירמידה", "מנסרה", "מרחב", "ישר ומישור", "זווית בין ישר למישור", "הטלה", "גובה הפירמידה"],
      "topic": "geometry_space",
      "template_priority": ["T-SPACE-PYRAMID-PROJ"]
    },
    {
      "id": "R-PROB-STAT",
      "units": [4, 5],
      "match_any": ["הסתברות", "התפלגות", "ציפייה", "שונות", "סטיית תקן", "בינומי", "נורמלי"],
      "topic": "probability_statistics",
      "template_priority": ["T-PROB-BINOM"]
    }
  ],

  "templates": [
    {
      "id": "T-SEQ-LINREC-SHIFT",
      "topic": "sequences_series",
      "units": [5],
      "title": "נסיגה ליניארית: a_{n+1}=k a_n + c → הזזה לסדרה הנדסית",
      "detect": {
        "required_patterns": ["a_{n+1} = k a_n + c"],
        "notes": "אם מופיע c קבוע, בדרך כלל עושים b_n=a_n + c/(k-1)"
      },
      "plan": [
        { "step": 1, "action": "identify_k_c", "output": ["k", "c"] },
        { "step": 2, "action": "shift_sequence", "method": "b_n = a_n + c/(k-1)", "guard": "k != 1" },
        { "step": 3, "action": "prove_geometric", "check": "b_{n+1}/b_n = k" },
        { "step": 4, "action": "compute_required_terms_sums", "methods": ["geometric_term", "geometric_sum"] },
        { "step": 5, "action": "solve_for_unknowns", "tools": ["cas"] },
        { "step": 6, "action": "verify", "methods": ["substitution", "numeric_sanity"] }
      ],
      "verifier": [
        {"type": "substitution", "target": "original_recurrence"},
        {"type": "numeric_sanity", "samples": 3}
      ],
      "explainer_script": {
        "he": [
          "נזהה נסיגה מהצורה a_{n+1}=k a_n + c.",
          "נבצע הזזה: נגדיר b_n = a_n + c/(k-1) כדי לבטל את האיבר החופשי.",
          "נראה ש-b_{n+1}=k b_n ולכן b_n הנדסית.",
          "נשתמש בנוסחאות איבר כללי/סכום, ונפתור את הנעלם המבוקש.",
          "לבסוף נבדוק בהצבה שהפתרון עומד בנתונים."
        ]
      }
    },

    {
      "id": "T-FUNC-INVEST-STD",
      "topic": "functions_calculus",
      "units": [4, 5],
      "title": "חקירת פונקציה מלאה (תחום→חיתוכים→נגזרת→קיצון→סקיצה)",
      "plan": [
        {"step": 1, "action": "domain_analysis", "tools": ["cas"]},
        {"step": 2, "action": "intercepts", "tools": ["cas"]},
        {"step": 3, "action": "derivative_first", "tools": ["cas"]},
        {"step": 4, "action": "critical_points", "tools": ["cas"]},
        {"step": 5, "action": "monotonicity_intervals", "tools": ["cas", "numeric_check"]},
        {"step": 6, "action": "second_derivative_optional", "tools": ["cas"]},
        {"step": 7, "action": "sketch_summary", "tools": ["graph_builder_optional"]},
        {"step": 8, "action": "verify", "methods": ["domain", "sample_points"]}
      ],
      "verifier": [
        {"type": "domain", "rules": ["no_log_of_nonpositive", "no_div_by_zero", "no_sqrt_of_negative"]},
        {"type": "substitution", "target": "intercepts"},
        {"type": "numeric_sanity", "samples": 3}
      ],
      "explainer_script": {
        "he": [
            "נמצא תחום הגדרה (מכנים, שורשים, לוגים).",
            "נמצא נקודות חיתוך עם הצירים.",
            "נגזור את הפונקציה ונשווה לאפס למציאת נקודות חשודות כקיצון.",
            "נסווג את הנקודות (טבלה או נגזרת שנייה) ונמצא תחומי עליה/ירידה.",
            "נשרטט סקיצה של הפונקציה."
        ]
      }
    },

    {
      "id": "T-EXPLOG-EQ",
      "topic": "exponential_logarithmic",
      "units": [4, 5],
      "title": "משוואות מעריכיות/לוגריתמיות (הצבה + תנאי תחום)",
      "plan": [
        {"step": 1, "action": "rewrite_to_single_base", "tools": ["cas"]},
        {"step": 2, "action": "substitute_t", "rules": ["t=e^x", "t=a^x"]},
        {"step": 3, "action": "solve_algebraic_in_t", "tools": ["cas"]},
        {"step": 4, "action": "back_substitute", "tools": ["cas"]},
        {"step": 5, "action": "domain_filter", "tools": ["rules_engine"]},
        {"step": 6, "action": "verify", "methods": ["substitution"]}
      ],
      "verifier": [
        {"type": "domain", "rules": ["log_args_positive", "exponential_positive"]},
        {"type": "substitution", "target": "original_equation"}
      ],
      "explainer_script": {
          "he": [
              "נביא את המשוואה לבסיס אחיד.",
              "נבצע הצבה (למשל t=e^x) כדי לקבל משוואה אלגברית פשוטה.",
              "נפתור עבור t ונחזור למשתנה המקורי x.",
              "נבדוק את הפתרונות מול תחום ההגדרה."
          ]
      }
    },

    {
      "id": "T-TRIG-EQ-STD",
      "topic": "trigonometry",
      "units": [4, 5],
      "title": "משוואות טריגונומטריות (גורם משותף/זהויות/תחומי פתרון)",
      "plan": [
        {"step": 1, "action": "standardize", "rules": ["convert_to_sin_cos"]},
        {"step": 2, "action": "use_identities", "rules": ["sin2x=2sinxcosx", "cos2x=1-2sin^2x=2cos^2x-1"]},
        {"step": 3, "action": "factor_or_substitute", "tools": ["cas_optional"]},
        {"step": 4, "action": "solve_basic_trig", "rules": ["sinx=0", "cosx=1/2", "tanx=..."]},
        {"step": 5, "action": "apply_domain_interval", "required": true},
        {"step": 6, "action": "verify", "methods": ["substitution"]}
      ],
      "verifier": [
          {"type": "substitution", "target": "original_equation"}
      ],
      "explainer_script": {
          "he": [
              "נפשט את המשוואה באמצעות זהויות טריגונומטריות.",
              "נפרק לגורמים או נבצע הצבה.",
              "נפתור את המשוואות הבסיסיות (sin x = a וכו').",
              "נמצא את הפתרונות בתחום הנתון."
          ]
      }
    },

    {
      "id": "T-GEO-COORD",
      "topic": "geometry_plane",
      "units": [3, 4, 5],
      "title": "גאומטריה אנליטית מהירה (ריבוע/מלבן/חיתוכים/יחסים) עם אימות",
      "plan": [
        {"step": 1, "action": "choose_convenient_coordinates", "rules": ["square_side=1", "rectangle_axes_aligned"]},
        {"step": 2, "action": "parameterize_points_on_sides", "rules": ["E on BC => (t,1)", "F on CD => (1,1-t)"]},
        {"step": 3, "action": "translate_ratio_conditions", "tools": ["algebra"]},
        {"step": 4, "action": "compute_intersections", "tools": ["cas"]},
        {"step": 5, "action": "compute_required_ratio_or_length", "tools": ["cas"]},
        {"step": 6, "action": "verify_numeric_geometry", "methods": ["distance_check", "ratio_check"]}
      ],
      "verifier": [
        {"type": "numeric_sanity", "samples": 2},
        {"type": "constraints", "rules": ["0<t<1"]}
      ],
      "explainer_script": {
          "he": [
              "נמקם את הצורה במערכת צירים (ראשית בנקודה אסטרטגית).",
              "נבטא את שיעורי הנקודות באמצעות פרמטרים או ערכים ידועים.",
              "נבנה משוואות ישרים ונמצא נקודות חיתוך.",
              "נחשב את הגדלים המבוקשים (מרחקים/יחסים) ונוכיח את הטענה."
          ]
      }
    },

    {
      "id": "T-SPACE-PYRAMID-PROJ",
      "topic": "geometry_space",
      "units": [5],
      "title": "פירמידה ישרה: הטלה לבסיס + טריגו (זווית בין ישר למישור)",
      "plan": [
        {"step": 1, "action": "identify_projection_point_O", "notes": "O=הטלת S על בסיס"},
        {"step": 2, "action": "build_right_triangle_with_projection", "notes": "משולש SOK ישר זווית"},
        {"step": 3, "action": "use_cos_sin_to_get_projection_length", "tools": ["trig"]},
        {"step": 4, "action": "deduce_base_dimensions_from_symmetry", "tools": ["geometry_rules"]},
        {"step": 5, "action": "compute_requested_angles_edges", "tools": ["trig", "cas_optional"]},
        {"step": 6, "action": "verify", "methods": ["recompute_with_alt_triangle", "numeric_sanity"]}
      ],
      "verifier": [
          {"type": "numeric_sanity", "samples": 1}
      ],
      "explainer_script": {
          "he": [
              "נזהה את גובה הפירמידה ואת היטל הקודקוד על הבסיס (נקודה O).",
              "נבנה משולש ישר זווית הכולל את הגובה, היתר וההיטל.",
              "נשתמש בטריגונומטריה במשולש זה כדי למצוא צלעות וזוויות.",
              "נשלים חישובים במישור הבסיס לפי הצורך."
          ]
      }
    }
  ]
};