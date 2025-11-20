
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, Type, Layout, Sparkles, Save, MousePointer, Zap, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/components/theme/ThemeProvider";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";

export default function LiveDesignEditor({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("colors");
  const [themeName, setThemeName] = useState("עיצוב מותאם");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [elementText, setElementText] = useState("");
  const [selectedAnimation, setSelectedAnimation] = useState("none");

  useEffect(() => {
    if (selectMode) {
      const handleClick = (e) => {
        if (e.target.closest('.design-editor-panel')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const element = e.target;
        
        // Skip SVG elements - they have readonly className
        if (element instanceof SVGElement || element.tagName === 'svg' || element.tagName === 'path') {
          console.log('⚠️ Skipping SVG element');
          return;
        }
        
        const isButton = element.tagName === 'BUTTON' || element.closest('button') !== null;
        const isText = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'DIV', 'A', 'LABEL'].includes(element.tagName);
        const isBox = ['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV'].includes(element.tagName);
        
        setSelectedElement({
          element,
          tagName: element.tagName,
          className: element.className,
          textContent: element.textContent?.substring(0, 50),
          isButton,
          isText,
          isBox,
          computedStyle: window.getComputedStyle(element)
        });
        
        // Set current text content
        setElementText(element.textContent || "");
        
        setSelectMode(false);
      };

      const handleHover = (e) => {
        if (e.target.closest('.design-editor-panel')) return;
        
        // Skip SVG elements
        if (e.target instanceof SVGElement || e.target.tagName === 'svg' || e.target.tagName === 'path') {
          return;
        }
        
        setHoveredElement(e.target);
      };

      const handleHoverOut = () => {
        setHoveredElement(null);
      };

      document.addEventListener('click', handleClick, true);
      document.addEventListener('mouseover', handleHover);
      document.addEventListener('mouseout', handleHoverOut);

      return () => {
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('mouseover', handleHover);
        document.removeEventListener('mouseout', handleHoverOut);
      };
    }
  }, [selectMode]);

  useEffect(() => {
    if (hoveredElement && selectMode) {
      hoveredElement.style.outline = '3px solid #8B5CF6';
      hoveredElement.style.outlineOffset = '2px';
    }
    
    return () => {
      if (hoveredElement) {
        hoveredElement.style.outline = '';
        hoveredElement.style.outlineOffset = '';
      }
    };
  }, [hoveredElement, selectMode]);

  const handleColorChange = (key, value) => {
    const newTheme = {
      ...theme,
      colors: {
        ...theme.colors,
        [key]: value
      }
    };
    setTheme(newTheme);
    
    // Save immediately to localStorage
    try {
      localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
      console.log("✅ Saved color change to localStorage");
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleButtonColorChange = (key, value) => {
    const newTheme = {
      ...theme,
      buttons: {
        ...theme.buttons,
        [key]: value
      }
    };
    setTheme(newTheme);
    
    // Save immediately
    try {
      localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
      console.log("✅ Saved button change to localStorage");
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleTypographyChange = (key, value) => {
    const newTheme = {
      ...theme,
      typography: {
        ...theme.typography,
        [key]: value
      }
    };
    setTheme(newTheme);
    
    try {
      localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleSpacingChange = (key, value) => {
    const newTheme = {
      ...theme,
      spacing: {
        ...theme.spacing,
        [key]: value
      }
    };
    setTheme(newTheme);
    
    try {
      localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleBorderChange = (key, value) => {
    const newTheme = {
      ...theme,
      borders: {
        ...theme.borders,
        [key]: value
      }
    };
    setTheme(newTheme);
    
    try {
      localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleComponentChange = (key, value) => {
    const newTheme = {
      ...theme,
      components: {
        ...theme.components,
        [key]: value
      }
    };
    setTheme(newTheme);
    
    try {
      localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const applyToElement = (property, value) => {
    if (selectedElement?.element) {
      selectedElement.element.style[property] = value;
      
      // Save element changes to localStorage
      try {
        const elementChanges = JSON.parse(localStorage.getItem('element_changes') || '{}');
        const elementKey = `${selectedElement.tagName}_${selectedElement.className}`;
        elementChanges[elementKey] = {
          ...(elementChanges[elementKey] || {}),
          [property]: value
        };
        localStorage.setItem('element_changes', JSON.stringify(elementChanges));
        console.log("✅ Saved element change to localStorage");
      } catch (error) {
        console.error("Error saving element change:", error);
      }
    }
  };

  const handleTextChange = () => {
    if (selectedElement?.element) {
      selectedElement.element.textContent = elementText;
      
      // Save text changes
      try {
        const textChanges = JSON.parse(localStorage.getItem('text_changes') || '{}');
        const elementKey = `${selectedElement.tagName}_${selectedElement.className}`;
        textChanges[elementKey] = elementText;
        localStorage.setItem('text_changes', JSON.stringify(textChanges));
        console.log("✅ Saved text change to localStorage");
      } catch (error) {
        console.error("Error saving text change:", error);
      }
    }
  };

  const applyAnimation = (animationType) => {
    if (!selectedElement?.element) return;
    
    const element = selectedElement.element;
    
    // Remove previous animation classes
    element.classList.remove('animate-pulse', 'animate-bounce', 'animate-spin', 'hover:scale-105', 'hover:scale-110', 'hover:shadow-lg', 'hover:shadow-xl', 'transition-all', 'duration-300', 'duration-500');
    
    switch(animationType) {
      case 'pulse':
        element.classList.add('animate-pulse');
        break;
      case 'bounce':
        element.classList.add('animate-bounce');
        break;
      case 'hover-scale-sm':
        element.classList.add('hover:scale-105', 'transition-all', 'duration-300');
        break;
      case 'hover-scale-md':
        element.classList.add('hover:scale-110', 'transition-all', 'duration-300');
        break;
      case 'hover-shadow':
        element.classList.add('hover:shadow-lg', 'transition-all', 'duration-300');
        break;
      case 'hover-shadow-xl':
        element.classList.add('hover:shadow-xl', 'transition-all', 'duration-500');
        break;
      case 'fade-in':
        element.style.animation = 'fadeIn 0.5s ease-in';
        break;
      case 'slide-in':
        element.style.animation = 'slideIn 0.5s ease-out';
        break;
      case 'none':
      default:
        element.style.animation = '';
        break;
    }
    
    setSelectedAnimation(animationType);
    
    // Save animation
    try {
      const animationChanges = JSON.parse(localStorage.getItem('animation_changes') || '{}');
      const elementKey = `${selectedElement.tagName}_${selectedElement.className}`;
      animationChanges[elementKey] = animationType;
      localStorage.setItem('animation_changes', JSON.stringify(animationChanges));
      console.log("✅ Saved animation to localStorage");
    } catch (error) {
      console.error("Error saving animation:", error);
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.ThemeSettings.create({
        theme_name: themeName,
        is_active: true,
        ...theme
      });
      
      // Also save to localStorage as backup
      localStorage.setItem('app_theme_custom', JSON.stringify(theme));
      
      alert("העיצוב נשמר בהצלחה! ✨");
      onClose();
    } catch (error) {
      console.error("Error saving theme:", error);
      alert("שגיאה בשמירת העיצוב");
    }
  };

  const tabs = [
    { id: "colors", label: "צבעים", icon: Palette },
    { id: "buttons", label: "כפתורים", icon: Zap },
    { id: "typography", label: "טקסט", icon: Type },
    { id: "layout", label: "מרווחים", icon: Layout },
    { id: "elements", label: "אלמנטים", icon: MousePointer },
    { id: "animations", label: "אנימציות", icon: Wand2 }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />

          {/* Editor Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="design-editor-panel fixed right-0 top-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-6 h-6" />
                <h2 className="text-lg font-bold">עורך עיצוב מתקדם</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Select Mode Button */}
            <div className="bg-purple-50 border-b p-3">
              <Button
                onClick={() => setSelectMode(!selectMode)}
                className={`w-full ${selectMode ? 'bg-purple-600' : 'bg-gray-600'} text-white hover:opacity-90`}
              >
                <MousePointer className="w-4 h-4 mr-2" />
                {selectMode ? '🎯 לחץ על אלמנט לעריכה' : 'בחר אלמנט בעמוד'}
              </Button>
              
              {selectedElement && (
                <div className="mt-2 p-2 bg-white rounded text-xs">
                  <span className="font-bold">נבחר: </span>
                  <span>{selectedElement.tagName}</span>
                  {selectedElement.textContent && (
                    <div className="text-gray-600 mt-1">"{selectedElement.textContent}"</div>
                  )}
                </div>
              )}
              
              {selectMode && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  💡 טיפ: לחץ על כפתורים, טקסטים או תיבות (לא על אייקונים)
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-gray-50 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-white text-purple-600 border-b-2 border-purple-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === "colors" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">צבעי האפליקציה</h3>
                  
                  {Object.entries(theme.colors).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-12 h-10 rounded border-2 border-gray-200 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={value}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-24 h-10 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "buttons" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">עיצוב כפתורים</h3>
                  
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">צבע רקע ראשי</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={theme.buttons?.primary_bg || "#3B82F6"}
                        onChange={(e) => handleButtonColorChange("primary_bg", e.target.value)}
                        className="w-12 h-10 rounded border-2"
                      />
                      <Input
                        value={theme.buttons?.primary_bg || "#3B82F6"}
                        onChange={(e) => handleButtonColorChange("primary_bg", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">צבע טקסט ראשי</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={theme.buttons?.primary_text || "#FFFFFF"}
                        onChange={(e) => handleButtonColorChange("primary_text", e.target.value)}
                        className="w-12 h-10 rounded border-2"
                      />
                      <Input
                        value={theme.buttons?.primary_text || "#FFFFFF"}
                        onChange={(e) => handleButtonColorChange("primary_text", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">צבע Hover</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={theme.buttons?.primary_hover || "#2563EB"}
                        onChange={(e) => handleButtonColorChange("primary_hover", e.target.value)}
                        className="w-12 h-10 rounded border-2"
                      />
                      <Input
                        value={theme.buttons?.primary_hover || "#2563EB"}
                        onChange={(e) => handleButtonColorChange("primary_hover", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">עיגול פינות</Label>
                    <Input
                      value={theme.buttons?.border_radius || "0.5rem"}
                      onChange={(e) => handleButtonColorChange("border_radius", e.target.value)}
                      placeholder="0.5rem"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">גודל פונט</Label>
                    <Input
                      value={theme.buttons?.font_size || "1rem"}
                      onChange={(e) => handleButtonColorChange("font_size", e.target.value)}
                      placeholder="1rem"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">משקל פונט</Label>
                    <Select
                      value={theme.buttons?.font_weight || "600"}
                      onValueChange={(value) => handleButtonColorChange("font_weight", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">רגיל (400)</SelectItem>
                        <SelectItem value="500">בינוני (500)</SelectItem>
                        <SelectItem value="600">Semi-Bold (600)</SelectItem>
                        <SelectItem value="700">Bold (700)</SelectItem>
                        <SelectItem value="800">Extra-Bold (800)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Padding</Label>
                    <Input
                      value={theme.buttons?.padding || "0.75rem 1.5rem"}
                      onChange={(e) => handleButtonColorChange("padding", e.target.value)}
                      placeholder="0.75rem 1.5rem"
                    />
                  </div>
                </div>
              )}

              {activeTab === "typography" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">טיפוגרפיה</h3>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      משפחת גופן
                    </label>
                    <Select
                      value={theme.typography.font_family}
                      onValueChange={(value) => handleTypographyChange("font_family", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system-ui">System UI</SelectItem>
                        <SelectItem value="Heebo">Heebo</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Rubik">Rubik</SelectItem>
                        <SelectItem value="Assistant">Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      גודל כותרות
                    </label>
                    <Input
                      type="text"
                      value={theme.typography.heading_size}
                      onChange={(e) => handleTypographyChange("heading_size", e.target.value)}
                      placeholder="2rem"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      גודל טקסט רגיל
                    </label>
                    <Input
                      type="text"
                      value={theme.typography.body_size}
                      onChange={(e) => handleTypographyChange("body_size", e.target.value)}
                      placeholder="1rem"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      גודל טקסט קטן
                    </label>
                    <Input
                      type="text"
                      value={theme.typography.small_size}
                      onChange={(e) => handleTypographyChange("small_size", e.target.value)}
                      placeholder="0.875rem"
                    />
                  </div>
                </div>
              )}

              {activeTab === "layout" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">מרווחים ועיגולים</h3>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      ריפוד תיבות
                    </label>
                    <Input
                      type="text"
                      value={theme.spacing.card_padding}
                      onChange={(e) => handleSpacingChange("card_padding", e.target.value)}
                      placeholder="1.5rem"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      רווח בין תיבות
                    </label>
                    <Input
                      type="text"
                      value={theme.spacing.section_gap}
                      onChange={(e) => handleSpacingChange("section_gap", e.target.value)}
                      placeholder="1.5rem"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      עיגול קטן
                    </label>
                    <Input
                      type="text"
                      value={theme.borders.radius_small}
                      onChange={(e) => handleBorderChange("radius_small", e.target.value)}
                      placeholder="0.5rem"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      עיגול בינוני
                    </label>
                    <Input
                      type="text"
                      value={theme.borders.radius_medium}
                      onChange={(e) => handleBorderChange("radius_medium", e.target.value)}
                      placeholder="1rem"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      עיגול גדול
                    </label>
                    <Input
                      type="text"
                      value={theme.borders.radius_large}
                      onChange={(e) => handleBorderChange("radius_large", e.target.value)}
                      placeholder="1.5rem"
                    />
                  </div>
                </div>
              )}

              {activeTab === "elements" && selectedElement && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">עריכת אלמנט נבחר</h3>
                  
                  <div className="bg-purple-50 p-3 rounded-lg text-sm">
                    <span className="font-bold">{selectedElement.tagName}</span>
                    {selectedElement.textContent && (
                      <p className="text-gray-600 mt-1">"{selectedElement.textContent}"</p>
                    )}
                  </div>

                  {/* Text Content Editor */}
                  {(selectedElement.isButton || selectedElement.isText) && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">טקסט</Label>
                      <Textarea
                        value={elementText}
                        onChange={(e) => setElementText(e.target.value)}
                        className="min-h-[80px]"
                        placeholder="הכנס טקסט חדש..."
                      />
                      <Button
                        onClick={handleTextChange}
                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        החל שינוי טקסט
                      </Button>
                    </div>
                  )}

                  {selectedElement.isButton && (
                    <>
                      <div>
                        <Label>צבע רקע</Label>
                        <input
                          type="color"
                          defaultValue={selectedElement.computedStyle.backgroundColor}
                          onChange={(e) => applyToElement('backgroundColor', e.target.value)}
                          className="w-full h-10 rounded border-2 cursor-pointer"
                        />
                      </div>

                      <div>
                        <Label>צבע טקסט</Label>
                        <input
                          type="color"
                          defaultValue={selectedElement.computedStyle.color}
                          onChange={(e) => applyToElement('color', e.target.value)}
                          className="w-full h-10 rounded border-2 cursor-pointer"
                        />
                      </div>

                      <div>
                        <Label>עיגול פינות (px)</Label>
                        <Input
                          type="number"
                          defaultValue={parseInt(selectedElement.computedStyle.borderRadius)}
                          onChange={(e) => applyToElement('borderRadius', e.target.value + 'px')}
                        />
                      </div>

                      <div>
                        <Label>גודל פונט (px)</Label>
                        <Input
                          type="number"
                          defaultValue={parseInt(selectedElement.computedStyle.fontSize)}
                          onChange={(e) => applyToElement('fontSize', e.target.value + 'px')}
                        />
                      </div>
                    </>
                  )}

                  {selectedElement.isText && (
                    <>
                      <div>
                        <Label>צבע טקסט</Label>
                        <input
                          type="color"
                          defaultValue={selectedElement.computedStyle.color}
                          onChange={(e) => applyToElement('color', e.target.value)}
                          className="w-full h-10 rounded border-2 cursor-pointer"
                        />
                      </div>

                      <div>
                        <Label>גודל פונט (px)</Label>
                        <Input
                          type="number"
                          defaultValue={parseInt(selectedElement.computedStyle.fontSize)}
                          onChange={(e) => applyToElement('fontSize', e.target.value + 'px')}
                        />
                      </div>

                      <div>
                        <Label>משקל פונט</Label>
                        <Select
                          defaultValue={selectedElement.computedStyle.fontWeight}
                          onValueChange={(value) => applyToElement('fontWeight', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="400">רגיל</SelectItem>
                            <SelectItem value="500">בינוני</SelectItem>
                            <SelectItem value="600">Semi-Bold</SelectItem>
                            <SelectItem value="700">Bold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {selectedElement.isBox && (
                    <>
                      <div>
                        <Label>צבע רקע</Label>
                        <input
                          type="color"
                          defaultValue={selectedElement.computedStyle.backgroundColor}
                          onChange={(e) => applyToElement('backgroundColor', e.target.value)}
                          className="w-full h-10 rounded border-2 cursor-pointer"
                        />
                      </div>

                      <div>
                        <Label>עיגול פינות (px)</Label>
                        <Input
                          type="number"
                          defaultValue={parseInt(selectedElement.computedStyle.borderRadius)}
                          onChange={(e) => applyToElement('borderRadius', e.target.value + 'px')}
                        />
                      </div>

                      <div>
                        <Label>Padding (px)</Label>
                        <Input
                          type="number"
                          defaultValue={parseInt(selectedElement.computedStyle.padding)}
                          onChange={(e) => applyToElement('padding', e.target.value + 'px')}
                        />
                      </div>

                      <div>
                        <Label>צל</Label>
                        <Select
                          onValueChange={(value) => applyToElement('boxShadow', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר צל" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">ללא צל</SelectItem>
                            <SelectItem value="0 1px 3px rgba(0,0,0,0.1)">קטן</SelectItem>
                            <SelectItem value="0 4px 6px rgba(0,0,0,0.1)">בינוני</SelectItem>
                            <SelectItem value="0 10px 15px rgba(0,0,0,0.1)">גדול</SelectItem>
                            <SelectItem value="0 20px 25px rgba(0,0,0,0.15)">ענק</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => setSelectedElement(null)}
                    variant="outline"
                    className="w-full"
                  >
                    בטל בחירה
                  </Button>
                </div>
              )}

              {activeTab === "elements" && !selectedElement && (
                <div className="text-center py-12 text-gray-500">
                  <MousePointer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>לחץ על "בחר אלמנט בעמוד"</p>
                  <p className="text-sm">ואז בחר כפתור, טקסט או תיבה לעריכה</p>
                </div>
              )}

              {activeTab === "animations" && selectedElement && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">אנימציות לאלמנט</h3>
                  
                  <div className="bg-purple-50 p-3 rounded-lg text-sm">
                    <span className="font-bold">{selectedElement.tagName}</span>
                    {selectedElement.textContent && (
                      <p className="text-gray-600 mt-1">"{selectedElement.textContent}"</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">בחר אנימציה</Label>
                    <Select value={selectedAnimation} onValueChange={applyAnimation}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר אנימציה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא אנימציה</SelectItem>
                        <SelectItem value="pulse">דופק (Pulse)</SelectItem>
                        <SelectItem value="bounce">קפיצה (Bounce)</SelectItem>
                        <SelectItem value="hover-scale-sm">הגדלה קלה בהובר</SelectItem>
                        <SelectItem value="hover-scale-md">הגדלה בינונית בהובר</SelectItem>
                        <SelectItem value="hover-shadow">צל בהובר</SelectItem>
                        <SelectItem value="hover-shadow-xl">צל גדול בהובר</SelectItem>
                        <SelectItem value="fade-in">דהייה פנימה</SelectItem>
                        <SelectItem value="slide-in">החלקה פנימה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 טיפים:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• אנימציות Hover עובדות כשעוברים עם העכבר</li>
                      <li>• אנימציות Pulse ו-Bounce פועלות כל הזמן</li>
                      <li>• Fade-in ו-Slide-in פועלות פעם אחת</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => setSelectedElement(null)}
                    variant="outline"
                    className="w-full"
                  >
                    בטל בחירה
                  </Button>
                </div>
              )}

              {activeTab === "animations" && !selectedElement && (
                <div className="text-center py-12 text-gray-500">
                  <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>לחץ על "בחר אלמנט בעמוד"</p>
                  <p className="text-sm">ואז בחר אלמנט להוספת אנימציה</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 space-y-3">
              <Input
                placeholder="שם העיצוב..."
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                className="h-12"
              />
              <Button
                onClick={handleSave}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                שמור עיצוב
              </Button>
            </div>
          </motion.div>

          {/* Add CSS animations */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
