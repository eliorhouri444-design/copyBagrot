import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";

export default function MathInput({ onSubmit, placeholder }) {
  const [steps, setSteps] = useState([""]);

  const addStep = () => {
    setSteps([...steps, ""]);
  };

  const updateStep = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const removeStep = (index) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index);
      setSteps(newSteps);
    }
  };

  const handleSubmit = () => {
    const answer = steps.filter(s => s.trim()).join("\n");
    if (onSubmit) {
      onSubmit(answer, steps);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-blue-200">
      <h3 className="font-bold text-gray-900 mb-3">הזן את הפתרון שלב אחר שלב</h3>
      
      <div className="space-y-2 mb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-2 items-center">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              {index + 1}
            </div>
            <Textarea
              value={step}
              onChange={(e) => updateStep(index, e.target.value)}
              placeholder={`שלב ${index + 1}: לדוגמה - 3x + 5 = 20`}
              className="flex-1 min-h-[60px] font-mono"
              dir="ltr"
            />
            {steps.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStep(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={addStep}
          variant="outline"
          className="flex-1"
        >
          + הוסף שלב
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          disabled={!steps.some(s => s.trim())}
        >
          <Check className="w-4 h-4 ml-2" />
          שלח תשובה
        </Button>
      </div>
    </div>
  );
}