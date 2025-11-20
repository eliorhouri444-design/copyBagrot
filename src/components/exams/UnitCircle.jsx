import { useState } from "react";
import { motion } from "framer-motion";

export default function UnitCircle({ 
  initialAngle = 45,
  onAngleChange,
  showValues = true,
  interactive = true
}) {
  const [angle, setAngle] = useState(initialAngle);
  const [isDragging, setIsDragging] = useState(false);

  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  const angleRad = (angle * Math.PI) / 180;
  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY - radius * Math.sin(angleRad);

  const sinValue = Math.sin(angleRad);
  const cosValue = Math.cos(angleRad);

  const handleMouseMove = (e) => {
    if (!isDragging || !interactive) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - centerX;
    const dy = centerY - mouseY;
    let newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    if (newAngle < 0) newAngle += 360;

    setAngle(Math.round(newAngle));
    onAngleChange && onAngleChange(Math.round(newAngle));
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 400 400"
        className="w-full max-w-md"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* Background */}
        <rect width="400" height="400" fill="#f8fafc" />

        {/* Grid */}
        <g stroke="#e2e8f0" strokeWidth="0.5">
          {[-150, -100, -50, 0, 50, 100, 150].map((val) => (
            <g key={val}>
              <line x1={centerX + val} y1="50" x2={centerX + val} y2="350" />
              <line x1="50" y1={centerY - val} x2="350" y2={centerY - val} />
            </g>
          ))}
        </g>

        {/* Axes */}
        <g stroke="#1e293b" strokeWidth="2">
          <line x1="50" y1={centerY} x2="350" y2={centerY} />
          <line x1={centerX} y1="50" x2={centerX} y2="350" />
          
          {/* Arrows */}
          <polygon points="350,200 345,197 345,203" fill="#1e293b" />
          <polygon points="200,50 197,55 203,55" fill="#1e293b" />
        </g>

        {/* Axis labels */}
        <text x="360" y="205" fill="#64748b" fontSize="14" fontWeight="bold">x</text>
        <text x="205" y="45" fill="#64748b" fontSize="14" fontWeight="bold">y</text>

        {/* Unit markers */}
        <g fill="#64748b" fontSize="12" textAnchor="middle">
          <text x={centerX + 50} y={centerY + 20}>0.5</text>
          <text x={centerX + 100} y={centerY + 20}>1</text>
          <text x={centerX - 50} y={centerY + 20}>-0.5</text>
          <text x={centerX - 100} y={centerY + 20}>-1</text>
          
          <text x={centerX + 20} y={centerY - 50}>0.5</text>
          <text x={centerX + 20} y={centerY - 100}>1</text>
          <text x={centerX + 20} y={centerY + 50}>-0.5</text>
          <text x={centerX + 20} y={centerY + 100}>-1</text>
        </g>

        {/* Unit circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
        />

        {/* Angle arc */}
        <path
          d={`M ${centerX + 30} ${centerY} 
              A 30 30 0 ${angle > 180 ? 1 : 0} 0 
              ${centerX + 30 * Math.cos(angleRad)} ${centerY - 30 * Math.sin(angleRad)}`}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
        />

        {/* Radius line */}
        <line
          x1={centerX}
          y1={centerY}
          x2={x}
          y2={y}
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* Projection lines (sin and cos) */}
        <line
          x1={x}
          y1={y}
          x2={x}
          y2={centerY}
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <line
          x1={centerX}
          y1={centerY}
          x2={x}
          y2={centerY}
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Point on circle */}
        <motion.circle
          cx={x}
          cy={y}
          r={interactive ? 12 : 8}
          fill="#6366f1"
          stroke="white"
          strokeWidth="3"
          className={interactive ? "cursor-grab active:cursor-grabbing" : ""}
          onMouseDown={() => interactive && setIsDragging(true)}
          whileHover={interactive ? { scale: 1.2 } : {}}
          whileTap={interactive ? { scale: 0.9 } : {}}
        />

        {/* Angle label */}
        <text
          x={centerX + 45}
          y={centerY - 10}
          fill="#8b5cf6"
          fontSize="16"
          fontWeight="bold"
        >
          θ = {Math.round(angle)}°
        </text>
      </svg>

      {showValues && (
        <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-md">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-red-900 mb-1">cos(θ)</div>
            <div className="text-2xl font-bold text-red-600">
              {cosValue.toFixed(3)}
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-green-900 mb-1">sin(θ)</div>
            <div className="text-2xl font-bold text-green-600">
              {sinValue.toFixed(3)}
            </div>
          </div>

          <div className="col-span-2 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-purple-900 mb-1">tan(θ)</div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.abs(cosValue) < 0.01 ? '∞' : (sinValue / cosValue).toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {interactive && (
        <p className="text-xs text-slate-600 mt-4 text-center">
          גרור את הנקודה הכחולה למעגל כדי לשנות את הזווית
        </p>
      )}
    </div>
  );
}