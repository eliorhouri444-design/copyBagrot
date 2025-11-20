import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Wand2, Loader2, Move, ZoomIn, ZoomOut, Maximize2, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DiagramEditor({ initialDiagram, onSave, onCancel, originalQuestion }) {
  // ✅ תיקון: ערכי ברירת מחדל מלאים
  const [diagramType, setDiagramType] = useState(initialDiagram?.type || "geometry");
  
  const [points, setPoints] = useState(initialDiagram?.points || {});
  const [lines, setLines] = useState(initialDiagram?.lines || []);
  const [shapes, setShapes] = useState(initialDiagram?.shapes || []);
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(initialDiagram?.generated_image_url || null);
  const [isUpdatingAnswer, setIsUpdatingAnswer] = useState(false);
  
  const [newPointName, setNewPointName] = useState("");
  const [newPointX, setNewPointX] = useState("");
  const [newPointY, setNewPointY] = useState("");
  
  const [newLineFrom, setNewLineFrom] = useState("");
  const [newLineTo, setNewLineTo] = useState("");
  const [newLineStyle, setNewLineStyle] = useState("solid");

  const [draggedPoint, setDraggedPoint] = useState(null);
  
  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const diagramTypes = [
    { id: "geometry", name: "גיאומטריה", color: "blue" },
    { id: "graph", name: "גרף פונקציה", color: "purple" }
  ];

  const handleAddPoint = () => {
    if (!newPointName || newPointX === "" || newPointY === "") {
      alert("נא למלא את כל השדות");
      return;
    }
    
    const x = parseFloat(newPointX);
    const y = parseFloat(newPointY);
    
    if (isNaN(x) || isNaN(y)) {
      alert("נא להזין מספרים תקינים");
      return;
    }
    
    setPoints({
      ...points,
      [newPointName]: {
        x: x,
        y: y,
        label: newPointName,
        label_position: "auto"
      }
    });
    
    setNewPointName("");
    setNewPointX("");
    setNewPointY("");
  };

  const handleDeletePoint = (pointName) => {
    const newPoints = { ...points };
    delete newPoints[pointName];
    setPoints(newPoints);
    
    setLines(lines.filter(line => line.from !== pointName && line.to !== pointName));
  };

  const handleAddLine = () => {
    if (!newLineFrom || !newLineTo) {
      alert("נא לבחור שתי נקודות");
      return;
    }
    
    if (!points[newLineFrom] || !points[newLineTo]) {
      alert("הנקודות לא קיימות");
      return;
    }
    
    setLines([...lines, {
      from: newLineFrom,
      to: newLineTo,
      style: newLineStyle,
      width: newLineStyle === "dashed" ? 2.5 : 3.5
    }]);
    
    setNewLineFrom("");
    setNewLineTo("");
  };

  const handleDeleteLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.3));
  const handleResetView = () => { setZoom(1); setPanX(0); setPanY(0); };

  const handleFitToScreen = () => {
    const allX = Object.values(points).map(p => p.x || 0);
    const allY = Object.values(points).map(p => p.y || 0);
    
    if (allX.length === 0) return;
    
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    const rangeX = Math.max(maxX - minX, 3);
    const rangeY = Math.max(maxY - minY, 3);
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaleX = containerWidth / (rangeX * 50 + 120);
    const scaleY = containerHeight / (rangeY * 50 + 120);
    
    const newZoom = Math.min(scaleX, scaleY, 2);
    setZoom(newZoom);
    setPanX(0);
    setPanY(0);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const handlePointMouseDown = (pointName, e) => {
    if (isPanning) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedPoint(pointName);
  };

  const handlePanStart = (e) => {
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
      return;
    }
    
    if (!svgRef.current || !draggedPoint) return;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const allX = Object.values(points).map(p => p.x || 0);
    const allY = Object.values(points).map(p => p.y || 0);
    
    const minX = allX.length > 0 ? Math.min(...allX) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX) : 10;
    const minY = allY.length > 0 ? Math.min(...allY) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY) : 10;

    const rangeX = Math.max(maxX - minX, 3);
    const rangeY = Math.max(maxY - minY, 3);
    
    const scale = 50;
    const padding = 60;
    const viewBoxHeight = rangeY * scale + padding * 2;

    const x = ((mouseX - panX) / zoom - padding) / scale + minX;
    const y = ((viewBoxHeight * zoom - (mouseY - panY)) / zoom - padding) / scale + minY;

    setPoints(prev => ({
      ...prev,
      [draggedPoint]: {
        ...prev[draggedPoint],
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10
      }
    }));
  };

  const handleMouseUp = () => {
    setDraggedPoint(null);
    setIsPanning(false);
  };

  useEffect(() => {
    if (draggedPoint || isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedPoint, isPanning, points, zoom, panX, panY]);

  // 🎨 Generate advanced diagram image
  const handleGenerateDalleImage = async () => {
    if (Object.keys(points).length === 0) {
      alert("אין מספיק נתונים לייצר איור");
      return;
    }

    setIsGeneratingImage(true);

    try {
      const result = await base44.functions.invoke('generateAdvancedDiagram', {
        diagramType,
        points,
        lines,
        shapes,
        question: originalQuestion
      });

      if (result.data?.success && result.data?.image_url) {
        setGeneratedImageUrl(result.data.image_url);
      } else {
        throw new Error(result.data?.error || 'שגיאה ביצירת האיור');
      }
    } catch (error) {
      console.error("DALL-E generation error:", error);
      alert("❌ שגיאה ביצירת האיור: " + error.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 🔄 Update teacher's answer with corrected diagram
  const handleSaveAndUpdateAnswer = async () => {
    const diagram = {
      type: diagramType,
      points,
      lines,
      shapes,
      generated_image_url: generatedImageUrl,
      custom_edited: true,
      correction_timestamp: new Date().toISOString()
    };
    
    setIsUpdatingAnswer(true);
    
    try {
      onSave(diagram);
      
      const updateResult = await base44.functions.invoke('updateTeacherAnswer', {
        originalQuestion,
        correctedDiagram: diagram,
        learningFeedback: {
          userCorrectedDiagram: true,
          correctionType: diagramType,
          timestamp: new Date().toISOString()
        }
      });
      
      if (updateResult.data?.success) {
        alert("✅ האיור נשמר והמורה החכם למד מהתיקון!");
      }
    } catch (error) {
      console.error("Error updating answer:", error);
      alert("⚠️ האיור נשמר אבל לא הצלחנו לעדכן את המורה");
    } finally {
      setIsUpdatingAnswer(false);
    }
  };

  const pointNames = Object.keys(points).sort();

  // ✅ חישוב SVG dimensions עם null checks
  const allX = Object.values(points).map(p => (p && typeof p.x === 'number') ? p.x : 0).filter(x => !isNaN(x));
  const allY = Object.values(points).map(p => (p && typeof p.y === 'number') ? p.y : 0).filter(y => !isNaN(y));
  
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 10;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 10;

  const rangeX = Math.max(maxX - minX, 3);
  const rangeY = Math.max(maxY - minY, 3);

  const scale = 50;
  const padding = 60;

  const viewBoxWidth = rangeX * scale + padding * 2;
  const viewBoxHeight = rangeY * scale + padding * 2;

  const toScreen = (point) => {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
      return { x: 0, y: 0 };
    }
    const x = (point.x - minX) * scale + padding;
    const y = viewBoxHeight - ((point.y - minY) * scale + padding);
    return { x, y };
  };

  const currentType = diagramTypes.find(t => t.id === diagramType) || diagramTypes[0];

  return (
    <div className="space-y-4">
      {/* בחירת סוג דיאגרמה */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-300">
        <div className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          סוג הדיאגרמה
        </div>
        <Select value={diagramType} onValueChange={setDiagramType}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {diagramTypes.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* תצוגה חיה */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border-2 border-blue-300">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
            👁️ תצוגה חיה - {currentType.name}
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
              Zoom: {(zoom * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handleZoomIn} className="h-8 w-8 p-0" title="זום פנימה">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut} className="h-8 w-8 p-0" title="זום החוצה">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleFitToScreen} className="h-8 w-8 p-0" title="התאם למסך">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetView} className="h-8 px-2 text-xs">אפס</Button>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="relative bg-white rounded-xl shadow-lg border-2 border-blue-200 overflow-hidden"
          style={{ 
            height: Object.keys(points).length === 0 ? '200px' : '400px',
            cursor: isPanning ? 'grabbing' : draggedPoint ? 'grabbing' : 'default'
          }}
          onMouseDown={handlePanStart}
        >
          {Object.keys(points).length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <div className="text-sm">הוסף נקודות כדי להתחיל</div>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              className="absolute"
              style={{ 
                width: `${viewBoxWidth * zoom}px`,
                height: `${viewBoxHeight * zoom}px`,
                transform: `translate(${panX}px, ${panY}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s'
              }}
            >
              <rect width="100%" height="100%" fill="#FAFAFA" />
              
              <defs>
                <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />
              
              {shapes.map((shapeObj, idx) => {
                const vertices = shapeObj.vertices;
                if (!vertices || vertices.length < 3) return null;
                
                const validVertices = vertices.filter(v => points[v]);
                if (validVertices.length < 3) return null;
                
                const polygonPoints = validVertices.map(v => {
                  const screen = toScreen(points[v]);
                  return `${screen.x},${screen.y}`;
                }).join(' ');
                
                return (
                  <polygon
                    key={`shape-${idx}`}
                    points={polygonPoints}
                    fill="rgba(59, 130, 246, 0.08)"
                    stroke="none"
                  />
                );
              })}

              {lines.map((line, idx) => {
                const from = points[line.from];
                const to = points[line.to];
                
                if (!from || !to) return null;
                
                const screenFrom = toScreen(from);
                const screenTo = toScreen(to);
                
                return (
                  <g key={`line-${idx}`}>
                    <line
                      x1={screenFrom.x}
                      y1={screenFrom.y}
                      x2={screenTo.x}
                      y2={screenTo.y}
                      stroke="#1F2937"
                      strokeWidth={line.width || 3.5}
                      strokeDasharray={line.style === 'dashed' ? "12,6" : "none"}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {Object.entries(points).map(([label, point]) => {
                const screen = toScreen(point);
                
                return (
                  <g key={`point-${label}`}>
                    <circle
                      cx={screen.x}
                      cy={screen.y}
                      r="20"
                      fill="transparent"
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => handlePointMouseDown(label, e)}
                      style={{ 
                        pointerEvents: 'all',
                        cursor: draggedPoint === label ? 'grabbing' : 'grab'
                      }}
                    />
                    
                    <circle
                      cx={screen.x}
                      cy={screen.y}
                      r="10"
                      fill={draggedPoint === label ? "#8B5CF6" : "#DC2626"}
                      opacity={draggedPoint === label ? "0.5" : "0.2"}
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    <circle
                      cx={screen.x}
                      cy={screen.y}
                      r="7"
                      fill={draggedPoint === label ? "#8B5CF6" : "#DC2626"}
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    <text
                      x={screen.x}
                      y={screen.y - 20}
                      textAnchor="middle"
                      fontSize="28"
                      fontWeight="bold"
                      fill="#1F2937"
                      style={{ 
                        textShadow: '0 0 7px white, 0 0 7px white',
                        pointerEvents: 'none'
                      }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        
        <div className="mt-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-2 border border-blue-200">
          <div className="text-xs text-gray-700 flex items-center justify-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Move className="w-3 h-3 text-purple-600" />
              <strong>גרור נקודות</strong>
            </span>
            <span className="flex items-center gap-1">
              <ZoomIn className="w-3 h-3 text-blue-600" />
              <strong>Ctrl+גלגלת</strong> - זום
            </span>
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-orange-600" />
              <strong>Shift+גרירה</strong> - הזזה
            </span>
          </div>
        </div>
      </div>

      {/* עריכת נקודות */}
      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
        <div className="text-sm font-bold text-blue-900 mb-3">
          📍 נקודות ({pointNames.length})
        </div>
        
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {pointNames.map(name => {
            const point = points[name];
            const x = (point && typeof point.x === 'number') ? point.x.toFixed(1) : '0.0';
            const y = (point && typeof point.y === 'number') ? point.y.toFixed(1) : '0.0';
            
            return (
              <div key={name} className="flex items-center justify-between bg-white rounded-lg p-2 border border-blue-200">
                <div className="text-sm font-semibold text-gray-900">
                  {name} <span className="text-gray-500">({x}, {y})</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeletePoint(name)}
                  className="text-red-600 hover:bg-red-50 h-7 px-2"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg p-3 border border-blue-300">
          <div className="text-xs font-semibold text-gray-700 mb-2">הוסף נקודה:</div>
          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="שם"
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value.toUpperCase())}
              className="h-9 text-sm"
              maxLength={2}
            />
            <Input
              type="number"
              placeholder="X"
              value={newPointX}
              onChange={(e) => setNewPointX(e.target.value)}
              className="h-9 text-sm"
              step="0.5"
            />
            <Input
              type="number"
              placeholder="Y"
              value={newPointY}
              onChange={(e) => setNewPointY(e.target.value)}
              className="h-9 text-sm"
              step="0.5"
            />
            <Button onClick={handleAddPoint} className="h-9 bg-blue-600">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* עריכת קווים */}
      <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
        <div className="text-sm font-bold text-amber-900 mb-3">
          📏 קווים ({lines.length})
        </div>

        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2 border border-amber-200">
              <div className="text-sm">
                <span className="font-semibold">{line.from}</span>
                <span className="mx-2">→</span>
                <span className="font-semibold">{line.to}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteLine(idx)}
                className="text-red-600 hover:bg-red-50 h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg p-3 border border-amber-300">
          <div className="text-xs font-semibold text-gray-700 mb-2">הוסף קו:</div>
          <div className="grid grid-cols-4 gap-2">
            <select
              value={newLineFrom}
              onChange={(e) => setNewLineFrom(e.target.value)}
              className="h-9 text-sm border rounded-md px-2"
            >
              <option value="">מ-</option>
              {pointNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              value={newLineTo}
              onChange={(e) => setNewLineTo(e.target.value)}
              className="h-9 text-sm border rounded-md px-2"
            >
              <option value="">אל-</option>
              {pointNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              value={newLineStyle}
              onChange={(e) => setNewLineStyle(e.target.value)}
              className="h-9 text-sm border rounded-md px-2"
            >
              <option value="solid">רגיל</option>
              <option value="dashed">מקווקו</option>
            </select>
            <Button onClick={handleAddLine} className="h-9 bg-amber-600">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* יצירת איור DALL-E 3 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4">
        <div className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          צור איור HD מקצועי
        </div>
        <div className="text-xs text-purple-800 mb-3">
          המערכת תיצור איור מדויק ומקצועי
        </div>
        <Button
          onClick={handleGenerateDalleImage}
          disabled={isGeneratingImage}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white h-10"
        >
          {isGeneratingImage ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              יוצר איור HD...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              {generatedImageUrl ? 'צור איור מחדש' : 'צור איור HD'}
            </>
          )}
        </Button>
      </div>

      {/* תצוגת האיור */}
      {generatedImageUrl && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
          <div className="text-sm font-bold text-green-900 mb-2">✅ איור HD נוצר!</div>
          <div className="bg-white rounded-lg p-2 border-2 border-green-200">
            <img src={generatedImageUrl} alt="Generated" className="w-full rounded-lg shadow-lg" />
          </div>
        </div>
      )}

      {/* כפתורי פעולה */}
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="outline" className="flex-1 h-11">
          ביטול
        </Button>
        <Button
          onClick={handleSaveAndUpdateAnswer}
          disabled={isUpdatingAnswer}
          className="flex-1 h-11 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
        >
          {isUpdatingAnswer ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              מעדכן...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              שמור ועדכן
            </>
          )}
        </Button>
      </div>

      {/* טיפים */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-3">
        <div className="text-xs font-bold text-indigo-900 mb-2">🎓 למידה מתיקונים:</div>
        <div className="text-xs text-indigo-800 space-y-1">
          <div>• המורה החכם <strong>לומד מהתיקונים</strong> שלך</div>
          <div>• אחרי שמירה, <strong>התשובה תתעדכן</strong> עם הפרטים הנכונים</div>
          <div>• המערכת <strong>זוכרת את הטעות</strong> ולא תחזור עליה</div>
          <div>• כל תיקון <strong>משפר את הדיוק</strong> של הזיהוי הבא</div>
        </div>
      </div>
    </div>
  );
}