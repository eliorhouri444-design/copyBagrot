import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, AreaChart, Area, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Eye, EyeOff } from "lucide-react";

export default function AdvancedVisualizations({ graphData, type = "2d" }) {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [rotation, setRotation] = useState(0);

  if (!graphData || !graphData.points || graphData.points.length === 0) {
    return null;
  }

  const renderGraph2D = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={graphData.points}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis 
            dataKey="x" 
            label={showLabels ? { value: graphData.x_axis_label || 'x', position: 'insideBottom', offset: -5 } : undefined}
            stroke="#6b7280"
          />
          <YAxis 
            label={showLabels ? { value: graphData.y_axis_label || 'y', angle: -90, position: 'insideLeft' } : undefined}
            stroke="#6b7280"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '2px solid #8b5cf6',
              borderRadius: '8px',
              direction: 'rtl'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 5 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderScatter = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="x" type="number" stroke="#6b7280" />
          <YAxis dataKey="y" type="number" stroke="#6b7280" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter 
            data={graphData.points} 
            fill="#8b5cf6"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const renderArea = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={graphData.points}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="x" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip />
          <Area 
            type="monotone" 
            dataKey="y" 
            stroke="#8b5cf6" 
            fill="#c4b5fd"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-purple-900">
          📊 {graphData.title || 'גרף אינטראקטיבי'}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowGrid(!showGrid)}
            className="h-8 px-2"
          >
            {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLabels(!showLabels)}
            className="h-8 px-2"
          >
            <span className="text-xs">{showLabels ? 'AB' : 'ab'}</span>
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(zoom === 1 ? 1.5 : 1)}
            className="h-8 px-2"
          >
            {zoom === 1 ? <ZoomIn className="w-4 h-4" /> : <ZoomOut className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 border-2 border-purple-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
        {type === 'scatter' && renderScatter()}
        {type === 'area' && renderArea()}
        {type === '2d' && renderGraph2D()}
      </div>

      {graphData.description && (
        <div className="mt-3 text-xs text-purple-700 bg-purple-100 rounded-lg p-2">
          💡 {graphData.description}
        </div>
      )}
    </div>
  );
}