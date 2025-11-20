import { motion } from "framer-motion";

/**
 * 🔬 Free Body Diagram Renderer
 * מציג דיאגרמות גוף חופשי לבעיות פיזיקה
 */

export default function FBDRenderer({ fbd }) {
  if (!fbd || !fbd.forces || fbd.forces.length === 0) {
    return null;
  }

  const width = 500;
  const height = 400;
  const centerX = fbd.body_position?.x || 250;
  const centerY = fbd.body_position?.y || 200;

  const forceColors = {
    'gravity': '#EF4444',
    'normal': '#3B82F6',
    'friction': '#F59E0B',
    'tension': '#10B981',
    'applied': '#8B5CF6',
    'default': '#6B7280'
  };

  const getForceColor = (forceName) => {
    const name = forceName.toLowerCase();
    for (const [key, color] of Object.entries(forceColors)) {
      if (name.includes(key)) return color;
    }
    return forceColors.default;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl p-4 shadow-xl">
      <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
        🔬 דיאגרמת גוף חופשי (FBD)
      </div>

      <div className="bg-white rounded-xl p-3 border-2 border-blue-200">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Coordinate System */}
          {fbd.coordinate_system && (
            <g>
              <line x1="30" y1={height - 30} x2="80" y2={height - 30} stroke="#6b7280" strokeWidth="2" />
              <line x1="30" y1={height - 30} x2="30" y2={height - 80} stroke="#6b7280" strokeWidth="2" />
              <polygon points={`80,${height - 30} 75,${height - 25} 75,${height - 35}`} fill="#6b7280" />
              <polygon points={`30,${height - 80} 25,${height - 85} 35,${height - 85}`} fill="#6b7280" />
              <text x="85" y={height - 25} fontSize="12" fill="#6b7280">x</text>
              <text x="35" y={height - 85} fontSize="12" fill="#6b7280">y</text>
            </g>
          )}

          {/* Body (object) */}
          <circle
            cx={centerX}
            cy={centerY}
            r="30"
            fill="#8b5cf6"
            fillOpacity="0.3"
            stroke="#8b5cf6"
            strokeWidth="3"
          />
          <text
            x={centerX}
            y={centerY + 5}
            fontSize="14"
            fontWeight="bold"
            fill="#1f2937"
            textAnchor="middle"
          >
            m
          </text>

          {/* Forces */}
          {fbd.forces.map((force, idx) => {
            const color = force.color || getForceColor(force.name);
            const dx = force.end_x - force.start_x;
            const dy = force.end_y - force.start_y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const arrowSize = 10;

            return (
              <g key={idx}>
                <motion.line
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  x1={force.start_x}
                  y1={force.start_y}
                  x2={force.end_x}
                  y2={force.end_y}
                  stroke={color}
                  strokeWidth="4"
                  markerEnd="url(#arrowhead)"
                />
                
                {/* Arrow head */}
                <defs>
                  <marker
                    id={`arrowhead-${idx}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill={color} />
                  </marker>
                </defs>
                
                <line
                  x1={force.start_x}
                  y1={force.start_y}
                  x2={force.end_x}
                  y2={force.end_y}
                  stroke={color}
                  strokeWidth="4"
                  markerEnd={`url(#arrowhead-${idx})`}
                />

                {/* Force Label */}
                <text
                  x={force.end_x + (dx > 0 ? 10 : -10)}
                  y={force.end_y + (dy > 0 ? 10 : -10)}
                  fontSize="14"
                  fontWeight="bold"
                  fill={color}
                  textAnchor={dx > 0 ? 'start' : 'end'}
                >
                  {force.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Force Legend */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {fbd.forces.map((force, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-blue-200">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: force.color || getForceColor(force.name) }}
            />
            <div className="text-xs">
              <div className="font-bold text-gray-900">{force.label}</div>
              {force.magnitude && (
                <div className="text-gray-600">{force.magnitude}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-blue-700 mt-3 text-center">
        💡 דיאגרמה אינטראקטיבית - כל הכוחות הפועלים על הגוף
      </div>
    </div>
  );
}