
import { CheckCircle, Copy, Eye, EyeOff, AlertCircle, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import GraphRenderer from "../tutor/GraphRenderer";
import GeometryRenderer from "../tutor/GeometryRenderer";
import FBDRenderer from "./FBDRenderer";
import MolecularStructure from "./MolecularStructure";

export default function SolutionCard({ solution, showSteps, onToggleSteps }) {
  const handleCopy = () => {
    const text = `${solution.expression}\n\nתשובה: ${solution.solution?.final_answer}\n\nפותרה על ידי: הפותר המתמטי`;
    navigator.clipboard.writeText(text);
    alert("הועתק ללוח!");
  };

  const problemType = solution.solution?.problem_type_detected || solution.solution?.problem_type || solution.metadata?.problem_type || 'כללי';
  const methodUsed = solution.solution?.recommended_method || solution.metadata?.method_used || 'פתרון סטנדרטי';

  // ✅ זיהוי סוג solver
  const isMath = solution.solverMode === 'math' || !solution.solverMode;
  const isPhysics = solution.solverMode === 'physics';
  const isChemistry = solution.solverMode === 'chemistry';

  const headerColor = isPhysics 
    ? 'from-green-600 to-emerald-600'
    : isChemistry
    ? 'from-blue-600 to-cyan-600'
    : 'from-indigo-600 to-purple-600';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerColor} p-6`}>
        <div className="flex items-center gap-3 text-white mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">פתרון מלא</h2>
            <p className="text-sm text-white/90">{problemType}</p>
          </div>
        </div>

        {/* Expression */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 border-white/20">
          <div className="text-sm text-white/80 mb-2">השאלה:</div>
          <div className="text-xl font-bold text-white font-mono">
            {solution.expression}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Method Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-purple-100 text-purple-900 px-3 py-1.5 rounded-full text-sm font-bold">
            <Target className="w-4 h-4" />
            {methodUsed}
          </div>
          
          {solution.metadata?.has_alternatives && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-900 px-3 py-1.5 rounded-full text-xs">
              <Sparkles className="w-3 h-3" />
              {solution.solution?.alternative_methods?.length} שיטות נוספות
            </div>
          )}
          
          {solution.metadata?.verification_passed && (
            <div className="flex items-center gap-2 bg-green-100 text-green-900 px-3 py-1.5 rounded-full text-xs">
              <CheckCircle className="w-3 h-3" />
              אומת
            </div>
          )}
        </div>

        {/* Image if exists */}
        {solution.image && (
          <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
            <img
              src={solution.image.url}
              alt="question"
              className="max-w-full rounded-lg"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}

        {/* ✅ Physics FBD */}
        {isPhysics && solution.solution?.free_body_diagram && (
          <FBDRenderer fbd={solution.solution.free_body_diagram} />
        )}

        {/* ✅ Chemistry Molecular Structure */}
        {isChemistry && solution.solution?.molecular_structure && (
          <MolecularStructure structure={solution.solution.molecular_structure} />
        )}

        {/* ✅ Chemistry Balanced Equation */}
        {isChemistry && solution.solution?.balanced_equation && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4">
            <div className="text-sm font-bold text-blue-900 mb-2">⚗️ משוואה מאוזנת:</div>
            <div className="text-lg font-bold text-gray-900 font-mono text-center">
              {solution.solution.balanced_equation}
            </div>
          </div>
        )}

        {/* Visualization */}
        {solution.solution?.visualization?.graph_data && (
          <GraphRenderer graphData={solution.solution.visualization.graph_data} />
        )}

        {solution.solution?.visualization?.geometry_data && (
          <GeometryRenderer diagram={solution.solution.visualization.geometry_data} />
        )}

        {/* Final Answer */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">תשובה סופית</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {solution.solution?.final_answer}
          </div>
        </div>

        {/* Verification */}
        {solution.solution?.verification && (
          <div className={`border-2 rounded-xl p-4 ${
            solution.solution.verification.valid
              ? 'bg-green-50 border-green-300'
              : 'bg-yellow-50 border-yellow-300'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {solution.solution.verification.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="text-sm font-bold">
                {solution.solution.verification.valid ? '✅ בדיקה עברה' : '⚠️ יש לבדוק שוב'}
              </span>
            </div>
            <div className="text-sm text-gray-700">
              <strong>שיטה:</strong> {solution.solution.verification.method}
            </div>
            {solution.solution.verification.check && (
              <div className="text-xs text-gray-600 mt-1 font-mono bg-white p-2 rounded">
                {solution.solution.verification.check}
              </div>
            )}
          </div>
        )}

        {/* Similar Exercises */}
        {solution.solution?.similar_exercises?.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="text-sm font-bold text-blue-900 mb-3">
              📚 תרגילים דומים לתרגול:
            </div>
            <div className="space-y-2">
              {solution.solution.similar_exercises.map((exercise, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 text-sm text-gray-700">
                  {idx + 1}. {exercise}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={onToggleSteps}
            variant="outline"
            className="flex-1"
          >
            {showSteps ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                הסתר צעדים
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                הצג צעדים
              </>
            )}
          </Button>
          
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            העתק
          </Button>
        </div>
      </div>
    </div>
  );
}
