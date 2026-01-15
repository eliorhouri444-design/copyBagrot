import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function StructuredFieldsEditor({ fields = [], onChange }) {
  const updateField = (idx, patch) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const addField = () => {
    const keyBase = `field_${fields.length + 1}`;
    const next = [
      ...fields,
      { key: keyBase, label: `שדה ${fields.length + 1}`, type: "text", points: 0, description: "" },
    ];
    onChange(next);
  };

  const removeField = (idx) => {
    const next = fields.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-900">שדות מובנים (Structured)</label>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={addField}>
          <Plus className="w-4 h-4 mr-1" /> הוסף שדה
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="text-xs text-gray-500">אין שדות עדיין. לחץ/י על "הוסף שדה".</div>
      )}

      <div className="space-y-3">
        {fields.map((f, idx) => (
          <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">מפתח (key)</label>
                <Input value={f.key || ""} onChange={(e) => updateField(idx, { key: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">תווית</label>
                <Input value={f.label || ""} onChange={(e) => updateField(idx, { label: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-600">סוג</label>
                <Select value={f.type || "text"} onValueChange={(v) => updateField(idx, { type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="text">טקסט</SelectItem>
                    <SelectItem value="number">מספר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600">נקודות</label>
                <Input type="number" value={f.points || 0} onChange={(e) => updateField(idx, { points: parseInt(e.target.value || 0) })} />
              </div>
              <div className="md:col-span-5">
                <label className="text-xs text-gray-600">תיאור</label>
                <Textarea className="min-h-[60px]" value={f.description || ""} onChange={(e) => updateField(idx, { description: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="border-red-500 text-red-600" onClick={() => removeField(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}