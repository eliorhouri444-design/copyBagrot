import { motion } from "framer-motion";

export default function GeometryVisualizer({ data }) {
  if (!data || !data.points || data.points.length === 0) {
    return null;
  }

  const width = 500;
  const height = 400;
  const padding = 40;

  // יצירת מיפוי נקודות
  const pointsMap = {};
  data.points.forEach(p => {
    pointsMap[p.name] = { x: p.x, y: p.y, label: p.label || p.name };
  });

  return (
    <div className="bg-white rounded-xl border-2 border-purple-300 p-4 shadow-lg">
      <div className="text-center font-bold text-purple-900 mb-3">
        🎨 איור גיאומטרי
      </div>
      
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50"
        style={{ direction: 'ltr' }}
      >
        {/* רקע */}
        <rect width={width} height={height} fill="url(#grid)" />
        
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* קווים */}
        {data.lines?.map((line, idx) => {
          const from = pointsMap[line.from];
          const to = pointsMap[line.to];
          
          if (!from || !to) return null;

          const strokeWidth = line.style === 'thick' ? 3 : line.style === 'dashed' ? 2 : 2;
          const strokeDasharray = line.style === 'dashed' ? '5,5' : line.style === 'dotted' ? '2,2' : '0';
          
          return (
            <g key={idx}>
              <motion.line
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#3b82f6"
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
              />
              
              {line.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 10}
                  fill="#1f2937"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {line.label}
                </text>
              )}
            </g>
          );
        })}

        {/* נקודות */}
        {data.points?.map((point, idx) => (
          <g key={idx}>
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#8b5cf6"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={point.x}
              y={point.y - 12}
              fill="#1f2937"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              {point.label || point.name}
            </text>
          </g>
        ))}

        {/* זוויות */}
        {data.angles?.map((angle, idx) => {
          const vertex = pointsMap[angle.vertex];
          const p1 = pointsMap[angle.point1];
          const p2 = pointsMap[angle.point2];
          
          if (!vertex || !p1 || !p2) return null;

          // חישוב זווית לציור קשת
          const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
          const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
          
          const startAngle = Math.min(angle1, angle2);
          const endAngle = Math.max(angle1, angle2);
          const radius = 25;

          const x1 = vertex.x + radius * Math.cos(startAngle);
          const y1 = vertex.y + radius * Math.sin(startAngle);
          const x2 = vertex.x + radius * Math.cos(endAngle);
          const y2 = vertex.y + radius * Math.sin(endAngle);

          const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

          return (
            <g key={idx}>
              <path
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text
                x={vertex.x + 35 * Math.cos((startAngle + endAngle) / 2)}
                y={vertex.y + 35 * Math.sin((startAngle + endAngle) / 2)}
                fill="#f59e0b"
                fontSize="12"
                fontWeight="bold"
              >
                {angle.label || angle.value}
              </text>
            </g>
          );
        })}

        {/* תוויות נוספות */}
        {data.labels?.map((label, idx) => (
          <text
            key={idx}
            x={label.x}
            y={label.y}
            fill="#1f2937"
            fontSize="12"
            textAnchor="middle"
          >
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}