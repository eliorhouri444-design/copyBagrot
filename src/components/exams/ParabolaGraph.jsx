import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ParabolaGraph({ 
  a = 1,
  b = 0, 
  c = 0,
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  interactive = true,
  onParametersChange,
  showVertex = true,
  showRoots = true
}) {
  const [params, setParams] = useState({ a, b, c });
  
  const width = 600;
  const height = 500;
  
  const graphToCanvas = (x, y) => {
    return {
      x: ((x - xMin) / (xMax - xMin)) * width,
      y: height - ((y - yMin) / (yMax - yMin)) * height
    };
  };

  const calculateY = (x) => {
    return params.a * x * x + params.b * x + params.c;
  };

  const vertexX = -params.b / (2 * params.a);
  const vertexY = calculateY(vertexX);

  const discriminant = params.b * params.b - 4 * params.a * params.c;
  const roots = discriminant >= 0 ? [
    (-params.b + Math.sqrt(discriminant)) / (2 * params.a),
    (-params.b - Math.sqrt(discriminant)) / (2 * params.a)
  ] : [];

  const generatePath = () => {
    const points = [];
    const step = (xMax - xMin) / 200;
    
    for (let x = xMin; x <= xMax; x += step) {
      const y = calculateY(x);
      if (y >= yMin && y <= yMax) {
        const pos = graphToCanvas(x, y);
        points.push(pos);
      }
    }

    return points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');
  };

  const reset = () => {
    setParams({ a, b, c });
    onParametersChange && onParametersChange({ a, b, c });
  };

  return (
    <div className="flex flex-col items-center">
      {interactive && (
        <div className="grid grid-cols-3 gap-4 mb-4 w-full max-w-md">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
            <label className="text-xs font-semibold text-blue-900 block mb-2">a</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.1"
              value={params.a}
              onChange={(e) => {
                const newA = parseFloat(e.target.value);
                if (newA !== 0) {
                  const newParams = { ...params, a: newA };
                  setParams(newParams);
                  onParametersChange && onParametersChange(newParams);
                }
              }}
              className="w-full"
            />
            <div className="text-sm font-bold text-blue-600 text-center mt-1">
              {params.a.toFixed(1)}
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
            <label className="text-xs font-semibold text-green-900 block mb-2">b</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={params.b}
              onChange={(e) => {
                const newParams = { ...params, b: parseFloat(e.target.value) };
                setParams(newParams);
                onParametersChange && onParametersChange(newParams);
              }}
              className="w-full"
            />
            <div className="text-sm font-bold text-green-600 text-center mt-1">
              {params.b.toFixed(1)}
            </div>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3">
            <label className="text-xs font-semibold text-purple-900 block mb-2">c</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={params.c}
              onChange={(e) => {
                const newParams = { ...params, c: parseFloat(e.target.value) };
                setParams(newParams);
                onParametersChange && onParametersChange(newParams);
              }}
              className="w-full"
            />
            <div className="text-sm font-bold text-purple-600 text-center mt-1">
              {params.c.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl border-2 border-slate-300 rounded-2xl bg-white">
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
          <line x1="0" y1={graphToCanvas(0, 0).y} x2={width} y2={graphToCanvas(0, 0).y} />
          <line x1={graphToCanvas(0, 0).x} y1="0" x2={graphToCanvas(0, 0).x} y2={height} />
        </g>

        {/* Axis labels */}
        <g fill="#64748b" fontSize="12" textAnchor="middle">
          {[-10, -5, 5, 10].map((x) => (
            <text key={`x${x}`} x={graphToCanvas(x, 0).x} y={graphToCanvas(0, 0).y + 20}>
              {x}
            </text>
          ))}
          {[-10, -5, 5, 10].map((y) => (
            <text key={`y${y}`} x={graphToCanvas(0, 0).x - 25} y={graphToCanvas(0, y).y + 5}>
              {y}
            </text>
          ))}
        </g>

        {/* Parabola */}
        <motion.path
          d={generatePath()}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Vertex */}
        {showVertex && vertexY >= yMin && vertexY <= yMax && (
          <g>
            <circle
              cx={graphToCanvas(vertexX, vertexY).x}
              cy={graphToCanvas(vertexX, vertexY).y}
              r="6"
              fill="#8b5cf6"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={graphToCanvas(vertexX, vertexY).x + 15}
              y={graphToCanvas(vertexX, vertexY).y - 10}
              fill="#8b5cf6"
              fontSize="14"
              fontWeight="bold"
            >
              קודקוד
            </text>
          </g>
        )}

        {/* Roots */}
        {showRoots && roots.map((root, idx) => {
          if (root >= xMin && root <= xMax) {
            const pos = graphToCanvas(root, 0);
            return (
              <g key={idx}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="5"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={pos.x}
                  y={pos.y + 20}
                  fill="#10b981"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {root.toFixed(1)}
                </text>
              </g>
            );
          }
          return null;
        })}
      </svg>

      <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 w-full max-w-md">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900 mb-2">
            y = {params.a.toFixed(1)}x² {params.b >= 0 ? '+' : ''}{params.b.toFixed(1)}x {params.c >= 0 ? '+' : ''}{params.c.toFixed(1)}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="text-xs text-slate-600">קודקוד</div>
              <div className="text-sm font-bold text-purple-600">
                ({vertexX.toFixed(1)}, {vertexY.toFixed(1)})
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600">שורשים</div>
              <div className="text-sm font-bold text-green-600">
                {roots.length === 0 ? 'אין' : roots.length === 1 ? '1' : '2'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {interactive && (
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="mt-4"
        >
          <RotateCcw className="w-4 h-4 ml-2" />
          אתחל
        </Button>
      )}
    </div>
  );
}