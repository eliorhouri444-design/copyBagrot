export const bagrutConfig = {
  "system_name": "BagrutMathSolverIL",
  "version": "1.1",
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
    // --- 5 Units Specific Rules (Existing) ---
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
    },

    // --- 3/4 Units Addendum Rules ---
    {
      "id": "R3-ALG-EQ",
      "units": [3],
      "match_any": ["פתור", "משוואה", "מערכת משוואות", "פירוק לגורמים", "נוסחת השורשים"],
      "topic": "algebra",
      "template_priority": ["T3-ALG-LINEAR-QUAD", "T3-ALG-SYSTEMS"]
    },
    {
      "id": "R3-GEO-TRI",
      "units": [3],
      "match_any": ["משולש", "דמיון", "תלס", "חוצה זווית", "תיכון", "גובה", "חפיפה"],
      "topic": "geometry_plane",
      "template_priority": ["T3-GEO-SIMILARITY-THALES", "T3-GEO-ANGLE-BISECTOR", "T3-GEO-CONGRUENCE"]
    },
    {
      "id": "R3-CIRCLE",
      "units": [3],
      "match_any": ["מעגל", "זווית היקפית", "קוטר", "משיק", "רדיוס"],
      "topic": "geometry_circle",
      "template_priority": ["T3-CIRCLE-ANGLES", "T3-CIRCLE-TANGENT"]
    },
    {
      "id": "R3-FUNC-BASIC",
      "units": [3],
      "match_any": ["פונקציה", "גרף", "חיתוך עם הצירים", "תחום", "טווח", "פרבולה", "ישר"],
      "topic": "functions_basic",
      "template_priority": ["T3-FUNC-LINE-PARABOLA", "T3-FUNC-TRANSFORMS"]
    },
    {
      "id": "R3-TRIG-BASIC",
      "units": [3],
      "match_any": ["sin", "cos", "tan", "משולש ישר זווית", "טריגונומטריה"],
      "topic": "trigonometry_basic",
      "template_priority": ["T3-TRIG-RIGHT-TRI", "T3-TRIG-ANGLES"]
    },
    {
      "id": "R3-PROB-BASIC",
      "units": [3],
      "match_any": ["הסתברות", "קלפים", "קוביות", "עץ הסתברויות", "מאורעות"],
      "topic": "probability_basic",
      "template_priority": ["T3-PROB-TREE-COUNT", "T3-PROB-COND-BASIC"]
    },

    {
      "id": "R4-FUNC-CALC",
      "units": [4],
      "match_any": ["נגזרת", "קיצון", "עליה", "ירידה", "סקיצה", "חקור"],
      "topic": "functions_calculus",
      "template_priority": ["T4-FUNC-INVEST-STD", "T4-FUNC-RATIONAL-ASYM"]
    },
    {
      "id": "R4-TRIG-EQ",
      "units": [4],
      "match_any": ["משוואה טריגונומטרית", "זהות", "sin", "cos", "tan", "2x", "טריגו"],
      "topic": "trigonometry",
      "template_priority": ["T4-TRIG-EQ-STD", "T4-TRIG-ID-STD"]
    },
    {
      "id": "R4-EXP-LOG",
      "units": [4],
      "match_any": ["ln", "log", "מעריכית", "לוגריתמית", "e^"],
      "topic": "exponential_logarithmic",
      "template_priority": ["T4-EXPLOG-EQ", "T4-EXPLOG-FUNC"]
    },
    {
      "id": "R4-GEO-PLANE",
      "units": [4],
      "match_any": ["מעגל", "משיק", "חזקת נקודה", "דמיון", "תלס", "חוצה זווית"],
      "topic": "geometry_plane",
      "template_priority": ["T4-CIRCLE-POWER", "T4-GEO-SIMILARITY-THALES", "T4-GEO-ANGLE-BISECTOR"]
    },
    {
      "id": "R4-PROB",
      "units": [4],
      "match_any": ["בינומי", "התפלגות", "הסתברות", "ציפייה", "סטיית תקן"],
      "topic": "probability_statistics",
      "template_priority": ["T4-PROB-BINOM", "T4-STAT-MEAN-VAR"]
    },
    {
      "id": "R4-ANALYTIC-GEO",
      "units": [4],
      "match_any": ["שיפוע", "משוואת ישר", "מרחק בין נקודות", "אמצע קטע", "מעגל במשוואה"],
      "topic": "analytic_geometry",
      "template_priority": ["T4-ANALYTIC-LINE", "T4-ANALYTIC-CIRCLE"]
    }
  ],

  "templates": [
    // --- Existing 5 Units Templates ---
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
    },

    // --- 3 Units Templates ---
    {
      "id": "T3-ALG-LINEAR-QUAD",
      "topic": "algebra",
      "units": [3],
      "title": "אלגברה: משוואות ליניאריות וריבועיות",
      "plan": [
        {"step": 1, "action": "simplify_move_to_one_side"},
        {"step": 2, "action": "solve_linear_or_quadratic", "methods": ["factoring", "quadratic_formula"], "tools": ["cas_optional"]},
        {"step": 3, "action": "check_solutions", "methods": ["substitution"]}
      ],
      "verifier": [{"type": "substitution", "target": "original_equation"}]
    },
    {
      "id": "T3-ALG-SYSTEMS",
      "topic": "algebra",
      "units": [3],
      "title": "מערכות משוואות (2 נעלמים)",
      "plan": [
        {"step": 1, "action": "choose_method", "methods": ["substitution", "elimination"]},
        {"step": 2, "action": "solve_system", "tools": ["cas_optional"]},
        {"step": 3, "action": "verify", "methods": ["substitution"]}
      ]
    },
    {
      "id": "T3-FUNC-LINE-PARABOLA",
      "topic": "functions_basic",
      "units": [3],
      "title": "פונקציות בסיס: ישר/פרבולה – חיתוכים, תחום, קודקוד",
      "plan": [
        {"step": 1, "action": "domain_analysis"},
        {"step": 2, "action": "intercepts"},
        {"step": 3, "action": "vertex_or_slope", "methods": ["complete_square_optional", "slope_intercept"]},
        {"step": 4, "action": "sketch_summary"}
      ]
    },
    {
      "id": "T3-FUNC-TRANSFORMS",
      "topic": "functions_basic",
      "units": [3],
      "title": "טרנספורמציות גרפים (הזזה/מתיחה/שיקוף)",
      "plan": [
        {"step": 1, "action": "identify_base_function"},
        {"step": 2, "action": "apply_transform_rules"},
        {"step": 3, "action": "key_points_and_sketch"}
      ]
    },
    {
      "id": "T3-TRIG-RIGHT-TRI",
      "topic": "trigonometry_basic",
      "units": [3],
      "title": "טריגונומטריה במשולש ישר-זווית",
      "plan": [
        {"step": 1, "action": "draw_right_triangle_and_label"},
        {"step": 2, "action": "use_definitions", "rules": ["sin=opp/hyp", "cos=adj/hyp", "tan=opp/adj"]},
        {"step": 3, "action": "solve_for_unknown"},
        {"step": 4, "action": "verify_reasonableness"}
      ]
    },
    {
      "id": "T3-GEO-SIMILARITY-THALES",
      "topic": "geometry_plane",
      "units": [3],
      "title": "דמיון + תלס (מקבילים → יחסים)",
      "plan": [
        {"step": 1, "action": "mark_parallel_lines_and_angles"},
        {"step": 2, "action": "prove_similarity", "methods": ["AA"]},
        {"step": 3, "action": "write_proportions_and_solve"},
        {"step": 4, "action": "verify_with_ratio_check"}
      ]
    },
    {
      "id": "T3-GEO-ANGLE-BISECTOR",
      "topic": "geometry_plane",
      "units": [3],
      "title": "חוצה זווית בסיסי (משפט חוצה זווית)",
      "plan": [
        {"step": 1, "action": "identify_angle_bisector"},
        {"step": 2, "action": "apply_angle_bisector_theorem"},
        {"step": 3, "action": "solve_for_unknown"},
        {"step": 4, "action": "verify"}
      ]
    },
    {
      "id": "T3-GEO-CONGRUENCE",
      "topic": "geometry_plane",
      "units": [3],
      "title": "חפיפת משולשים (צ.צ.צ / צ.ז.צ / ז.צ.ז)",
      "plan": [
        {"step": 1, "action": "list_given_equalities"},
        {"step": 2, "action": "choose_congruence_criterion"},
        {"step": 3, "action": "deduce_required_angles_sides"}
      ]
    },
    {
      "id": "T3-CIRCLE-ANGLES",
      "topic": "geometry_circle",
      "units": [3],
      "title": "מעגל: זוויות היקפיות/מרכזיות וקוטר",
      "plan": [
        {"step": 1, "action": "identify_circle_theorem", "rules": ["inscribed_angle_half_central", "angle_in_semicircle_90"]},
        {"step": 2, "action": "compute_angles"},
        {"step": 3, "action": "verify_angle_range"}
      ]
    },
    {
      "id": "T3-CIRCLE-TANGENT",
      "topic": "geometry_circle",
      "units": [3],
      "title": "משיק למעגל (רדיוס מאונך למשיק)",
      "plan": [
        {"step": 1, "action": "use_tangent_radius_perpendicular"},
        {"step": 2, "action": "solve_using_right_triangle_or_angles"},
        {"step": 3, "action": "verify"}
      ]
    },
    {
      "id": "T3-PROB-TREE-COUNT",
      "topic": "probability_basic",
      "units": [3],
      "title": "הסתברות בסיסית: עץ הסתברויות/ספירה",
      "plan": [
        {"step": 1, "action": "define_events"},
        {"step": 2, "action": "build_tree_or_count_outcomes"},
        {"step": 3, "action": "compute_probability"},
        {"step": 4, "action": "verify_bounds_0_1"}
      ]
    },
    {
      "id": "T3-PROB-COND-BASIC",
      "topic": "probability_basic",
      "units": [3],
      "title": "הסתברות מותנית בסיסית",
      "plan": [
        {"step": 1, "action": "use_conditional_definition", "formula": "P(A|B)=P(A∩B)/P(B)"},
        {"step": 2, "action": "compute_intersection"},
        {"step": 3, "action": "verify_bounds_0_1"}
      ]
    },

    // --- 4 Units Templates ---
    {
      "id": "T4-FUNC-INVEST-STD",
      "topic": "functions_calculus",
      "units": [4],
      "title": "חקירת פונקציה (4 יח׳): תחום→חיתוכים→נגזרת→קיצון→סקיצה",
      "plan": [
        {"step": 1, "action": "domain_analysis", "tools": ["cas_optional"]},
        {"step": 2, "action": "intercepts", "tools": ["cas_optional"]},
        {"step": 3, "action": "differentiate", "tools": ["cas_optional"]},
        {"step": 4, "action": "critical_points_and_type", "methods": ["sign_chart"]},
        {"step": 5, "action": "sketch_summary"},
        {"step": 6, "action": "verify", "methods": ["sample_points"]}
      ]
    },
    {
      "id": "T4-FUNC-RATIONAL-ASYM",
      "topic": "functions_calculus",
      "units": [4],
      "title": "פונקציות רציונליות: תחום + אסימפטוטות + חקירה",
      "plan": [
        {"step": 1, "action": "domain_analysis", "notes": "מכנה ≠ 0"},
        {"step": 2, "action": "vertical_asymptotes"},
        {"step": 3, "action": "end_behavior_asymptote", "methods": ["long_division_optional"], "tools": ["cas_optional"]},
        {"step": 4, "action": "derivative_investigation", "tools": ["cas_optional"]},
        {"step": 5, "action": "verify", "methods": ["sample_points"]}
      ]
    },
    {
      "id": "T4-TRIG-EQ-STD",
      "topic": "trigonometry",
      "units": [4],
      "title": "משוואות טריגו (4 יח׳) בתחום נתון",
      "plan": [
        {"step": 1, "action": "use_basic_identities", "rules": ["sin2x=2sinxcosx", "cos2x=2cos^2x-1"]},
        {"step": 2, "action": "factor_or_reduce_to_basic"},
        {"step": 3, "action": "solve_basic_trig"},
        {"step": 4, "action": "apply_interval"},
        {"step": 5, "action": "verify"}
      ]
    },
    {
      "id": "T4-TRIG-ID-STD",
      "topic": "trigonometry",
      "units": [4],
      "title": "זהויות טריגונומטריות (פישוט/הוכחה)",
      "plan": [
        {"step": 1, "action": "choose_side_to_transform"},
        {"step": 2, "action": "apply_identities", "rules": ["1-sin^2=cos^2", "tan=sin/cos"]},
        {"step": 3, "action": "simplify_to_match"},
        {"step": 4, "action": "verify_equivalence"}
      ]
    },
    {
      "id": "T4-EXPLOG-EQ",
      "topic": "exponential_logarithmic",
      "units": [4],
      "title": "מעריכי/לוגריתמי (4 יח׳) עם תנאי תחום",
      "plan": [
        {"step": 1, "action": "domain_conditions", "notes": "ארגומנט לוג > 0"},
        {"step": 2, "action": "substitute_t", "rules": ["t=a^x", "t=e^x"]},
        {"step": 3, "action": "solve_in_t"},
        {"step": 4, "action": "back_substitute_and_filter"},
        {"step": 5, "action": "verify"}
      ]
    },
    {
      "id": "T4-EXPLOG-FUNC",
      "topic": "exponential_logarithmic",
      "units": [4],
      "title": "חקירת פונקציה מעריכית/לוגריתמית",
      "plan": [
        {"step": 1, "action": "domain_analysis"},
        {"step": 2, "action": "intercepts"},
        {"step": 3, "action": "derivative_and_extrema"},
        {"step": 4, "action": "sketch_summary"},
        {"step": 5, "action": "verify"}
      ]
    },
    {
      "id": "T4-CIRCLE-POWER",
      "topic": "geometry_plane",
      "units": [4],
      "title": "חזקת נקודה/מיתרים/משיקים",
      "plan": [
        {"step": 1, "action": "identify_configuration", "rules": ["secant_secant", "tangent_secant", "chord_chord"]},
        {"step": 2, "action": "write_power_equation"},
        {"step": 3, "action": "solve_for_length"},
        {"step": 4, "action": "verify_positive_lengths"}
      ]
    },
    {
      "id": "T4-GEO-SIMILARITY-THALES",
      "topic": "geometry_plane",
      "units": [4],
      "title": "דמיון/תלס (4 יח׳) עם חישובי אורכים/זוויות",
      "plan": [
        {"step": 1, "action": "prove_similarity"},
        {"step": 2, "action": "use_proportions"},
        {"step": 3, "action": "solve"},
        {"step": 4, "action": "verify"}
      ]
    },
    {
      "id": "T4-GEO-ANGLE-BISECTOR",
      "topic": "geometry_plane",
      "units": [4],
      "title": "חוצה זווית (4 יח׳): יחס צלעות/קטעים",
      "plan": [
        {"step": 1, "action": "apply_angle_bisector_theorem"},
        {"step": 2, "action": "solve"},
        {"step": 3, "action": "verify"}
      ]
    },
    {
      "id": "T4-ANALYTIC-LINE",
      "topic": "analytic_geometry",
      "units": [4],
      "title": "ישר: שיפוע, משוואה, חיתוך, מרחק נקודות",
      "plan": [
        {"step": 1, "action": "compute_slope"},
        {"step": 2, "action": "line_equation"},
        {"step": 3, "action": "intersections_optional"},
        {"step": 4, "action": "verify"}
      ]
    },
    {
      "id": "T4-ANALYTIC-CIRCLE",
      "topic": "analytic_geometry",
      "units": [4],
      "title": "מעגל אנליטי: מרכז ורדיוס, חיתוך עם ישר",
      "plan": [
        {"step": 1, "action": "standard_form_center_radius"},
        {"step": 2, "action": "intersect_with_line", "tools": ["cas_optional"]},
        {"step": 3, "action": "verify_points_on_circle"}
      ]
    },
    {
      "id": "T4-PROB-BINOM",
      "topic": "probability_statistics",
      "units": [4],
      "title": "בינומי (4 יח׳): הסתברויות, תוחלת ושונות",
      "plan": [
        {"step": 1, "action": "identify_n_p"},
        {"step": 2, "action": "compute_probabilities"},
        {"step": 3, "action": "use_mean_variance", "rules": ["E=np", "Var=np(1-p)"]},
        {"step": 4, "action": "verify_bounds_0_1"}
      ]
    },
    {
      "id": "T4-STAT-MEAN-VAR",
      "topic": "probability_statistics",
      "units": [4],
      "title": "סטטיסטיקה: ממוצע, שונות, סטיית תקן מטבלה",
      "plan": [
        {"step": 1, "action": "compute_mean"},
        {"step": 2, "action": "compute_variance_std"},
        {"step": 3, "action": "verify_nonnegative"}
      ]
    }
  ]
};