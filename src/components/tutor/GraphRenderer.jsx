import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, ResponsiveContainer } from "recharts";

export default function GraphRenderer({ graphText, graphData }) {
  // אם יש נתונים מובנים - השתמש בהם
  if (graphData && graphData.points && Array.isArray(graphData.points) && graphData.points.length > 0) {
    const chartType = graphData.chartType || 'line';
    const showPoints = graphData.showPoints !== false;
    
    // מיון הנקודות לפי X לקו ישר
    const sortedPoints = [...graphData.points].sort((pointA, pointB) => {
      const xA = pointA?.x || 0;
      const xB = pointB?.x || 0;
      return xA - xB;
    });
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 rounded-xl p-4 my-3 shadow-lg">
        <div className="text-sm font-bold text-blue-900 mb-3 text-center">
          📊 {graphData.title || 'גרף הפונקציה'}
        </div>
        
        <ResponsiveContainer width="100%" height={320}>
          {chartType === 'scatter' ? (
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#93C5FD" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name={graphData.xLabel || "X"}
                stroke="#1E40AF"
                label={{ value: graphData.xLabel || 'X', position: 'insideBottom', offset: -15, style: { fontSize: 14, fontWeight: 'bold' } }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name={graphData.yLabel || "Y"}
                stroke="#1E40AF"
                label={{ value: graphData.yLabel || 'Y', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 'bold' } }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #60A5FA',
                  borderRadius: '8px',
                  direction: 'rtl'
                }}
              />
              <Scatter 
                data={sortedPoints} 
                fill="#3B82F6" 
                shape="circle"
                r={6}
              />
            </ScatterChart>
          ) : (
            <LineChart data={sortedPoints} margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#93C5FD" />
              <XAxis 
                dataKey="x" 
                stroke="#1E40AF"
                label={{ value: graphData.xLabel || 'X', position: 'insideBottom', offset: -15, style: { fontSize: 14, fontWeight: 'bold' } }}
              />
              <YAxis 
                stroke="#1E40AF"
                label={{ value: graphData.yLabel || 'Y', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 'bold' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #60A5FA',
                  borderRadius: '8px',
                  direction: 'rtl'
                }}
              />
              <Line 
                type="linear" 
                dataKey="y" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={showPoints ? { fill: '#3B82F6', r: 5 } : false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>

        {graphData.description && (
          <div className="text-xs text-gray-700 mt-3 text-center bg-white rounded-lg p-2 border border-blue-200">
            {graphData.description}
          </div>
        )}
        
        {graphData.formula && (
          <div className="text-sm font-bold text-center mt-2 bg-white rounded-lg p-2 border-2 border-indigo-300 text-indigo-900">
            📐 {graphData.formula}
          </div>
        )}
      </div>
    );
  }

  // אם זה ASCII - נסה לזהות ולהמיר לגרף אמיתי
  if (graphText && (graphText.includes('*') || graphText.includes('|') || graphText.includes('-'))) {
    const parsedData = parseASCIIGraph(graphText);
    
    if (parsedData && parsedData.length > 0) {
      const sortedData = [...parsedData].sort((pointA, pointB) => {
        const xA = pointA?.x || 0;
        const xB = pointB?.x || 0;
        return xA - xB;
      });
      
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 rounded-xl p-4 my-3 shadow-lg">
          <div className="text-sm font-bold text-blue-900 mb-3 text-center">
            📊 גרף הפונקציה
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sortedData} margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#93C5FD" />
              <XAxis 
                dataKey="x"
                stroke="#1E40AF"
                label={{ value: 'X', position: 'insideBottom', offset: -15 }}
              />
              <YAxis 
                stroke="#1E40AF"
                label={{ value: 'Y', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #60A5FA',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="linear" 
                dataKey="y" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="text-xs text-blue-700 mt-2 text-center bg-white rounded-lg p-2 border border-blue-200">
            💡 גרף אינטראקטיבי - עבור עם העכבר על הגרף לראות ערכים
          </div>
        </div>
      );
    }
  }

  // אחרת - הצג את הטקסט המקורי בתוך קוד
  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded-xl my-3 overflow-x-auto">
      <pre className="text-xs font-mono">{graphText}</pre>
    </div>
  );
}

/**
 * פרסור ASCII גרף לנתונים
 */
function parseASCIIGraph(asciiText) {
  try {
    if (!asciiText || typeof asciiText !== 'string') return null;
    
    const lines = asciiText.split('\n');
    const points = [];
    
    lines.forEach((line, yIdx) => {
      if (!line) return;
      for (let xIdx = 0; xIdx < line.length; xIdx++) {
        if (line[xIdx] === '*' || line[xIdx] === '●' || line[xIdx] === '•') {
          points.push({
            x: xIdx,
            y: lines.length - yIdx
          });
        }
      }
    });

    if (points.length > 0) {
      const xValues = points.map(p => p?.x || 0);
      const yValues = points.map(p => p?.y || 0);
      
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);

      return points.map(p => ({
        x: Math.round((p.x - minX) / (maxX - minX || 1) * 10),
        y: Math.round((p.y - minY) / (maxY - minY || 1) * 10)
      }));
    }

    return null;
  } catch (error) {
    console.error('Failed to parse ASCII graph:', error);
    return null;
  }
}