import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function InteractiveGraph({ 
  type = 'function',
  gridSize = 20,
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  onPointsChange,
  initialPoints = [],
  showGrid = true,
  className = ""
}) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState(initialPoints);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [zoom, setZoom] = useState(1);

  const width = 600;
  const height = 500;

  const graphToCanvas = (x, y) => {
    const xRange = (xMax - xMin) * zoom;
    const yRange = (yMax - yMin) * zoom;
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;

    return {
      x: ((x - xCenter) / xRange * 2 + 0.5) * width,
      y: (1 - ((y - yCenter) / yRange * 2 + 0.5)) * height
    };
  };

  const canvasToGraph = (canvasX, canvasY) => {
    const xRange = (xMax - xMin) * zoom;
    const yRange = (yMax - yMin) * zoom;
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;

    return {
      x: ((canvasX / width) * 2 - 1) * xRange / 2 + xCenter,
      y: ((1 - canvasY / height) * 2 - 1) * yRange / 2 + yCenter
    };
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;

      for (let x = xMin; x <= xMax; x++) {
        const pos = graphToCanvas(x, 0);
        ctx.beginPath();
        ctx.moveTo(pos.x, 0);
        ctx.lineTo(pos.x, height);
        ctx.stroke();
      }

      for (let y = yMin; y <= yMax; y++) {
        const pos = graphToCanvas(0, y);
        ctx.beginPath();
        ctx.moveTo(0, pos.y);
        ctx.lineTo(width, pos.y);
        ctx.stroke();
      }
    }

    // Axes
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;

    const origin = graphToCanvas(0, 0);
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      if (x !== 0) {
        const pos = graphToCanvas(x, 0);
        ctx.fillText(x.toString(), pos.x, origin.y + 15);
      }
    }

    ctx.textAlign = 'right';
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      if (y !== 0) {
        const pos = graphToCanvas(0, y);
        ctx.fillText(y.toString(), origin.x - 10, pos.y + 4);
      }
    }

    // Draw points
    points.forEach((point, index) => {
      const pos = graphToCanvas(point.x, point.y);
      
      ctx.fillStyle = index === draggingIndex ? '#3b82f6' : '#6366f1';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`, pos.x, pos.y - 15);
    });

    // Draw line through points
    if (points.length >= 2) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const firstPos = graphToCanvas(points[0].x, points[0].y);
      ctx.moveTo(firstPos.x, firstPos.y);
      
      for (let i = 1; i < points.length; i++) {
        const pos = graphToCanvas(points[i].x, points[i].y);
        ctx.lineTo(pos.x, pos.y);
      }
      
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      draw();
    }
  }, [points, zoom, draggingIndex]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const graphPos = canvasToGraph(x, y);

    // Check if clicking near existing point
    const clickedIndex = points.findIndex((point) => {
      const pos = graphToCanvas(point.x, point.y);
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      return dist < 15;
    });

    if (clickedIndex !== -1) {
      setDraggingIndex(clickedIndex);
    } else {
      // Add new point
      const newPoints = [...points, { x: Math.round(graphPos.x * 2) / 2, y: Math.round(graphPos.y * 2) / 2 }];
      setPoints(newPoints);
      onPointsChange && onPointsChange(newPoints);
    }
  };

  const handleMouseMove = (e) => {
    if (draggingIndex === null) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const graphPos = canvasToGraph(x, y);
    const newPoints = [...points];
    newPoints[draggingIndex] = {
      x: Math.round(graphPos.x * 2) / 2,
      y: Math.round(graphPos.y * 2) / 2
    };
    setPoints(newPoints);
    onPointsChange && onPointsChange(newPoints);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const reset = () => {
    setPoints([]);
    setZoom(1);
    onPointsChange && onPointsChange([]);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="border-2 border-slate-300 rounded-2xl cursor-crosshair bg-white shadow-lg"
      />

      <p className="text-xs text-slate-600 mt-3 text-center">
        לחץ כדי להוסיף נקודות • גרור להזזה
      </p>
    </div>
  );
}