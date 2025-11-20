import { Award } from "lucide-react";

export default function RubricDisplay({ rubric }) {
  if (!rubric || rubric.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-yellow-600" />
        <h3 className="font-bold text-yellow-900">טבלת ניקוד (Rubric)</h3>
      </div>

      <div className="space-y-3">
        {rubric.map((section, idx) => (
          <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
            <div className="font-bold text-sm mb-2">
              {section.part_id ? `סעיף ${section.part_id}` : 'כללי'} - {section.max_score} נקודות
            </div>
            <div className="space-y-1">
              {section.rules.map((rule, i) => (
                <div key={i} className="text-sm flex items-start gap-2">
                  <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded font-bold text-xs flex-shrink-0">
                    {rule.score} נק'
                  </span>
                  <span className="text-gray-700">
                    {rule.condition} ({rule.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}