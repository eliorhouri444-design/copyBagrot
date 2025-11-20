import { useRef, useState, useEffect } from "react";
import { X, Trash2, Eraser, Pencil, Minimize2, ChevronDown, Calculator as CalculatorIcon, Delete, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DrawingCanvas({ onClose, questionText, questionImageUrl }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState("pen");
  const [isMinimized, setIsMinimized] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(400);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  // Calculator state
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [newInput, setNewInput] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = canvasHeight * window.devicePixelRatio;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasHeight]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCoordinates(e);

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCoordinates(e);

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = "source-over";
    } else if (tool === "eraser") {
      ctx.strokeStyle = "white";
      ctx.lineWidth = lineWidth * 3;
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const expandCanvas = () => {
    setCanvasHeight(prev => prev + 300);
  };

  // Calculator functions
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

  const colors = [
    { name: "שחור", value: "#000000" },
    { name: "כחול", value: "#3B82F6" },
    { name: "אדום", value: "#EF4444" },
    { name: "ירוק", value: "#10B981" },
    { name: "סגול", value: "#8B5CF6" },
    { name: "כתום", value: "#F97316" }
  ];

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl hover:shadow-2xl"
        >
          ✏️
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-0 bg-white z-50 overflow-y-auto"
      >
        {questionText && (
          <div className="sticky top-0 z-10 bg-gradient-to-br from-blue-50 to-purple-50 border-b-2 border-blue-200 shadow-md">
            <div className="p-4 max-w-4xl mx-auto">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">?</span>
                </div>
                <p className="text-base text-gray-900 leading-relaxed flex-1">{questionText}</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(true)}
                    className="text-gray-600 hover:bg-white/50"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-gray-600 hover:bg-white/50"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {questionImageUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border-2 border-blue-200">
                  <img
                    src={questionImageUrl}
                    alt="איור השאלה"
                    className="w-full max-h-64 object-contain bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTool("pen")}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    tool === "pen" 
                      ? "bg-blue-100 border-blue-500" 
                      : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <Pencil className={`w-5 h-5 ${tool === "pen" ? "text-blue-600" : "text-gray-600"}`} />
                </button>
                <button
                  onClick={() => setTool("eraser")}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    tool === "eraser" 
                      ? "bg-blue-100 border-blue-500" 
                      : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <Eraser className={`w-5 h-5 ${tool === "eraser" ? "text-blue-600" : "text-gray-600"}`} />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-2 rounded-lg border-2 bg-white border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-5 h-5 text-gray-600 hover:text-red-600" />
                </button>
                <button
                  onClick={() => setShowCalculator(true)}
                  className="p-2 rounded-lg border-2 bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <CalculatorIcon className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setShowFormulas(true)}
                  className="p-2 rounded-lg border-2 bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
                >
                  <BookOpen className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setColor(c.value);
                      setTool("pen");
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c.value && tool === "pen"
                        ? "ring-3 ring-blue-300 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value, borderColor: '#E5E7EB' }}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-700">עובי:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm font-bold text-gray-900 w-6">{lineWidth}</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full border-2 border-gray-300 rounded-xl bg-white cursor-crosshair touch-none"
              style={{ height: `${canvasHeight}px`, touchAction: 'none' }}
            />

            <div className="mt-4 text-center">
              <Button
                onClick={expandCanvas}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2"
              >
                <ChevronDown className="w-5 h-5 ml-2" />
                הרחב לוח למטה
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחשבון</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-gray-900 rounded-xl p-3">
              <div className="text-right text-2xl font-bold text-white min-h-[40px] flex items-center justify-end break-all">
                {display}
              </div>
              {operation && (
                <div className="text-right text-xs text-gray-400 mt-1">
                  {previousValue} {operation}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
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

            <div className="grid grid-cols-4 gap-1.5">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulas Dialog */}
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