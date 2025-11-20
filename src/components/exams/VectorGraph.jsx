import { useState } from "react";
import { motion } from "framer-motion";

export default function VectorGraph({ 
  vectors = [],
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  interactive = true,
  showSum = true,
  onVectorsChange
}) {
  const [draggedVector, setDraggedVector] = useState(null);
  const [localVectors, setLocalVectors] = useState(vectors);

  const width = 600;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;

  const graphToCanvas = (x, y) => {
    const scale = Math.min(width / (xMax - xMin), height / (yMax - yMin)) * 0.8;
    return {
      x: centerX + x * scale,
      y: centerY - y * scale
    };
  };

  const canvasToGraph = (canvasX, canvasY) => {
    const scale = Math.min(width / (xMax - xMin), height / (yMax - yMin)) * 0.8;
    return {
      x: (canvasX - centerX) / scale,
      y: (centerY - canvasY) / scale
    };
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Calculate vector sum
  const vectorSum = localVectors.reduce(
    (sum, v) => ({ x: sum.x + v.x, y: sum.y + v.y }),
    { x: 0, y: 0 }
  );

  const handleMouseMove = (e) => {
    if (draggedVector === null || !interactive) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const graphPos = canvasToGraph(mouseX, mouseY);
    
    const newVectors = [...localVectors];
    newVectors[draggedVector] = {
      ...newVectors[draggedVector],
      x: Math.round(graphPos.x * 2) / 2,
      y: Math.round(graphPos.y * 2) / 2
    };

    setLocalVectors(newVectors);
    onVectorsChange && onVectorsChange(newVectors);
  };

  const createArrow = (x, y, color, label) => {
    const endPos = graphToCanvas(x, y);
    const length = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);

    // Arrow head
    const arrowSize = 12;
    const arrowAngle = Math.PI / 6;
    
    const arrowPoint1 = {
      x: endPos.x - arrowSize * Math.cos(angle - arrowAngle),
      y: endPos.y - arrowSize * Math.sin(angle - arrowAngle)
    };
    
    const arrowPoint2 = {
      x: endPos.x - arrowSize * Math.cos(angle + arrowAngle),
      y: endPos.y - arrowSize * Math.sin(angle + arrowAngle)
    };

    return (
      <g key={label}>
        {/* Vector line */}
        <line
          x1={centerX}
          y1={centerY}
          x2={endPos.x}
          y2={endPos.y}
          stroke={color}
          strokeWidth="3"
        />

        {/* Arrow head */}
        <polygon
          points={`${endPos.x},${endPos.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
          fill={color}
        />

        {/* Label */}
        <text
          x={endPos.x + 15}
          y={endPos.y - 10}
          fill={color}
          fontSize="16"
          fontWeight="bold"
        >
          {label}
        </text>

        {/* Interactive handle */}
        {interactive && (
          <circle
            cx={endPos.x}
            cy={endPos.y}
            r="10"
            fill={color}
            stroke="white"
            strokeWidth="2"
            className="cursor-grab active:cursor-grabbing"
            opacity="0.8"
          />
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-2xl border-2 border-slate-300 rounded-2xl bg-white"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDraggedVector(null)}
        onMouseLeave={() => setDraggedVector(null)}
      >
        {/* Grid */}
        <g stroke="#e5e7eb" strokeWidth="0.5">
          {Array.from({ length: 21 }, (_, i) => {
            const x = xMin + i * (xMax - xMin) / 20;
            const pos = graphToCanvas(x, 0);
            return <line key={`v${i}`} x1={pos.x} y1="0" x2={pos.x} y2={height} />;
          })}
          {Array.from({ length: 21 }, (_, i) => {
            const y = yMin + i * (yMax - yMin) / 20;
            const pos = graphToCanvas(0, y);
            return <line key={`h${i}`} x1="0" y1={pos.y} x2={width} y2={pos.y} />;
          })}
        </g>

        {/* Axes */}
        <g stroke="#1f2937" strokeWidth="2">
          <line x1="0" y1={centerY} x2={width} y2={centerY} />
          <line x1={centerX} y1="0" x2={centerX} y2={height} />
          
          {/* Arrows */}
          <polygon points={`${width},${centerY} ${width-10},${centerY-5} ${width-10},${centerY+5}`} fill="#1f2937" />
          <polygon points={`${centerX},0 ${centerX-5},10 ${centerX+5},10`} fill="#1f2937" />
        </g>

        {/* Axis labels */}
        <text x={width - 20} y={centerY - 10} fill="#64748b" fontSize="14" fontWeight="bold">x</text>
        <text x={centerX + 10} y="15" fill="#64748b" fontSize="14" fontWeight="bold">y</text>

        {/* Draw vectors */}
        {localVectors.map((vector, index) => (
          <g
            key={index}
            onMouseDown={() => interactive && setDraggedVector(index)}
          >
            {createArrow(vector.x, vector.y, colors[index % colors.length], vector.label || `v${index + 1}`)}
          </g>
        ))}

        {/* Draw sum vector */}
        {showSum && localVectors.length > 1 && (
          <g>
            <motion.line
              x1={centerX}
              y1={centerY}
              x2={graphToCanvas(vectorSum.x, vectorSum.y).x}
              y2={graphToCanvas(vectorSum.x, vectorSum.y).y}
              stroke="#ec4899"
              strokeWidth="3"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
            
            <circle
              cx={graphToCanvas(vectorSum.x, vectorSum.y).x}
              cy={graphToCanvas(vectorSum.x, vectorSum.y).y}
              r="8"
              fill="#ec4899"
              stroke="white"
              strokeWidth="2"
            />
            
            <text
              x={graphToCanvas(vectorSum.x, vectorSum.y).x + 15}
              y={graphToCanvas(vectorSum.x, vectorSum.y).y - 10}
              fill="#ec4899"
              fontSize="16"
              fontWeight="bold"
            >
              סכום
            </text>
          </g>
        )}
      </svg>

      {/* Vector values */}
      <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-md">
        {localVectors.map((vector, index) => (
          <div
            key={index}
            className="border-2 rounded-xl p-3"
            style={{ 
              borderColor: colors[index % colors.length],
              backgroundColor: colors[index % colors.length] + '10'
            }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: colors[index % colors.length] }}>
              {vector.label || `וקטור ${index + 1}`}
            </div>
            <div className="text-sm font-bold text-slate-900">
              ({vector.x.toFixed(1)}, {vector.y.toFixed(1)})
            </div>
          </div>
        ))}

        {showSum && localVectors.length > 1 && (
          <div className="col-span-2 bg-pink-50 border-2 border-pink-200 rounded-xl p-3">
            <div className="text-xs font-semibold text-pink-900 mb-1">סכום הוקטורים</div>
            <div className="text-lg font-bold text-pink-600">
              ({vectorSum.x.toFixed(1)}, {vectorSum.y.toFixed(1)})
            </div>
          </div>
        )}
      </div>

      {interactive && (
        <p className="text-xs text-slate-600 mt-3 text-center">
          גרור את קצה כל וקטור כדי לשנות את הערכים
        </p>
      )}
    </div>
  );
}