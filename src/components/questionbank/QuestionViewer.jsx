import { Award, CheckCircle } from "lucide-react";

export default function QuestionViewer({ question, solution, showSolution = false }) {
  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-blue-900">השאלה</h3>
          <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded">
            {question.max_score} נקודות
          </span>
        </div>
        <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
          {question.question_text}
        </div>
        {question.question_image_url && (
          <img
            src={question.question_image_url}
            alt="question"
            className="mt-4 rounded-xl border-2 border-blue-300 max-w-full"
          />
        )}
        {question.parts && question.parts.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-bold text-blue-900">סעיפים:</div>
            {question.parts.map((part, idx) => (
              <div key={idx} className="bg-white rounded p-2 text-sm">
                <strong>{part.part_id}.</strong> {part.text} ({part.max_score} נק')
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solution */}
      {showSolution && solution && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-green-900">הפתרון</h3>
          </div>

          {solution.solution_steps && solution.solution_steps.length > 0 && (
            <div className="mb-4 space-y-2">
              {solution.solution_steps.map((step, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {step.description}
                      </div>
                      {step.key_formula && (
                        <div className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 mb-1">
                          נוסחה: {step.key_formula}
                        </div>
                      )}
                      {step.key_result && (
                        <div className="text-xs text-green-700 font-semibold">
                          תוצאה: {step.key_result}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
            <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
              {solution.solution_text}
            </div>
          </div>

          {solution.final_answers && solution.final_answers.length > 0 && (
            <div className="mt-4 bg-green-600 text-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" />
                <strong>תשובות סופיות:</strong>
              </div>
              {solution.final_answers.map((ans, idx) => (
                <div key={idx} className="text-sm">
                  {ans.part_id && `סעיף ${ans.part_id}: `}
                  <strong>{ans.value}</strong> {ans.unit}
                  {ans.variants && ans.variants.length > 0 && (
                    <span className="opacity-75"> (גם: {ans.variants.join(', ')})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}