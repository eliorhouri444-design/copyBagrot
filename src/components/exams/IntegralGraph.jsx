import { useState } from "react";
import { motion } from "framer-motion";

export default function IntegralGraph({ 
  functionType = 'quadratic',
  a = 1,
  b = 0, 
  c = 0,
  lowerBound = -2,
  upperBound = 2,
  xMin = -5,
  xMax = 5,
  yMin = -5,
  yMax = 10,
  interactive = true,
  onBoundsChange
}) {
  const [bounds, setBounds] = useState({ lower: lowerBound, upper: upperBound });
  const [dragging, setDragging] = useState(null);

  const width = 600;
  const height = 500;

  const graphToCanvas = (x, y) => {
    return {
      x: ((x - xMin) / (xMax - xMin)) * width,
      y: height - ((y - yMin) / (yMax - yMin)) * height
    };
  };

  const canvasToGraph = (canvasX) => {
    return ((canvasX / width) * (xMax - xMin)) + xMin;
  };

  const calculateY = (x) => {
    if (functionType === 'quadratic') {
      return a * x * x + b * x + c;
    } else if (functionType === 'cubic') {
      return a * x * x * x + b * x * x + c * x;
    } else if (functionType === 'sine') {
      return a * Math.sin(x) + b;
    }
    return x;
  };

  // Generate curve path
  const generatePath = () => {
    const points = [];
    const step = (xMax - xMin) / 300;
    
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

  // Generate shaded area
  const generateShadedArea = () => {
    const points = [];
    const step = (bounds.upper - bounds.lower) / 100;
    
    // Top of curve
    for (let x = bounds.lower; x <= bounds.upper; x += step) {
      const y = calculateY(x);
      const pos = graphToCanvas(x, y);
      points.push(`${points.length === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`);
    }
    
    // Bottom line
    const bottomRight = graphToCanvas(bounds.upper, 0);
    const bottomLeft = graphToCanvas(bounds.lower, 0);
    points.push(`L ${bottomRight.x} ${bottomRight.y}`);
    points.push(`L ${bottomLeft.x} ${bottomLeft.y}`);
    points.push('Z');

    return points.join(' ');
  };

  // Calculate approximate integral value
  const calculateIntegral = () => {
    const step = (bounds.upper - bounds.lower) / 100;
    let sum = 0;
    
    for (let x = bounds.lower; x < bounds.upper; x += step) {
      sum += calculateY(x) * step;
    }
    
    return sum;
  };

  const handleMouseMove = (e) => {
    if (!dragging || !interactive) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const graphX = canvasToGraph(mouseX);

    const newBounds = { ...bounds };
    if (dragging === 'lower') {
      newBounds.lower = Math.max(xMin, Math.min(graphX, bounds.upper - 0.5));
    } else if (dragging === 'upper') {
      newBounds.upper = Math.min(xMax, Math.max(graphX, bounds.lower + 0.5));
    }

    setBounds(newBounds);
    onBoundsChange && onBoundsChange(newBounds);
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-2xl border-2 border-slate-300 rounded-2xl bg-white"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
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
          <line x1="0" y1={graphToCanvas(0, 0).y} x2={width} y2={graphToCanvas(0, 0).y} />
          <line x1={graphToCanvas(0, 0).x} y1="0" x2={graphToCanvas(0, 0).x} y2={height} />
        </g>

        {/* Shaded area (integral) */}
        <motion.path
          d={generateShadedArea()}
          fill="url(#areaGradient)"
          opacity="0.6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.3 }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Function curve */}
        <motion.path
          d={generatePath()}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Bounds markers */}
        {interactive && (
          <>
            <motion.line
              x1={graphToCanvas(bounds.lower, yMin).x}
              y1={graphToCanvas(bounds.lower, yMin).y}
              x2={graphToCanvas(bounds.lower, yMax).x}
              y2={graphToCanvas(bounds.lower, yMax).y}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5 5"
              className="cursor-ew-resize"
              onMouseDown={() => setDragging('lower')}
            />

            <motion.circle
              cx={graphToCanvas(bounds.lower, 0).x}
              cy={graphToCanvas(bounds.lower, 0).y}
              r="8"
              fill="#ef4444"
              stroke="white"
              strokeWidth="2"
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={() => setDragging('lower')}
              whileHover={{ scale: 1.2 }}
            />

            <motion.line
              x1={graphToCanvas(bounds.upper, yMin).x}
              y1={graphToCanvas(bounds.upper, yMin).y}
              x2={graphToCanvas(bounds.upper, yMax).x}
              y2={graphToCanvas(bounds.upper, yMax).y}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="5 5"
              className="cursor-ew-resize"
              onMouseDown={() => setDragging('upper')}
            />

            <motion.circle
              cx={graphToCanvas(bounds.upper, 0).x}
              cy={graphToCanvas(bounds.upper, 0).y}
              r="8"
              fill="#10b981"
              stroke="white"
              strokeWidth="2"
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={() => setDragging('upper')}
              whileHover={{ scale: 1.2 }}
            />
          </>
        )}
      </svg>

      <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 w-full max-w-md">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            ∫ f(x) dx מ־{bounds.lower.toFixed(1)} עד {bounds.upper.toFixed(1)}
          </div>
          <div className="text-3xl font-bold text-blue-600">
            ≈ {calculateIntegral().toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-2">
            שטח מתחת לעקומה
          </div>
        </div>
      </div>

      {interactive && (
        <p className="text-xs text-slate-600 mt-3 text-center">
          גרור את הנקודות האדומות והירוקות כדי לשנות את גבולות האינטגרל
        </p>
      )}
    </div>
  );
}