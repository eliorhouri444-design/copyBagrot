import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPES = [
  { value: "multiple_choice", label: "רב-ברירה" },
  { value: "short_answer", label: "תשובה קצרה" },
  { value: "open_question", label: "שאלה פתוחה" },
  { value: "calculation", label: "חישוב" },
  { value: "proof", label: "הוכחה" },
  { value: "matching", label: "התאמה" },
  { value: "multiple_choice_image", label: "רב-ברירה עם תמונות" }
];

export default function QuestionTypePicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">סוג השאלה</label>
      <Select value={value || "multiple_choice"} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {TYPES.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}