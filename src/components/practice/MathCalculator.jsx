import { useState } from "react";
import { X, Delete, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MathCalculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [newInput, setNewInput] = useState(true);
  const [showFormulas, setShowFormulas] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleNumber = (num) => {
    if (newInput) {
      setDisplay(num);
      setNewInput(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperation = (op) => {
    const current = parseFloat(display);
    
    if (previousValue !== null && operation && !newInput) {
      const result = calculate(previousValue, current, operation);
      setDisplay(result.toString());
      setPreviousValue(result);
    } else {
      setPreviousValue(current);
    }
    
    setOperation(op);
    setNewInput(true);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      case "^": return Math.pow(a, b);
      default: return b;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const current = parseFloat(display);
      const result = calculate(previousValue, current, operation);
      setDisplay(result.toString());
      setPreviousValue(null);
      setOperation(null);
      setNewInput(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewInput(true);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
      setNewInput(true);
    }
  };

  const handleFunction = (func) => {
    const current = parseFloat(display);
    let result;
    
    switch (func) {
      case "√": result = Math.sqrt(current); break;
      case "x²": result = current * current; break;
      case "sin": result = Math.sin(current * Math.PI / 180); break;
      case "cos": result = Math.cos(current * Math.PI / 180); break;
      case "tan": result = Math.tan(current * Math.PI / 180); break;
      case "ln": result = Math.log(current); break;
      case "log": result = Math.log10(current); break;
      case "π": result = Math.PI; break;
      case "e": result = Math.E; break;
      default: return;
    }
    
    setDisplay(result.toString());
    setNewInput(true);
  };

  const formulas = [
    { name: "משפט פיתגורס", formula: "a² + b² = c²" },
    { name: "שטח משולש", formula: "S = (b × h) / 2" },
    { name: "שטח עיגול", formula: "S = π × r²" },
    { name: "נוסחת ריבוע", formula: "(a±b)² = a² ± 2ab + b²" },
    { name: "חוק קוסינוסים", formula: "c² = a² + b² - 2ab×cos(C)" },
    { name: "משוואה ריבועית", formula: "x = (-b ± √(b²-4ac)) / 2a" },
    { name: "נפח כדור", formula: "V = (4/3) × π × r³" },
    { name: "שטח טרפז", formula: "S = ((a+b) × h) / 2" }
  ];

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 left-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl hover:shadow-2xl"
        >
          🔢
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-blue-200">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">מחשבון</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-3">
            <div className="bg-gray-900 rounded-xl p-3 mb-3">
              <div className="text-right text-2xl font-bold text-white min-h-[40px] flex items-center justify-end break-all">
                {display}
              </div>
              {operation && (
                <div className="text-right text-xs text-gray-400 mt-1">
                  {previousValue} {operation}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <button
                onClick={handleClear}
                className="col-span-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-sm transition-all active:scale-95"
              >
                C
              </button>
              <button
                onClick={handleBackspace}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                <Delete className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => handleOperation("÷")}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                ÷
              </button>

              {[7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumber(num.toString())}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 rounded-lg transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleOperation("×")}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                ×
              </button>

              {[4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumber(num.toString())}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 rounded-lg transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleOperation("-")}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                -
              </button>

              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumber(num.toString())}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 rounded-lg transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleOperation("+")}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                +
              </button>

              <button
                onClick={() => handleNumber("0")}
                className="col-span-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => handleNumber(".")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                .
              </button>
              <button
                onClick={handleEquals}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                =
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <button
                onClick={() => handleFunction("√")}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg text-xs transition-all active:scale-95"
              >
                √
              </button>
              <button
                onClick={() => handleFunction("x²")}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg text-xs transition-all active:scale-95"
              >
                x²
              </button>
              <button
                onClick={() => handleOperation("^")}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg text-xs transition-all active:scale-95"
              >
                x^y
              </button>
              <button
                onClick={() => handleFunction("π")}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg text-xs transition-all active:scale-95"
              >
                π
              </button>
            </div>

            <button
              onClick={() => setShowFormulas(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95 text-sm"
            >
              📐 נוסחאות
            </button>
          </div>
        </div>
      </motion.div>

      <Dialog open={showFormulas} onOpenChange={setShowFormulas}>
        <DialogContent dir="rtl" className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">נוסחאות מתמטיות</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {formulas.map((item, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200"
              >
                <div className="font-bold text-gray-900 mb-2">{item.name}</div>
                <div className="bg-white rounded-lg p-3 font-mono text-lg text-center text-gray-800">
                  {item.formula}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}