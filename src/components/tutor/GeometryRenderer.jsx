import React from "react";
import { motion } from "framer-motion";

/**
 * 📐 Geometry Renderer - מציג איורים גיאומטריים
 * ✅ תיקון מלא: טיפול בכל מבני נתונים אפשריים
 */

export default function GeometryRenderer({ diagram }) {
  if (!diagram || !diagram.points || Object.keys(diagram.points).length === 0) {
    return null;
  }

  // ✅ טיפול בטוח בנקודות
  const points = diagram.points || {};
  const lines = Array.isArray(diagram.lines) ? diagram.lines : [];
  const shapes = Array.isArray(diagram.shapes) ? diagram.shapes : [];
  const angles = Array.isArray(diagram.angles) ? diagram.angles : [];
  
  // ✅ תיקון: המרת labels לפורמט בטוח
  const safeLabels = React.useMemo(() => {
    const rawLabels = diagram.labels;
    
    if (!rawLabels) return [];
    
    // אם זה מערך - נקי ממנו אובייקטים
    if (Array.isArray(rawLabels)) {
      return rawLabels
        .filter(label => label !== null && label !== undefined)
        .map(label => {
          if (typeof label === 'string') return label;
          if (typeof label === 'number') return String(label);
          if (typeof label === 'object') {
            // המר אובייקט למחרוזת
            return JSON.stringify(label);
          }
          return String(label);
        });
    }
    
    // אם זה אובייקט - המר לרשימת מחרוזות
    if (typeof rawLabels === 'object') {
      return Object.entries(rawLabels).map(([key, value]) => {
        if (value === null || value === undefined) return `${key}`;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return `${key}=${value}`;
        if (typeof value === 'object') return `${key}=${JSON.stringify(value)}`;
        return `${key}=${value}`;
      });
    }
    
    // אם זה מחרוזת - החזר כמערך
    if (typeof rawLabels === 'string') {
      return [rawLabels];
    }
    
    return [];
  }, [diagram.labels]);

  // Calculate bounds
  const allX = Object.values(points).map(p => p.x || 0);
  const allY = Object.values(points).map(p => p.y || 0);
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 10);
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 10);

  const padding = 60;
  const rangeX = maxX - minX || 10;
  const rangeY = maxY - minY || 10;
  
  const width = 600;
  const scale = Math.min((width - 2 * padding) / rangeX, (width - 2 * padding) / rangeY);
  const height = (rangeY * scale) + (2 * padding);

  const toSVG = (x, y) => ({
    x: (x - minX) * scale + padding,
    y: height - ((y - minY) * scale + padding)
  });

  // Line styles
  const lineStyles = {
    'solid': { dash: 'none', width: 3 },
    'dashed': { dash: '8,4', width: 3 },
    'dotted': { dash: '2,4', width: 3 },
    'thick': { dash: 'none', width: 5 },
    'default': { dash: 'none', width: 3 }
  };

  const getLineStyle = (line) => {
    if (!line || !line.style) return lineStyles.default;
    return lineStyles[line.style] || lineStyles.default;
  };

  const shapeColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-2xl p-4 shadow-xl my-3">
      <div className="text-sm font-bold text-blue-900 mb-3">
        📐 איור גיאומטרי
      </div>

      <div className="bg-white rounded-xl p-4 border-2 border-blue-200 overflow-hidden">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${width} ${height}`}
          className="max-w-full h-auto"
          style={{ display: 'block' }}
        >
          <defs>
            <pattern id="grid-geom" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid-geom)" />

          {/* Shapes */}
          {shapes.map((shape, shapeIdx) => {
            if (!shape || !shape.type) return null;
            
            const color = shapeColors[shapeIdx % shapeColors.length];
            
            if (shape.type === 'circle') {
              const centerPoint = shape.center && points[shape.center] ? points[shape.center] : null;
              if (!centerPoint) return null;
              
              const center = toSVG(centerPoint.x, centerPoint.y);
              const radius = (shape.radius || 50) * scale;
              
              return (
                <g key={shapeIdx}>
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={radius}
                    fill={color}
                    fillOpacity="0.1"
                    stroke={color}
                    strokeWidth="3"
                  />
                </g>
              );
            }

            if (shape.type === 'triangle' || shape.type === 'polygon') {
              const verticesList = shape.vertices || shape.points || [];
              const shapePoints = verticesList
                .map(pointName => {
                  const p = points[pointName];
                  if (!p) return null;
                  const svg = toSVG(p.x || 0, p.y || 0);
                  return `${svg.x},${svg.y}`;
                })
                .filter(Boolean)
                .join(' ');

              if (!shapePoints) return null;

              return (
                <g key={shapeIdx}>
                  <polygon
                    points={shapePoints}
                    fill={color}
                    fillOpacity="0.15"
                    stroke={color}
                    strokeWidth="3"
                  />
                </g>
              );
            }

            return null;
          })}

          {/* Lines */}
          {lines.map((line, lineIdx) => {
            if (!line || !line.from || !line.to) return null;
            
            const from = points[line.from];
            const to = points[line.to];
            if (!from || !to) return null;

            const svgFrom = toSVG(from.x || 0, from.y || 0);
            const svgTo = toSVG(to.x || 0, to.y || 0);
            const style = getLineStyle(line);

            const midX = (svgFrom.x + svgTo.x) / 2;
            const midY = (svgFrom.y + svgTo.y) / 2;

            return (
              <g key={lineIdx}>
                <motion.line
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: lineIdx * 0.1 }}
                  x1={svgFrom.x}
                  y1={svgFrom.y}
                  x2={svgTo.x}
                  y2={svgTo.y}
                  stroke="#1f2937"
                  strokeWidth={style.width}
                  strokeDasharray={style.dash}
                  strokeLinecap="round"
                />
                
                {line.label && typeof line.label === 'string' && (
                  <text
                    x={midX}
                    y={midY - 10}
                    fontSize="14"
                    fontWeight="bold"
                    fill="#1f2937"
                    textAnchor="middle"
                  >
                    {line.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Points */}
          {Object.entries(points).map(([name, point], pointIdx) => {
            if (!point) return null;
            
            const svg = toSVG(point.x || 0, point.y || 0);
            const pointColor = point.color || '#8b5cf6';

            return (
              <g key={name}>
                <motion.circle
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 + pointIdx * 0.05 }}
                  cx={svg.x}
                  cy={svg.y}
                  r="8"
                  fill={pointColor}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text
                  x={svg.x}
                  y={svg.y - 15}
                  fontSize="16"
                  fontWeight="bold"
                  fill="#1f2937"
                  textAnchor="middle"
                >
                  {String(point.label || name)}
                </text>
              </g>
            );
          })}

          {/* Angles */}
          {angles.map((angle, angleIdx) => {
            if (!angle || !angle.vertex || !points[angle.vertex]) return null;
            
            const vertexPoint = points[angle.vertex];
            const svg = toSVG(vertexPoint.x || 0, vertexPoint.y || 0);
            
            return (
              <g key={angleIdx}>
                <text
                  x={svg.x + 20}
                  y={svg.y - 20}
                  fontSize="12"
                  fill="#ef4444"
                  fontWeight="bold"
                >
                  {typeof angle.value === 'string' || typeof angle.value === 'number' 
                    ? String(angle.value) + '°' 
                    : '∠'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ✅ תיקון מלא: רינדור בטוח של labels */}
      {safeLabels.length > 0 && (
        <div className="mt-3 bg-purple-50 rounded-xl p-3 border-2 border-purple-200">
          <div className="text-xs font-bold text-purple-900 mb-2">🏷️ תוויות:</div>
          <div className="flex flex-wrap gap-2">
            {safeLabels.map((label, idx) => (
              <div 
                key={idx} 
                className="bg-white px-2 py-1 rounded-lg text-xs font-semibold text-gray-800 border border-purple-300"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {diagram.description && typeof diagram.description === 'string' && (
        <div className="text-xs text-blue-700 mt-3 text-center">
          💡 {diagram.description}
        </div>
      )}
    </div>
  );
}