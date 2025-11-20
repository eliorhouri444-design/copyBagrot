import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Trash2, FileText, Upload, Settings, BookOpen, Search, Filter, Edit, Eye, Wand2 } from "lucide-react"; // Added Edit, Eye, Wand2 icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion"; // Added motion import

// Removed Dialog imports as they are no longer needed
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogDescription,
// } from "@/components/ui/dialog";

export default function AdminExamsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [selectedModule, setSelectedModule] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Removed editingExam and showEditDialog as they are no longer used for inline editing
  // const [editingExam, setEditingExam] = useState(null);
  // const [showEditDialog, setShowEditDialog] = useState(false);

  const [cachedData, setCachedData] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        subject: localStorage.getItem('selected_subject') || 'אנגלית',
        units: localStorage.getItem('selected_units') || '3',
      };
    }
    return { subject: 'אנגלית', units: '3' };
  });

  const displaySubject = user?.selected_subject || cachedData.subject || 'אנגלית';
  const displayUnits = parseInt(user?.selected_units || cachedData.units || 3);

  const subjectColors = {
    "אנגלית": "bg-blue-600",
    "מתמטיקה": "bg-purple-600",
    "פיזיקה": "bg-green-600",
    "ספרות": "bg-pink-600",
    "היסטוריה": "bg-amber-600",
    "גאוגרפיה": "bg-cyan-600"
  };

  const headerColor = subjectColors[displaySubject] || "bg-blue-600";

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsUserLoaded(true);
        
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }

        if (currentUser?.selected_subject) {
          localStorage.setItem('selected_subject', currentUser.selected_subject);
        }
        if (currentUser?.selected_units) {
          localStorage.setItem('selected_units', currentUser.selected_units.toString());
        }
        
        setCachedData({
          subject: currentUser?.selected_subject || 'אנגלית',
          units: currentUser?.selected_units || 3,
        });
      } catch (error) {
        console.error("Error loading user:", error);
        setIsUserLoaded(true);
      }
    };
    loadUser();
  }, [navigate]);

  // טעינת מבחנים רק אחרי שה-user נטען
  const { data: allModuleAExams = [] } = useQuery({
    queryKey: ['module-a-exams-admin'],
    queryFn: async () => {
      try {
        return await base44.entities.ModuleAExam.list();
      } catch (error) {
        console.error('Error loading ModuleA exams:', error);
        return [];
      }
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  const { data: allModuleBExams = [] } = useQuery({
    queryKey: ['module-b-exams-admin'],
    queryFn: async () => {
      try {
        return await base44.entities.ModuleBExam.list();
      } catch (error) {
        console.error('Error loading ModuleB exams:', error);
        return [];
      }
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  const { data: allModuleCExams = [] } = useQuery({
    queryKey: ['module-c-exams-admin'],
    queryFn: async () => {
      try {
        return await base44.entities.ModuleCExam.list();
      } catch (error) {
        console.error('Error loading ModuleC exams:', error);
        return [];
      }
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  const { data: allGenericExams = [] } = useQuery({
    queryKey: ['generic-exams-admin'],
    queryFn: async () => {
      try {
        return await base44.entities.GenericExam.list();
      } catch (error) {
        console.error('Error loading Generic exams:', error);
        return [];
      }
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  // איחוד כל המבחנים
  const allExams = [
    ...allModuleAExams.map(examItem => ({ ...examItem, moduleType: 'A', entityName: 'ModuleAExam' })),
    ...allModuleBExams.map(examItem => ({ ...examItem, moduleType: 'B', entityName: 'ModuleBExam' })),
    ...allModuleCExams.map(examItem => ({ ...examItem, moduleType: 'C', entityName: 'ModuleCExam' })),
    ...allGenericExams.map(examItem => ({ ...examItem, moduleType: examItem.module_id, entityName: 'GenericExam' }))
  ];

  // סינון
  const filteredExams = allExams.filter(exam => {
    const matchesSubject = exam.subject === displaySubject;
    const matchesUnits = (exam.unit_level || exam.units) === displayUnits;
    const matchesModule = selectedModule === 'all' || exam.moduleType === selectedModule;
    const matchesSearch = !searchQuery || exam.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSubject && matchesUnits && matchesModule && matchesSearch;
  });

  const handleEditExam = (exam) => {
    console.log("✏️ Opening exam editor for:", exam.title, exam.id);
    
    // Navigate to AdminExamEditor with examId
    navigate(createPageUrl("AdminExamEditor") + `?examId=${exam.id}`);
  };

  const handleViewExam = (exam) => {
    console.log("👁️ Viewing exam:", exam.title, exam.id);
    
    // Navigate based on module type
    if (exam.moduleType === 'A') {
      navigate(createPageUrl("ExamModuleA") + `?examId=${exam.id}`);
    } else if (exam.moduleType === 'B') {
      navigate(createPageUrl("ExamModuleB") + `?examId=${exam.id}`);
    } else if (exam.moduleType === 'C') {
      navigate(createPageUrl("ExamModuleC") + `?examId=${exam.id}`);
    } else if (exam.subject === 'מתמטיקה') {
      navigate(createPageUrl("ExamMath") + `?examId=${exam.id}`);
    } else if (exam.moduleType === '1' || exam.moduleType === '2' || exam.moduleType === '3') { // For generic math exams with module_id 1, 2, 3
      navigate(createPageUrl("ExamMath") + `?examId=${exam.id}`);
    } else if (exam.subject === 'פיזיקה') {
      navigate(createPageUrl("ExamPhysics") + `?examId=${exam.id}`);
    } else if (exam.subject === 'ספרות') {
      navigate(createPageUrl("ExamLiterature") + `?examId=${exam.id}`);
    } else {
      navigate(createPageUrl("ExamGeneric") + `?examId=${exam.id}`);
    }
  };

  // handleSaveEdit is removed as it's no longer used

  const handleDeleteExam = async (exam) => { // Keep exam object for entityName
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המבחן "${exam.title}"?`)) return;

    try {
      let entityApi;
      if (exam.entityName === 'ModuleAExam') {
        entityApi = base44.entities.ModuleAExam;
      } else if (exam.entityName === 'ModuleBExam') {
        entityApi = base44.entities.ModuleBExam;
      } else if (exam.entityName === 'ModuleCExam') {
        entityApi = base44.entities.ModuleCExam;
      } else if (exam.entityName === 'GenericExam') {
        entityApi = base44.entities.GenericExam;
      }

      await entityApi.delete(exam.id);

      queryClient.invalidateQueries(['module-a-exams-admin']);
      queryClient.invalidateQueries(['module-b-exams-admin']);
      queryClient.invalidateQueries(['module-c-exams-admin']);
      queryClient.invalidateQueries(['generic-exams-admin']);

      alert('המבחן נמחק בהצלחה! ✅');
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('שגיאה במחיקת המבחן');
    }
  };

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      {/* Header */}
      <div className={`${headerColor} rounded-b-[2rem] p-6 shadow-xl mb-6`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Exams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <h1 className="text-3xl font-bold text-white mb-2">ניהול מבחני {displaySubject}</h1>
        <p className="text-white/80">{displayUnits} יחידות</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Admin Actions - Add new button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">🛠️ כלי ניהול</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* New: Question Manager */}
            <button
              onClick={() => navigate(createPageUrl("AdminQuestionManager"))}
              className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white text-right hover:shadow-lg transition-all"
            >
              <Plus className="w-6 h-6 mb-2" />
              <div className="text-sm font-bold">הוספת שאלה</div>
              <div className="text-xs opacity-90">שאלה + פתרון</div>
            </button>

            <button
              onClick={() => navigate(createPageUrl("AdminQuestionList"))}
              className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white text-right hover:shadow-lg transition-all"
            >
              <FileText className="w-6 h-6 mb-2" />
              <div className="text-sm font-bold">מאגר שאלות</div>
              <div className="text-xs opacity-90">צפייה ועריכה</div>
            </button>

            <button
              onClick={() => navigate(createPageUrl("AdminBulkImport"))}
              className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white text-right hover:shadow-lg transition-all"
            >
              <Upload className="w-6 h-6 mb-2" />
              <div className="text-sm font-bold">Bulk Import 📥</div>
              <div className="text-xs opacity-90">עד 500 שאלות</div>
            </button>

            {/* Existing Admin panel buttons section */}
            <Button
              onClick={() => navigate(createPageUrl("AdminExamStructure"))}
              className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex flex-col items-center justify-center gap-2"
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm font-bold">סריקת מבחנים</span>
            </Button>

            <Button
              onClick={() => navigate(createPageUrl("AdminExamGenerator"))}
              className="h-24 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white flex flex-col items-center justify-center gap-2"
            >
              <Wand2 className="w-6 h-6" />
              <span className="text-sm font-bold">יוצר מבחנים AI</span>
            </Button>

            <Button
              onClick={() => navigate(createPageUrl("AdminExamEditor"))}
              className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex flex-col items-center justify-center gap-2"
            >
              <Edit className="w-6 h-6" />
              <span className="text-sm font-bold">עורך מבחנים</span>
            </Button>

            {/* New button for AdminPracticeEditor */}
            <Button
              onClick={() => navigate(createPageUrl("AdminPracticeEditor"))}
              className="h-24 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex flex-col items-center justify-center gap-2"
            >
              <Edit className="w-6 h-6" />
              <span className="text-sm font-bold">עריכת תרגולים</span>
            </Button>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 border-2 border-purple-200 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between flex-grow">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">ניהול תרגולים</h3>
                  <p className="text-xs text-gray-600">הוסף תרגילים לפי נושאים</p>
                </div>
              </div>
              <Button
                  onClick={() => navigate(createPageUrl("AdminPractice"))}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-9 text-sm mt-4 w-full"
                >
                  <span>נהל</span>
                  <BookOpen className="w-4 h-4 mr-2" />
                </Button>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border-2 border-indigo-200 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between flex-grow">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">ניהול מודולים</h3>
                  <p className="text-xs text-gray-600">ערוך כותרות ונושאים</p>
                </div>
              </div>
              <Button
                  onClick={() => navigate(createPageUrl("AdminModules"))}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm mt-4 w-full"
                >
                  <span>ערוך</span>
                  <Settings className="w-4 h-4 mr-2" />
                </Button>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4 border-2 border-blue-200 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between flex-grow">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">תכניות לימודים</h3>
                  <p className="text-xs text-gray-600">נושאים לפי מקצוע ויחידה</p>
                </div>
              </div>
              <Button
                  onClick={() => navigate(createPageUrl("AdminCurriculum"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm mt-4 w-full"
                >
                  <span>נהל</span>
                  <BookOpen className="w-4 h-4 mr-2" />
                </Button>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 border-2 border-orange-200 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between flex-grow">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">בנק שאלות</h3>
                  <p className="text-xs text-gray-600">שאלות LaTeX מתקדמות</p>
                </div>
              </div>
              <Button
                  onClick={() => navigate(createPageUrl("AdminQuestionBank"))}
                  className="bg-orange-600 hover:bg-orange-700 text-white h-9 text-sm mt-4 w-full"
                >
                  <span>נהל</span>
                  <FileText className="w-4 h-4 mr-2" />
                </Button>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border-2 border-pink-200 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between flex-grow">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Audio Studio</h3>
                  <p className="text-xs text-gray-600">ניהול קטעי האזנה</p>
                </div>
              </div>
              <Button
                  onClick={() => navigate(createPageUrl("AdminAudioStudio"))}
                  className="bg-pink-600 hover:bg-pink-700 text-white h-9 text-sm mt-4 w-full"
                >
                  <span>נהל</span>
                  <FileText className="w-4 h-4 mr-2" />
                </Button>
            </div>
          </div>
        </motion.div>

        {/* Help Card */}
        <div className="mb-6">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-1">איך עורכים מבחן?</h3>
                <p className="text-sm text-blue-800">
                  לחץ על <strong className="text-green-600">כפתור ירוק "ערוך"</strong> → ייפתח עמוד עריכה ייעודי → ערוך שאלות ותשובות
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="חפש מבחן..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="סנן לפי מודול" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המודולים</SelectItem>
                {displaySubject === 'אנגלית' && (
                  <>
                    <SelectItem value="A">מודול A</SelectItem>
                    <SelectItem value="B">מודול B</SelectItem>
                    <SelectItem value="C">מודול C</SelectItem>
                  </>
                )}
                {displaySubject === 'מתמטיקה' && (
                  <>
                    <SelectItem value="1">חלק 1</SelectItem>
                    <SelectItem value="2">חלק 2</SelectItem>
                    <SelectItem value="3">חלק 3</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Exams List */}
        {filteredExams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">לא נמצאו מבחנים</p>
              <p className="text-gray-400 text-sm">
                {searchQuery ? `אין מבחנים התואמים את החיפוש "${searchQuery}"` : 
                 selectedModule !== 'all' ? `אין מבחנים במודול ${selectedModule}` :
                 `אין מבחנים עבור ${displaySubject} ${displayUnits} יחידות`}
              </p>
              <Button
                onClick={() => navigate(createPageUrl("AdminExamStructure"))}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                <Upload className="w-4 h-4 ml-2" />
                הוסף מבחן חדש
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam, idx) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all flex flex-col"
                >
                  <div className={`bg-gradient-to-r ${exam.color || 'from-blue-500 to-purple-500'} p-4`}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-white" />
                      <div className="text-white flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{exam.title}</h3>
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            מודול {exam.moduleType}
                          </span>
                        </div>
                        <p className="text-sm opacity-90">
                          {exam.subject} • {exam.unit_level || exam.units} יחידות • {exam.duration_minutes || exam.duration || 90} דקות
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {exam.description && (
                    <div className="p-4 flex-grow">
                      <p className="text-sm text-gray-600">{exam.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 p-4 border-t">
                    <Button
                      onClick={() => handleEditExam(exam)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>

                    <Button
                      onClick={() => handleViewExam(exam)}
                      variant="outline"
                      className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      תצוגה
                    </Button>

                    <Button
                      onClick={() => handleDeleteExam(exam)}
                      variant="outline"
                      size="icon"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      {/* Edit Dialog is removed */}
    </div>
  );
}