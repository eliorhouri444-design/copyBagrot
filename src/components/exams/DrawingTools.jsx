import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Trash2, Download, Square, Circle, Triangle, Edit3, Maximize2, Minimize2 } from "lucide-react";

export default function DrawingTools({ onSave, initialDrawing, questionNumber, questionText, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [ctx, setCtx] = useState(null);
  const [isFullWidth, setIsFullWidth] = useState(false);

  const colors = [
    "#FF1493", "#9333EA", "#F97316", "#10B981", "#3B82F6", "#EF4444", "#000000"
  ];

  const shapes = [
    { id: "pen", icon: Edit3, label: "עט" },
    { id: "triangle", icon: Triangle, label: "משולש" },
    { id: "rectangle", icon: Square, label: "מרובע" },
    { id: "circle", icon: Circle, label: "עיגול" },
    { id: "eraser", icon: Eraser, label: "מחק" }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const oldData = canvas.toDataURL();
      
      canvas.width = container.offsetWidth;
      canvas.height = 600; // Fixed height

      const context = canvas.getContext("2d");
      context.lineCap = "round";
      context.lineJoin = "round";
      setCtx(context);

      // Restore previous drawing
      if (oldData && oldData !== canvas.toDataURL()) {
        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0);
        };
        img.src = oldData;
      }

      if (initialDrawing) {
        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0);
        };
        img.src = initialDrawing;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [initialDrawing, isFullWidth]);

  useEffect(() => {
    if (onSave && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      onSave(dataUrl);
    }
  }, [ctx]);

  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    e.preventDefault();
    setIsDrawing(true);
    
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 3 : lineWidth;
    ctx.currentX = x;
    ctx.currentY = y;
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    
    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing || !ctx) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    
    if (tool !== "pen" && tool !== "eraser") {
      const startX = ctx.currentX;
      const startY = ctx.currentY;
      const width = x - startX;
      const height = y - startY;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      if (tool === "rectangle") {
        ctx.strokeRect(startX, startY, width, height);
      } else if (tool === "circle") {
        const radius = Math.sqrt(width * width + height * height);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === "triangle") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.lineTo(startX - width, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
    
    setIsDrawing(false);

    // Auto-save
    if (onSave && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      onSave(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (onSave) {
      const dataUrl = canvasRef.current.toDataURL();
      onSave(dataUrl);
    }
  };

  const downloadDrawing = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = `draft_q${questionNumber}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-2xl overflow-hidden border-2 border-blue-300 transition-all ${
      isFullWidth ? 'fixed inset-4 z-50' : 'w-full'
    }`}>
      {/* Header - Question Info */}
      {questionText && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs opacity-90 mb-1">לוח טיוטה - שאלה {questionNumber}</div>
              <div className="text-sm font-medium line-clamp-1">{questionText.substring(0, 80)}...</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsFullWidth(!isFullWidth)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8"
                >
                  סגור
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tools Bar */}
      <div className="bg-white border-b-2 border-gray-200 p-3">
        {/* Shape Tools */}
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            const isActive = tool === shape.id;
            return (
              <button
                key={shape.id}
                onClick={() => setTool(shape.id)}
                className={`p-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-lg scale-110'
                    : 'bg-gray-100 text-gray-600 hover:bg-blue-100 border border-gray-300'
                }`}
                title={shape.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        {/* Color Palette */}
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full transition-all ${
                color === c ? 'ring-4 ring-blue-400 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Line Width Slider */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-700">עובי:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-40 h-2 bg-blue-200 rounded-full appearance-none cursor-pointer"
          />
          <span className="text-sm font-bold text-blue-600 w-8 text-center">{lineWidth}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={clearCanvas}
            size="sm"
            variant="outline"
            className="h-9 text-sm border-2 border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            נקה הכל
          </Button>
          <Button
            onClick={downloadDrawing}
            size="sm"
            variant="outline"
            className="h-9 text-sm border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-1" />
            הורד
          </Button>
        </div>
      </div>

      {/* Canvas - Full Width with Grid Background */}
      <div className="relative bg-white overflow-auto" style={{ maxHeight: isFullWidth ? 'calc(100vh - 250px)' : '600px' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair touch-none"
          style={{ 
            height: '600px',
            backgroundImage: 'radial-gradient(circle, #dbeafe 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>
    </div>
  );
}