import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import QuestionTypePicker from "./QuestionTypePicker";
import StructuredFieldsEditor from "./StructuredFieldsEditor";
import { Plus, Trash2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function QuestionEditor({ question, onChange }) {
  const q = question || {};

  const update = (patch) => onChange({ ...q, ...patch });

  const updateOption = (idx, value) => {
    const next = [...(q.options || [])];
    next[idx] = value;
    update({ options: next });
  };

  const addOption = () => update({ options: [...(q.options || []), ""] });
  const removeOption = (idx) => update({ options: (q.options || []).filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2">טקסט השאלה</label>
        <Textarea value={q.question_text || ""} onChange={(e) => update({ question_text: e.target.value })} className="w-full min-h-[90px]" />
      </div>

      <QuestionTypePicker value={q.question_type} onChange={(v) => update({ question_type: v })} />

      {(q.question_type === "multiple_choice" || q.question_type === "multiple_choice_image") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold">אפשרויות</label>
            <Button size="sm" onClick={addOption} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" /> הוסף אפשרות
            </Button>
          </div>
          {(q.options || []).map((opt, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-center bg-white p-2 rounded border">
              <div className="col-span-4">
                <Input value={opt || ""} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`אפשרות ${idx + 1}`} />
              </div>
              {q.question_type === "multiple_choice_image" && (
                <div className="col-span-1">
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-3 rounded">
                    <Upload className="w-4 h-4" /> תמונה
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        const next = [...(q.option_images || [])];
                        next[idx] = file_url;
                        update({ option_images: next });
                      } catch { /* silent */ }
                    }} />
                  </label>
                </div>
              )}
              <div className="col-span-1 text-left">
                <Button variant="outline" size="icon" className="border-red-500 text-red-600" onClick={() => removeOption(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-2">תשובה נכונה</label>
          <Input value={q.correct_answer || ""} onChange={(e) => update({ correct_answer: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">נקודות</label>
          <Input type="number" value={q.points || 0} onChange={(e) => update({ points: parseInt(e.target.value || 0) })} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">הסבר</label>
        <Textarea value={q.explanation || ""} onChange={(e) => update({ explanation: e.target.value })} className="w-full min-h-[70px]" />
      </div>

      <StructuredFieldsEditor fields={q.answer_fields || []} onChange={(fields) => update({ answer_fields: fields })} />

      {q.question_type === "matching" && (
        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-600 mb-2">הזן זוגות להתאמה בשדה "שדות מובנים" או באפשרויות (צד שמאל/ימין בסדר תואם).</div>
        </div>
      )}
    </div>
  );
}