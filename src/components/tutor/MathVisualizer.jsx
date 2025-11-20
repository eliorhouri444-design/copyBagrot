import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-bold text-gray-900">x: {label}</p>
        <p className="text-sm font-bold text-blue-600">y: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function MathVisualizer({ type, data, config }) {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // ⚠️ בדיקה: אם אין type או config - לא להציג כלום
  if (!type || !config) {
    console.error("❌ Missing type or config in MathVisualizer", { type, config });
    return null;
  }

  if (type === 'function') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-300 my-4 shadow-2xl w-full">
        <h4 className="text-xl font-black text-gray-900 mb-4 text-center bg-white rounded-xl py-2 shadow-md">
          📈 {config?.title || 'גרף הפונקציה'}
        </h4>
        <div className="bg-white rounded-xl p-2 shadow-inner w-full">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" strokeWidth={2} />
              <XAxis 
                dataKey="x" 
                label={{ value: 'x', position: 'insideBottom', offset: -5, style: { fontSize: 18, fontWeight: 'bold', fill: '#1F2937' } }}
                tick={{ fontSize: 14, fontWeight: '600', fill: '#374151' }}
                stroke="#6B7280"
                strokeWidth={2}
              />
              <YAxis 
                label={{ value: 'y', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 18, fontWeight: 'bold', fill: '#1F2937' } }}
                tick={{ fontSize: 14, fontWeight: '600', fill: '#374151' }}
                stroke="#6B7280"
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5 5' }} />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#3B82F6" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 9, fill: '#1D4ED8', strokeWidth: 3, stroke: '#fff' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {config?.equation && (
          <div className="text-center text-lg text-blue-900 mt-3 font-mono font-black bg-white py-2 px-4 rounded-xl shadow-lg border-2 border-blue-300">
            y = {config.equation}
          </div>
        )}
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-300 my-4 shadow-2xl w-full">
        <h4 className="text-xl font-black text-gray-900 mb-4 text-center bg-white rounded-xl py-2 shadow-md">
          📊 {config?.title || 'גרף עמודות'}
        </h4>
        <div className="bg-white rounded-xl p-2 shadow-inner w-full">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" strokeWidth={2} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 14, fontWeight: '600', fill: '#374151' }}
                stroke="#6B7280"
                strokeWidth={2}
              />
              <YAxis 
                tick={{ fontSize: 14, fontWeight: '600', fill: '#374151' }}
                stroke="#6B7280"
                strokeWidth={2}
              />
              <Tooltip 
                contentStyle={{ fontSize: 16, fontWeight: '600', borderRadius: '12px', border: '2px solid #10B981' }}
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
              />
              <Bar dataKey="value" fill="#10B981" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-purple-300 my-4 shadow-2xl w-full">
        <h4 className="text-xl font-black text-gray-900 mb-4 text-center bg-white rounded-xl py-2 shadow-md">
          🥧 {config?.title || 'גרף עוגה'}
        </h4>
        <div className="bg-white rounded-xl p-2 shadow-inner w-full">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 16, fontWeight: '600', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'geometry') {
    // ⚠️ בדיקה: אם אין points או lines - הודעת שגיאה
    if (!config.points || !config.lines) {
      return (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 my-4">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-red-900 mb-2">שגיאה באיור</h3>
            <p className="text-red-700 mb-2">האיור לא תקין - חסרים נתונים!</p>
            <div className="bg-white rounded-lg p-3 text-right text-sm text-red-800">
              <div className="font-bold mb-2">בעיות שזוהו:</div>
              {!config.points && <div>❌ חסרים "points" (נקודות)</div>}
              {!config.lines && <div>❌ חסרים "lines" (קווים)</div>}
              <div className="mt-3 text-xs text-gray-600">
                💡 המורה צריך לתקן את הפורמט
              </div>
            </div>
          </div>
        </div>
      );
    }

    const { shape, dimensions, labels, sideDimensions, coordinates, lines, points } = config || {};
    
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-300 my-4 shadow-2xl w-full">
        <h4 className="text-xl font-black text-gray-900 mb-4 text-center bg-white rounded-xl py-2 shadow-md">
          📐 {config?.title || 'ציור גיאומטרי'}
        </h4>
        <div className="bg-white rounded-xl p-2 shadow-inner flex justify-center w-full">
          <svg width="100%" height="500" viewBox="0 0 600 500" className="max-w-full" preserveAspectRatio="xMidYMid meet">
            {/* רקע רשת קואורדינטות */}
            <defs>
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
              </pattern>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#smallGrid)"/>
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#D1D5DB" strokeWidth="1"/>
              </pattern>
            </defs>
            
            {/* אם יש קואורדינטות - הצג רשת */}
            {(coordinates || points) && (
              <>
                <rect width="600" height="500" fill="url(#grid)" />
                
                {/* צירים */}
                <line x1="50" y1="450" x2="550" y2="450" stroke="#374151" strokeWidth="2" />
                <line x1="50" y1="450" x2="50" y2="50" stroke="#374151" strokeWidth="2" />
                
                {/* חיצים */}
                <polygon points="550,450 540,445 540,455" fill="#374151" />
                <polygon points="50,50 45,60 55,60" fill="#374151" />
                
                {/* תוויות צירים */}
                <text x="560" y="455" fontSize="16" fontWeight="bold" fill="#374151">x</text>
                <text x="40" y="40" fontSize="16" fontWeight="bold" fill="#374151">y</text>
                
                {/* סימוני ציר X */}
                {[0, 2, 4, 6, 8, 10].map(i => (
                  <g key={`x-${i}`}>
                    <line x1={50 + i * 50} y1="445" x2={50 + i * 50} y2="455" stroke="#374151" strokeWidth="1.5" />
                    <text x={50 + i * 50} y="470" textAnchor="middle" fontSize="12" fill="#374151">{i}</text>
                  </g>
                ))}
                
                {/* סימוני ציר Y */}
                {[0, 2, 4, 6, 8].map(i => (
                  <g key={`y-${i}`}>
                    <line x1="45" y1={450 - i * 50} x2="55" y2={450 - i * 50} stroke="#374151" strokeWidth="1.5" />
                    <text x="35" y={450 - i * 50 + 5} textAnchor="end" fontSize="12" fill="#374151">{i}</text>
                  </g>
                ))}
              </>
            )}
            
            {/* ציור קווים מותאמים אישית */}
            {lines && lines.map((line, idx) => {
              const from = (coordinates || points)?.[line.from];
              const to = (coordinates || points)?.[line.to];
              
              if (!from || !to) {
                console.warn(`⚠️ Line ${idx} missing points:`, line);
                return null;
              }
              
              const x1 = 50 + from.x * 50;
              const y1 = 450 - from.y * 50;
              const x2 = 50 + to.x * 50;
              const y2 = 450 - to.y * 50;
              
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={line.color || "#3B82F6"}
                  strokeWidth={line.width || 3}
                  strokeDasharray={line.dashed ? "8,4" : "none"}
                />
              );
            })}
            
            {/* נקודות מותאמות אישית */}
            {points && Object.entries(points).map(([label, point]) => {
              const showCoords = point.showCoords !== false;
              return (
                <g key={label}>
                  <circle 
                    cx={50 + point.x * 50} 
                    cy={450 - point.y * 50} 
                    r="5" 
                    fill={point.color || "#EF4444"} 
                  />
                  <text 
                    x={50 + point.x * 50 + (point.labelOffset?.x || 15)} 
                    y={450 - point.y * 50 + (point.labelOffset?.y || -10)} 
                    fontSize="18" 
                    fontWeight="bold" 
                    fill={point.color || "#EF4444"}
                  >
                    {label}{showCoords ? `(${point.x}, ${point.y})` : ''}
                  </text>
                </g>
              );
            })}
            
            {/* צורות מוגדרות מראש עם קואורדינטות */}
            {shape === 'triangle' && coordinates && (
              <>
                <polygon 
                  points={`${50 + coordinates.A.x * 50},${450 - coordinates.A.y * 50} ${50 + coordinates.B.x * 50},${450 - coordinates.B.y * 50} ${50 + coordinates.C.x * 50},${450 - coordinates.C.y * 50}`}
                  fill="rgba(245, 158, 11, 0.2)" 
                  stroke="#F59E0B" 
                  strokeWidth="3" 
                />
                
                {Object.entries(coordinates).map(([point, coord]) => (
                  <g key={point}>
                    <circle 
                      cx={50 + coord.x * 50} 
                      cy={450 - coord.y * 50} 
                      r="5" 
                      fill="#EF4444" 
                    />
                    <text 
                      x={50 + coord.x * 50 + 15} 
                      y={450 - coord.y * 50 - 10} 
                      fontSize="20" 
                      fontWeight="bold" 
                      fill="#EF4444"
                    >
                      {point}({coord.x}, {coord.y})
                    </text>
                  </g>
                ))}
              </>
            )}
            
            {shape === 'rectangle' && coordinates && (
              <>
                <rect 
                  x={50 + coordinates.A.x * 50}
                  y={450 - coordinates.B.y * 50}
                  width={(coordinates.B.x - coordinates.A.x) * 50}
                  height={(coordinates.B.y - coordinates.D.y) * 50}
                  fill="rgba(16, 185, 129, 0.2)" 
                  stroke="#10B981" 
                  strokeWidth="3" 
                />
                
                {Object.entries(coordinates).map(([point, coord]) => (
                  <g key={point}>
                    <circle 
                      cx={50 + coord.x * 50} 
                      cy={450 - coord.y * 50} 
                      r="5" 
                      fill="#EF4444" 
                    />
                    <text 
                      x={50 + coord.x * 50 + (coord.x > 5 ? -80 : 15)} 
                      y={450 - coord.y * 50 + (coord.y > 5 ? -10 : 20)} 
                      fontSize="18" 
                      fontWeight="bold" 
                      fill="#EF4444"
                    >
                      {point}({coord.x}, {coord.y})
                    </text>
                  </g>
                ))}
                
                {sideDimensions && (
                  <>
                    {sideDimensions.AB && (
                      <text 
                        x={50 + ((coordinates.A.x + coordinates.B.x) / 2) * 50} 
                        y={450 - coordinates.A.y * 50 - 15} 
                        textAnchor="middle" 
                        fontSize="18" 
                        fontWeight="bold" 
                        fill="#10B981"
                      >
                        {sideDimensions.AB}
                      </text>
                    )}
                    
                    {sideDimensions.BC && (
                      <text 
                        x={50 + coordinates.B.x * 50 + 25} 
                        y={450 - ((coordinates.B.y + coordinates.C.y) / 2) * 50} 
                        textAnchor="middle" 
                        fontSize="18" 
                        fontWeight="bold" 
                        fill="#10B981"
                      >
                        {sideDimensions.BC}
                      </text>
                    )}
                  </>
                )}
              </>
            )}
            
            {/* מצב ישן - ללא קואורדינטות */}
            {!coordinates && !points && shape === 'triangle' && (
              <>
                <polygon points="300,60 120,340 480,340" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" strokeWidth="4" />
                {sideDimensions && (
                  <>
                    {sideDimensions.AB && (
                      <text x="210" y="365" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        {sideDimensions.AB}
                      </text>
                    )}
                    {sideDimensions.BC && (
                      <text x="70" y="200" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        {sideDimensions.BC}
                      </text>
                    )}
                    {sideDimensions.AC && (
                      <text x="520" y="200" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        {sideDimensions.AC}
                      </text>
                    )}
                  </>
                )}
                {dimensions && !sideDimensions && (
                  <>
                    <text x="300" y="375" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#F59E0B">
                      {dimensions.base}
                    </text>
                    <text x="75" y="200" fontSize="24" fontWeight="bold" fill="#F59E0B">
                      {dimensions.height}
                    </text>
                  </>
                )}
                {labels && (
                  <>
                    {labels.A && <text x="300" y="45" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.A}</text>}
                    {labels.B && <text x="105" y="360" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.B}</text>}
                    {labels.C && <text x="495" y="360" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.C}</text>}
                  </>
                )}
              </>
            )}
            
            {!coordinates && !points && shape === 'circle' && (
              <>
                <circle cx="300" cy="200" r="120" fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" strokeWidth="4" />
                {dimensions && (
                  <>
                    <line x1="300" y1="200" x2="420" y2="200" stroke="#3B82F6" strokeWidth="3" strokeDasharray="8,8" />
                    <text x="360" y="180" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#3B82F6">
                      r = {dimensions.radius}
                    </text>
                  </>
                )}
                {labels && labels.center && (
                  <text x="300" y="205" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.center}</text>
                )}
              </>
            )}
            
            {!coordinates && !points && shape === 'rectangle' && (
              <>
                <rect x="150" y="100" width="300" height="200" fill="rgba(16, 185, 129, 0.2)" stroke="#10B981" strokeWidth="4" />
                
                {sideDimensions && (
                  <>
                    {sideDimensions.AB && (
                      <text x="300" y="85" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        AB = {sideDimensions.AB}
                      </text>
                    )}
                    
                    {sideDimensions.BC && (
                      <text x="475" y="200" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        BC = {sideDimensions.BC}
                      </text>
                    )}
                    
                    {sideDimensions.CD && (
                      <text x="300" y="325" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        CD = {sideDimensions.CD}
                      </text>
                    )}
                    
                    {sideDimensions.DA && (
                      <text x="125" y="200" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#10B981">
                        DA = {sideDimensions.DA}
                      </text>
                    )}
                  </>
                )}
                
                {dimensions && !sideDimensions && (
                  <>
                    <text x="300" y="330" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#10B981">
                      {dimensions.width}
                    </text>
                    <text x="110" y="200" fontSize="24" fontWeight="bold" fill="#10B981">
                      {dimensions.height}
                    </text>
                  </>
                )}
                
                {labels && (
                  <>
                    {labels.A && <text x="135" y="90" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.A}</text>}
                    {labels.B && <text x="465" y="90" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.B}</text>}
                    {labels.C && <text x="465" y="320" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.C}</text>}
                    {labels.D && <text x="135" y="320" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#EF4444">{labels.D}</text>}
                    {labels.E && <text x="300" y="90" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#3B82F6">{labels.E}</text>}
                    {labels.F && <text x="465" y="200" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#3B82F6">{labels.F}</text>}
                    {labels.G && <text x="300" y="320" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#3B82F6">{labels.G}</text>}
                    {labels.H && <text x="135" y="200" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#3B82F6">{labels.H}</text>}
                  </>
                )}
              </>
            )}

            {shape === 'angle' && (
              <>
                <line x1="80" y1="280" x2="520" y2="280" stroke="#8B5CF6" strokeWidth="4" />
                <line x1="80" y1="280" x2="350" y2="80" stroke="#8B5CF6" strokeWidth="4" />
                <path d="M 180,280 A 100,100 0 0,1 135,190" fill="none" stroke="#8B5CF6" strokeWidth="3" />
                {dimensions?.angle && (
                  <text x="200" y="250" fontSize="24" fontWeight="bold" fill="#8B5CF6">
                    {dimensions.angle}°
                  </text>
                )}
              </>
            )}
          </svg>
        </div>
        {config?.description && (
          <div className="mt-3 text-center text-sm text-gray-700 bg-amber-50 py-2 px-4 rounded-lg border border-amber-200">
            {config.description}
          </div>
        )}
      </div>
    );
  }

  if (type === 'vector') {
    return (
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 border-2 border-pink-300 my-4 shadow-2xl w-full">
        <h4 className="text-xl font-black text-gray-900 mb-4 text-center bg-white rounded-xl py-2 shadow-md">
          🎯 {config?.title || 'וקטורים'}
        </h4>
        <div className="bg-white rounded-xl p-2 shadow-inner flex justify-center w-full">
          <svg width="100%" height="400" viewBox="0 0 600 400" className="max-w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E5E7EB" strokeWidth="1.5" />
              </pattern>
              <marker id="arrowhead" markerWidth="15" markerHeight="15" refX="14" refY="5" orient="auto">
                <polygon points="0 0, 15 5, 0 10" fill="#3B82F6" />
              </marker>
            </defs>
            <rect width="600" height="400" fill="url(#grid)" />
            
            <line x1="0" y1="200" x2="600" y2="200" stroke="#374151" strokeWidth="3" />
            <line x1="300" y1="0" x2="300" y2="400" stroke="#374151" strokeWidth="3" />
            
            {data.map((vector, idx) => {
              const endX = 300 + vector.x * 40;
              const endY = 200 - vector.y * 40;
              return (
                <g key={idx}>
                  <line 
                    x1="300" 
                    y1="200" 
                    x2={endX} 
                    y2={endY} 
                    stroke={COLORS[idx % COLORS.length]} 
                    strokeWidth="5" 
                    markerEnd="url(#arrowhead)" 
                  />
                  <text 
                    x={endX + 20} 
                    y={endY - 20} 
                    fontSize="20" 
                    fontWeight="bold"
                    fill={COLORS[idx % COLORS.length]}
                  >
                    ({vector.x}, {vector.y})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  return null;
}