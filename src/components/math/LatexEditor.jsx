import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Type } from "lucide-react";

export default function LatexEditor({ value, onChange, placeholder, disabled }) {
  const [showSymbols, setShowSymbols] = useState(false);

  const symbols = [
    { label: "√", latex: "\\sqrt{}" },
    { label: "x²", latex: "^2" },
    { label: "xⁿ", latex: "^{}" },
    { label: "¹/ₓ", latex: "\\frac{}{}" },
    { label: "∫", latex: "\\int " },
    { label: "∑", latex: "\\sum " },
    { label: "π", latex: "\\pi" },
    { label: "∞", latex: "\\infty" },
    { label: "≤", latex: "\\leq" },
    { label: "≥", latex: "\\geq" },
    { label: "≠", latex: "\\neq" },
    { label: "±", latex: "\\pm" },
    { label: "α", latex: "\\alpha" },
    { label: "β", latex: "\\beta" },
    { label: "θ", latex: "\\theta" },
    { label: "lim", latex: "\\lim_{x \\to }" },
    { label: "log", latex: "\\log " },
    { label: "ln", latex: "\\ln " },
    { label: "sin", latex: "\\sin " },
    { label: "cos", latex: "\\cos " },
    { label: "tan", latex: "\\tan " }
  ];

  const insertSymbol = (latex) => {
    onChange(value + latex);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[120px] text-base font-mono border-2 border-indigo-200 focus:border-indigo-500"
          dir="ltr"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowSymbols(!showSymbols)}
          className="h-8"
        >
          <Type className="w-4 h-4 mr-1" />
          סמלים
        </Button>
        
        {showSymbols && (
          <div className="text-xs text-gray-600">
            לחץ על סמל להוספה
          </div>
        )}
      </div>

      {showSymbols && (
        <div className="grid grid-cols-6 md:grid-cols-8 gap-2 p-3 bg-indigo-50 rounded-xl border-2 border-indigo-200">
          {symbols.map((symbol, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertSymbol(symbol.latex)}
              disabled={disabled}
              className="h-10 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg font-bold text-gray-900 text-sm transition-colors disabled:opacity-50"
            >
              {symbol.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs text-blue-900">
          <strong>💡 טיפים:</strong> השתמש ב-LaTeX או טקסט רגיל. לדוגמה: 
          <code className="bg-white px-1 mx-1 rounded">x^2-5x+6=0</code> או 
          <code className="bg-white px-1 mx-1 rounded">\sqrt{16}</code>
        </div>
      </div>
    </div>
  );
}