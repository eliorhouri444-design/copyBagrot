import { useState } from "react";
import { motion } from "framer-motion";

export default function PieChart({ 
  data = [], 
  title = "",
  interactive = true,
  onSelect
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;
  
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      index
    };
  });

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const createArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const colors = [
    "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", 
    "#ef4444", "#06b6d4", "#ec4899", "#6366f1"
  ];

  const centerX = 180;
  const centerY = 180;
  const radius = 120;

  return (
    <div className="flex flex-col items-center">
      {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}
      
      <svg viewBox="0 0 360 360" className="w-full max-w-sm">
        <g>
          {slices.map((slice, index) => {
            const isSelected = selectedIndex === index;
            const path = createArc(
              centerX, 
              centerY, 
              isSelected ? radius + 10 : radius, 
              slice.startAngle, 
              slice.endAngle
            );
            
            const midAngle = (slice.startAngle + slice.endAngle) / 2;
            const labelRadius = radius * 0.7;
            const labelPos = polarToCartesian(centerX, centerY, labelRadius, midAngle);

            return (
              <g key={index}>
                <motion.path
                  d={path}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                  className={interactive ? "cursor-pointer" : ""}
                  onClick={() => {
                    if (interactive) {
                      setSelectedIndex(index);
                      onSelect && onSelect(slice);
                    }
                  }}
                  whileHover={interactive ? { scale: 1.05 } : {}}
                  animate={{ 
                    d: path,
                    opacity: isSelected ? 1 : selectedIndex === null ? 1 : 0.6
                  }}
                  transition={{ duration: 0.2 }}
                />
                
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {Math.round(slice.percentage)}%
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-sm">
        {data.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              if (interactive) {
                setSelectedIndex(index);
                onSelect && onSelect(slices[index]);
              }
            }}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
              selectedIndex === index ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm font-medium text-slate-900">{item.label}</span>
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 w-full max-w-sm"
        >
          <div className="text-center">
            <div className="text-sm font-semibold text-blue-900">{data[selectedIndex].label}</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {Math.round(slices[selectedIndex].percentage)}%
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {data[selectedIndex].value} מתוך {total}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}