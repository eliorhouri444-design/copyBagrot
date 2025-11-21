import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Upload, ChevronLeft, Loader2, FileText, CheckCircle, Eye, Wand2, TrendingUp, X, Sparkles, RefreshCw, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminExamStructurePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [scanData, setScanData] = useState({
    subject: "מתמטיקה",
    unitLevel: 4,
    moduleId: "035482",
    examYear: 2020,
    examSeason: "קיץ"
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanning, setCurrentScanning] = useState(null);
  const [completedScans, setCompletedScans] = useState([]);
  const [showStructureDetails, setShowStructureDetails] = useState(null);
  const [editingStructure, setEditingStructure] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const subjectsStructure = {
    "מתמטיקה": {
      units: [3, 4, 5],
      modules: {
        3: [{ id: "801", name: "שאלון 801" }, { id: "802", name: "שאלון 802" }],
        4: [
          { id: "803", name: "שאלון 803" }, 
          { id: "804", name: "שאלון 804" }, 
          { id: "035482", name: "שאלון 035482" }
        ],
        5: [{ id: "805", name: "שאלון 805" }, { id: "806", name: "שאלון 806" }, { id: "807", name: "שאלון 807" }]
      }
    },
    "אנגלית": {
      units: [3, 4, 5],
      modules: {
        3: [{ id: "A", name: "מודול A" }, { id: "B", name: "מודול B" }, { id: "C", name: "מודול C" }],
        4: [{ id: "C", name: "שאלון C" }, { id: "D", name: "שאלון D" }, { id: "E", name: "שאלון E" }],
        5: [{ id: "E", name: "שאלון E" }, { id: "F", name: "שאלון F" }, { id: "G", name: "שאלון G" }]
      }
    },
    "פיזיקה": {
      units: [3, 4, 5],
      modules: {
        3: [{ id: "035203", name: "שאלון 035203" }],
        4: [{ id: "035204", name: "שאלון 035204" }],
        5: [{ id: "035201", name: "שאלון 035201 - מכניקה" }, { id: "035202", name: "שאלון 035202 - חשמל" }]
      }
    },
    "כימיה": {
      units: [3, 4, 5],
      modules: {
        3: [{ id: "041203", name: "שאלון 041203" }],
        4: [{ id: "041204", name: "שאלון 041204" }],
        5: [{ id: "041201", name: "שאלון 041201 - אורגנית" }, { id: "041202", name: "שאלון 041202 - כללית" }]
      }
    },
    "ביולוגיה": {
      units: [3, 4, 5],
      modules: {
        3: [{ id: "046203", name: "שאלון 046203" }],
        4: [{ id: "046204", name: "שאלון 046204" }],
        5: [{ id: "046201", name: "שאלון 046201 - תא" }, { id: "046202", name: "שאלון 046202 - פיזיולוגיה" }]
      }
    },
    "היסטוריה": {
      units: [2],
      modules: {
        2: [{ id: "H1", name: "היסטוריה כללית" }, { id: "H2", name: "היסטוריה של עם ישראל" }]
      }
    },
    "אזרחות": {
      units: [2],
      modules: {
        2: [{ id: "CIV1", name: "אזרחות - מבנה א'" }, { id: "CIV2", name: "אזרחות - מבנה ב'" }]
      }
    },
    "ספרות": {
      units: [2],
      modules: {
        2: [{ id: "L1", name: "ספרות עברית" }, { id: "L2", name: "ספרות עולם" }]
      }
    },
    "תנ\"ך": {
      units: [2],
      modules: {
        2: [{ id: "BIBLE1", name: "תנ\"ך - תורה" }, { id: "BIBLE2", name: "תנ\"ך - נביאים וכתובים" }]
      }
    },
    "גאוגרפיה": {
      units: [2],
      modules: {
        2: [{ id: "G1", name: "גאוגרפיה של ישראל" }, { id: "G2", name: "גאוגרפיה עולמית" }]
      }
    },
    "מדעי המחשב": {
      units: [3, 5],
      modules: {
        3: [{ id: "CS3", name: "מדעי מחשב 3 יח'" }],
        5: [{ id: "CS5", name: "מדעי מחשב 5 יח'" }]
      }
    },
    "תלמוד": {
      units: [2],
      modules: {
        2: [{ id: "TALMUD1", name: "תלמוד - מסכת א'" }, { id: "TALMUD2", name: "תלמוד - מסכת ב'" }]
      }
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: examStructures = [], refetch, isLoading } = useQuery({
    queryKey: ['exam-structures'],
    queryFn: async () => {
      console.log('🔄 Fetching exam structures...');
      const data = await base44.entities.ExamStructure.list("-created_date", 500);
      console.log(`✅ Fetching ${data.length} structures`);
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const handleFilesSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const uploaded = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        toast.info(`📤 מעלה ${i + 1}/${files.length}: ${file.name}...`);
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ name: file.name, url: file_url });
        
        console.log(`✅ Uploaded: ${file.name} → ${file_url}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setUploadedFiles(uploaded);
      toast.success(`✅ ${uploaded.length} קבצים הועלו!`);
    } catch (error) {
      toast.error('שגיאה בהעלאה');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScanAll = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("נא להעלות קבצים תחילה");
      return;
    }

    console.log('🚀 Starting scan of', uploadedFiles.length, 'files');
    console.log('📋 Scan config:', scanData);

    setIsScanning(true);
    setCompletedScans([]);
    
    let currentCompletedScans = [];
    let successfulScans = 0;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      setCurrentScanning({ index: i + 1, total: uploadedFiles.length, file });
      
      try {
        console.log(`📄 Scanning file ${i + 1}/${uploadedFiles.length}: ${file.name}`);
        toast.loading(`📄 סורק ${i + 1}/${uploadedFiles.length}: ${file.name}...`, { id: 'scan-progress' });

        const result = await base44.functions.invoke('scanExamSimple', {
          fileUrl: file.url,
          subject: scanData.subject,
          unitLevel: scanData.unitLevel,
          moduleId: scanData.moduleId,
          examYear: scanData.examYear,
          examSeason: scanData.examSeason
        });

        console.log('📥 Scan response:', result.data);

        if (result.data?.success) {
          currentCompletedScans.push({
            file: file.name,
            success: true,
            message: result.data.message,
            structure: result.data.structure
          });
          successfulScans++;
          
          console.log(`✅ Success! Structure ID: ${result.data.structure?.id}`);
          toast.success(`✅ ${file.name} - ${result.data.message}`, { id: 'scan-progress' });
          
          // רענון מיידי
          console.log('🔄 Refreshing structures list...');
          await queryClient.invalidateQueries(['exam-structures']);
          await refetch();
          console.log('✅ Refresh complete!');
          
        } else {
          const errorMsg = result.data?.error || 'שגיאה לא ידועה';
          console.error(`❌ Scan failed: ${errorMsg}`);
          
          currentCompletedScans.push({
            file: file.name,
            success: false,
            error: errorMsg
          });
          toast.error(`❌ ${file.name}: ${errorMsg}`, { id: 'scan-progress' });
        }
      } catch (error) {
        console.error("❌ Scan error:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
        
        currentCompletedScans.push({
          file: file.name,
          success: false,
          error: error.message || 'שגיאת רשת'
        });
        toast.error(`❌ ${file.name}: ${error.message}`, { id: 'scan-progress' });
      }
      
      setCompletedScans([...currentCompletedScans]);
      
      // המתנה בין סריקות
      if (i < uploadedFiles.length - 1) {
        console.log('⏳ Waiting 2 seconds before next scan...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`🎉 Scan complete! ${successfulScans}/${uploadedFiles.length} successful`);
    
    setIsScanning(false);
    setCurrentScanning(null);
    
    toast.success(`🎉 הושלם! ${successfulScans}/${uploadedFiles.length} מבחנים נסרקו`, { id: 'scan-progress' });
    
    // רענון סופי
    console.log('🔄 Final refresh...');
    await queryClient.invalidateQueries(['exam-structures']);
    await refetch();
    
    // ניקוי
    setTimeout(() => {
      console.log('🧹 Clearing uploaded files list');
      setUploadedFiles([]);
      setCompletedScans([]);
    }, 5000);
  };

  const handleEditStructure = (structure) => {
    console.log('✏️ Opening edit for structure:', structure.id);
    setEditingStructure({
      id: structure.id,
      subject: structure.subject,
      unit_level: structure.unit_level,
      module_id: structure.module_id,
      exam_year: structure.exam_year,
      exam_season: structure.exam_season,
      structure_name: structure.structure_name
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStructure?.id) return;

    try {
      console.log('💾 Saving edits:', editingStructure);
      toast.loading('שומר שינויים...', { id: 'edit' });

      const newStructureName = `${editingStructure.subject} ${editingStructure.unit_level}יח' שאלון ${editingStructure.module_id} - ${editingStructure.exam_year} ${editingStructure.exam_season}`;

      await base44.entities.ExamStructure.update(editingStructure.id, {
        module_id: editingStructure.module_id,
        exam_year: editingStructure.exam_year,
        exam_season: editingStructure.exam_season,
        structure_name: newStructureName,
        metadata: {
          last_edited: new Date().toISOString(),
          edited_by: user.email
        }
      });

      await queryClient.invalidateQueries(['exam-structures']);
      await refetch();

      setShowEditDialog(false);
      setEditingStructure(null);
      toast.success('✅ המבנה עודכן!', { id: 'edit' });
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('שגיאה בשמירה', { id: 'edit' });
    }
  };

  const handleDeleteStructure = async (structureId, structureName) => {
    if (!confirm(`האם למחוק את "${structureName}"?`)) return;

    try {
      console.log('🗑️ Deleting structure:', structureId);
      toast.loading('מוחק...', { id: 'delete' });

      await base44.entities.ExamStructure.delete(structureId);
      
      await queryClient.invalidateQueries(['exam-structures']);
      await refetch();
      
      toast.success('✅ נמחק!', { id: 'delete' });
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast.error('שגיאה במחיקה', { id: 'delete' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const availableUnits = subjectsStructure[scanData.subject]?.units || [];
  const availableModules = subjectsStructure[scanData.subject]?.modules?.[scanData.unitLevel] || [];

  const structuresByModule = examStructures.reduce((acc, s) => {
    const key = `${s.subject} ${s.unit_level}יח' ${s.module_id}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const readyForGeneration = Object.entries(structuresByModule).filter(([_, count]) => count >= 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">📊 סריקת מבחנים</h1>
          <p className="text-sm opacity-90">למידת מבנה ליצירה עתידית</p>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-6 text-white text-center">
            <Wand2 className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">מוכן ליצור מבחנים?</h3>
            <p className="text-sm opacity-90 mb-4">
              אחרי שסרקת לפחות 3 מבחנים באותו מודול
            </p>
            <Button
              onClick={() => navigate(createPageUrl("AdminExamGenerator"))}
              className="bg-white text-purple-600 hover:bg-gray-100 font-bold h-12"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              לך ליוצר המבחנים
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold">סטטיסטיקות</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('🔄 Manual refresh triggered');
                await queryClient.invalidateQueries(['exam-structures']);
                await refetch();
                toast.success('רענון הושלם!');
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              רענן
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center border-2 border-blue-200">
              <div className="text-2xl font-black text-blue-600">{examStructures.length}</div>
              <div className="text-xs text-gray-600">מבנים נסרקו</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border-2 border-green-200">
              <div className="text-2xl font-black text-green-600">{readyForGeneration.length}</div>
              <div className="text-xs text-gray-600">מוכנים ליצירה</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center border-2 border-purple-200">
              <div className="text-2xl font-black text-purple-600">
                {examStructures.reduce((sum, s) => sum + (s.generated_exams_count || 0), 0)}
              </div>
              <div className="text-xs text-gray-600">מבחנים נוצרו</div>
            </div>
          </div>

          {readyForGeneration.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
              <div className="text-sm font-bold text-green-900 mb-2">✅ מוכנים ליצירת מבחנים:</div>
              <div className="space-y-1">
                {readyForGeneration.map(([key, count]) => (
                  <div key={key} className="text-xs text-gray-700">
                    • {key} - {count} מבחנים נסרקו
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">העלאת מבחנים</h2>
          </div>

          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFilesSelect}
            className="mb-3"
            multiple
          />

          {isUploading && (
            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">מעלה קבצים...</span>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-sm text-gray-700">
                📁 {uploadedFiles.length} קבצים מוכנים לסריקה:
              </div>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="bg-green-50 border-2 border-green-200 rounded-lg p-2 flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="flex-1 truncate font-semibold text-green-900">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Config */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">הגדרות סריקה</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">מקצוע</label>
              <Select 
                value={scanData.subject} 
                onValueChange={(v) => {
                  const firstUnit = subjectsStructure[v].units[0];
                  const firstModule = subjectsStructure[v].modules[firstUnit][0].id;
                  setScanData({
                    ...scanData, 
                    subject: v, 
                    unitLevel: firstUnit,
                    moduleId: firstModule
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {Object.keys(subjectsStructure).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">יחידות</label>
              <Select 
                value={scanData.unitLevel.toString()} 
                onValueChange={(v) => {
                  const newUnit = parseInt(v);
                  const firstModule = subjectsStructure[scanData.subject].modules[newUnit][0].id;
                  setScanData({
                    ...scanData, 
                    unitLevel: newUnit,
                    moduleId: firstModule
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {availableUnits.map(u => <SelectItem key={u} value={u.toString()}>{u === 0 ? 'ללא' : u + ' יח׳'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">שאלון</label>
              <Select value={scanData.moduleId} onValueChange={(v) => setScanData({...scanData, moduleId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {availableModules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">שנה</label>
              <Input
                type="number"
                value={scanData.examYear}
                onChange={(e) => setScanData({...scanData, examYear: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <Button
            onClick={handleScanAll}
            disabled={uploadedFiles.length === 0 || isScanning}
            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-14 font-bold text-lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                סורק {currentScanning?.index}/{currentScanning?.total}...
              </>
            ) : (
              <>
                <FileText className="w-6 h-6 mr-2" />
                סרוק את כל הקבצים ({uploadedFiles.length})
              </>
            )}
          </Button>

          {/* Progress */}
          {completedScans.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 space-y-2 max-h-80 overflow-y-auto"
            >
              <div className="font-bold text-sm text-gray-700 mb-2">
                📊 תוצאות סריקה:
              </div>
              {completedScans.map((scan, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`rounded-lg p-3 text-sm ${
                    scan.success
                      ? 'bg-green-50 border-2 border-green-200'
                      : 'bg-red-50 border-2 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {scan.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold truncate flex-1">{scan.file}</span>
                  </div>
                  {scan.success && scan.message && (
                    <div className="text-xs text-green-700 mr-7">{scan.message}</div>
                  )}
                  {scan.success && scan.structure && (
                    <div className="text-xs text-green-600 mr-7 mt-1">
                      ID: {scan.structure.id?.substring(0, 8)}...
                    </div>
                  )}
                  {!scan.success && scan.error && (
                    <div className="text-xs text-red-700 mr-7">{scan.error}</div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Existing Structures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">מבנים שנסרקו ({examStructures.length})</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log('🔄 Manual refresh of structures');
                  await queryClient.invalidateQueries(['exam-structures']);
                  await refetch();
                  toast.success('רענון!');
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">טוען...</p>
            </div>
          ) : examStructures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>עדיין לא נסרקו מבחנים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {examStructures.slice(0, 50).map((structure, idx) => (
                <motion.div
                  key={structure.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-bold mb-1">{structure.structure_name}</div>
                      <div className="text-sm text-gray-600 mb-2 flex flex-wrap gap-2">
                        <span className="bg-blue-100 px-2 py-0.5 rounded">📝 {structure.total_questions} שאלות</span>
                        <span className="bg-green-100 px-2 py-0.5 rounded">💯 {structure.total_points} נק'</span>
                        <span className="bg-purple-100 px-2 py-0.5 rounded">⏱️ {structure.duration_minutes}′</span>
                        {structure.total_pages && (
                          <span className="bg-orange-100 px-2 py-0.5 rounded">📄 {structure.total_pages} דפים</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {structure.id?.substring(0, 12)}...
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowStructureDetails(structure)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      פרטים
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditStructure(structure)}
                      className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      ערוך
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteStructure(structure.id, structure.structure_name)}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              
              {examStructures.length > 50 && (
                <div className="text-center text-sm text-gray-600 py-2 bg-gray-50 rounded-lg">
                  ועוד {examStructures.length - 50} מבנים נוספים...
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!showStructureDetails} onOpenChange={() => setShowStructureDetails(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showStructureDetails?.structure_name}</DialogTitle>
          </DialogHeader>

          {showStructureDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded p-3 text-center">
                  <div className="text-xs text-gray-600">שאלות</div>
                  <div className="font-bold">{showStructureDetails.total_questions}</div>
                </div>
                <div className="bg-green-50 rounded p-3 text-center">
                  <div className="text-xs text-gray-600">נקודות</div>
                  <div className="font-bold">{showStructureDetails.total_points}</div>
                </div>
                <div className="bg-purple-50 rounded p-3 text-center">
                  <div className="text-xs text-gray-600">דפים</div>
                  <div className="font-bold">{showStructureDetails.total_pages || 'לא ידוע'}</div>
                </div>
              </div>

              {showStructureDetails.sections?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="font-bold mb-2">📚 חלקים:</div>
                  <div className="space-y-1">
                    {showStructureDetails.sections.map((section, i) => (
                      <div key={i} className="text-sm">
                        {section.section_name} - {section.points} נק' (שאלות {section.question_range})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showStructureDetails.topic_distribution && (
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="font-bold mb-2">📊 התפלגות נושאים:</div>
                  <div className="space-y-1">
                    {Object.entries(showStructureDetails.topic_distribution).map(([topic, data]) => (
                      <div key={topic} className="text-sm flex justify-between">
                        <span>{topic}</span>
                        <span className="font-semibold">{data.count} שאלות • {data.points} נקודות</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {showStructureDetails.question_structure?.map((q, i) => (
                  <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                    <div className="font-bold">שאלה {q.question_number}</div>
                    <div className="text-gray-600">{q.topic} • {q.difficulty_level} • {q.points} נקודות</div>
                    {q.has_diagram && (
                      <div className="text-xs text-purple-600 mt-1">🎨 כולל איור</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowStructureDetails(null)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>✏️ עריכת מבנה מבחן</DialogTitle>
          </DialogHeader>

          {editingStructure && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="text-sm font-bold text-blue-900 mb-1">מזהה מבנה:</div>
                <div className="text-xs text-gray-600 font-mono">{editingStructure.id}</div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                <div className="text-sm font-bold text-purple-900 mb-2">📌 מידע קבוע:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">מקצוע:</span>
                    <span className="font-bold">{editingStructure.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">יחידות:</span>
                    <span className="font-bold">{editingStructure.unit_level}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">שאלון (מודול)</label>
                <Select 
                  value={editingStructure.module_id} 
                  onValueChange={(v) => setEditingStructure({...editingStructure, module_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {(subjectsStructure[editingStructure.subject]?.modules?.[editingStructure.unit_level] || []).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">שנה</label>
                <Input
                  type="number"
                  value={editingStructure.exam_year}
                  onChange={(e) => setEditingStructure({...editingStructure, exam_year: parseInt(e.target.value)})}
                  placeholder="2020"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">מועד</label>
                <Select 
                  value={editingStructure.exam_season} 
                  onValueChange={(v) => setEditingStructure({...editingStructure, exam_season: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="קיץ">קיץ</SelectItem>
                    <SelectItem value="חורף">חורף</SelectItem>
                    <SelectItem value="מיוחד">מיוחד</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <div className="text-sm font-bold text-green-900 mb-1">שם חדש:</div>
                <div className="text-sm text-gray-700">
                  {editingStructure.subject} {editingStructure.unit_level}יח' שאלון {editingStructure.module_id} - {editingStructure.exam_year} {editingStructure.exam_season}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleSaveEdit}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}