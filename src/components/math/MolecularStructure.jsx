import { motion } from "framer-motion";

/**
 * ⚗️ Molecular Structure Renderer
 * מציג מבני מולקולות לכימיה
 */

export default function MolecularStructure({ structure }) {
  if (!structure || !structure.atoms || structure.atoms.length === 0) {
    return null;
  }

  const width = 500;
  const height = 400;

  // Normalize positions
  const padding = 50;
  const atoms = structure.atoms.map(atom => ({
    ...atom,
    x: (atom.x * (width - 2 * padding)) + padding,
    y: (atom.y * (height - 2 * padding)) + padding
  }));

  const atomColors = {
    'H': '#ffffff',
    'C': '#1f2937',
    'N': '#3b82f6',
    'O': '#ef4444',
    'S': '#eab308',
    'P': '#f97316',
    'Cl': '#10b981',
    'Br': '#8b5cf6',
    'default': '#6b7280'
  };

  const getAtomColor = (element) => atomColors[element] || atomColors.default;

  const bondTypes = {
    'single': { width: 2, dash: 'none' },
    'double': { width: 4, dash: 'none' },
    'triple': { width: 6, dash: 'none' },
    'dashed': { width: 2, dash: '5,5' }
  };

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-2xl p-4 shadow-xl">
      <div className="text-sm font-bold text-pink-900 mb-3">
        ⚗️ מבנה מולקולרי
      </div>

      <div className="bg-white rounded-xl p-3 border-2 border-pink-200">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Bonds */}
          {structure.bonds && structure.bonds.map((bond, idx) => {
            const fromAtom = atoms[bond.from];
            const toAtom = atoms[bond.to];
            const bondStyle = bondTypes[bond.type] || bondTypes.single;

            return (
              <motion.line
                key={idx}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                x1={fromAtom.x}
                y1={fromAtom.y}
                x2={toAtom.x}
                y2={toAtom.y}
                stroke="#374151"
                strokeWidth={bondStyle.width}
                strokeDasharray={bondStyle.dash}
              />
            );
          })}

          {/* Atoms */}
          {atoms.map((atom, idx) => (
            <g key={idx}>
              <motion.circle
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 + idx * 0.05 }}
                cx={atom.x}
                cy={atom.y}
                r="20"
                fill={getAtomColor(atom.element)}
                stroke="#1f2937"
                strokeWidth="2"
              />
              <text
                x={atom.x}
                y={atom.y + 5}
                fontSize="14"
                fontWeight="bold"
                fill={atom.element === 'C' || atom.element === 'H' ? '#ffffff' : '#1f2937'}
                textAnchor="middle"
              >
                {atom.element}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[...new Set(atoms.map(a => a.element))].map((element, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 border border-pink-200">
            <div
              className="w-4 h-4 rounded-full border-2 border-gray-700"
              style={{ backgroundColor: getAtomColor(element) }}
            />
            <span className="text-xs font-bold text-gray-900">{element}</span>
          </div>
        ))}
      </div>

      <div className="text-xs text-pink-700 mt-3 text-center">
        💡 מבנה Lewis - קשרים ואטומים
      </div>
    </div>
  );
}