import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Check, Loader2, FileCheck, BookCheck, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DataCache } from "@/components/cache/DataCache";

export default function AdminBagrutManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
const [isAdmin, setIsAdmin] = useState(true);
const [authChecked, setAuthChecked] = useState(false);
const [processError, setProcessError] = useState("");
  
  const [formData, setFormData] = useState({
    subject_id: "מתמטיקה",
    unit_level: "5",
    year: new Date().getFullYear().toString(),
    season: "summer",
    term: "a",
    module_symbol: "",
  });

  useEffect(() => {
    if (location.state?.prefill) {
      setFormData(prev => ({
        ...prev,
        ...location.state.prefill
      }));
    }
  }, [location.state]);

// בדיקת הרשאת אדמין כדי למנוע קריאות כושלות מראש
useEffect(() => {
  (async () => {
    try {
      const u = await base44.auth.me();
      setIsAdmin(u?.role === 'admin');
    } catch {
      setIsAdmin(false);
    } finally {
      setAuthChecked(true);
    }
  })();
}, []);

  // Fetch custom module definitions to match the carousel
  const { data: customModules = [] } = useQuery({
    queryKey: ['module-definitions'],
    queryFn: () => base44.entities.ModuleDefinition.list(),
    staleTime: 60000
  });

  const defaultModulesStructure = {
    "אנגלית": {
      3: [
      { id: "C", title: "מודול C" },
      { id: "A", title: "מודול A" },
      { id: "B", title: "מודול B" }],

      4: [
      { id: "C", title: "מודול C" },
      { id: "D", title: "מודול D" },
      { id: "E", title: "מודול E" }],

      5: [
      { id: "E", title: "מודול E" },
      { id: "F", title: "מודול F" },
      { id: "G", title: "מודול G" }]

    },
    "מתמטיקה": {
      3: [
      { id: "801", title: "שאלון 801" },
      { id: "802", title: "שאלון 802" }],

      4: [
      { id: "803", title: "שאלון 803" },
      { id: "804", title: "שאלון 804" }],

      5: [
      { id: "805", title: "שאלון 805" },
      { id: "806", title: "שאלון 806" }]

    },
    "פיזיקה": {
      5: [
      { id: "581", title: "שאלון 581" },
      { id: "582", title: "שאלון 582" }]

    },
    "כימיה": {
      5: [
      { id: "043381", title: "שאלון 043381" },
      { id: "043382", title: "שאלון 043382" },
      { id: "043383", title: "שאלון 043383" }]

    },
    "ביולוגיה": {
      5: [
      { id: "054581", title: "שאלון 054581" },
      { id: "054582", title: "שאלון 054582" },
      { id: "054583", title: "שאלון 054583" }]

    },
    "ספרות": {
      2: [
      { id: "2101", title: "שאלון 2101" }],

      5: [
      { id: "2102", title: "שאלון 2102" },
      { id: "2103", title: "שאלון 2103" }]

    },
    "היסטוריה": {
      2: [
      { id: "2211", title: "שאלון 2211" }],

      5: [
      { id: "2212", title: "שאלון 2212" },
      { id: "2213", title: "שאלון 2213" }]

    },
    "גאוגרפיה": {
      5: [
      { id: "046511", title: "שאלון 046511" },
      { id: "046512", title: "שאלון 046512" },
      { id: "046581", title: "שאלון 046581" }]

    },
    "אזרחות": {
      2: [
      { id: "1121", title: "שאלון 1121" },
      { id: "1122", title: "שאלון 1122" }]

    },
    "תנ\"ך": {
      2: [
      { id: "1211", title: "שאלון 1211" }],

      5: [
      { id: "1212", title: "שאלון 1212" },
      { id: "1213", title: "שאלון 1213" }]

    }
  };

  const getModuleOptions = (subject, unit) => {
    // 1. Get default modules
    const defaults = defaultModulesStructure[subject]?.[unit] || [];
    
    // 2. Get custom modules for this subject/unit
    const custom = customModules.filter(m => 
      m.subject === subject && 
      parseInt(m.unit_level) === parseInt(unit)
    ).map(m => ({
      id: m.module_id,
      title: m.title
    }));

    // 3. Merge unique modules (custom overrides default if same ID)
    const merged = [...defaults];
    custom.forEach(c => {
      if (!merged.find(m => m.id === c.id)) {
        merged.push(c);
      }
    });

    return merged.map(m => ({
      id: m.id,
      label: `${m.title} (${m.id})`
    }));
  };

  const isManualModule = (symbol, subject, unit) => {
    const options = getModuleOptions(subject, unit);
    return symbol && symbol !== "" && !options.some(opt => opt.id === symbol);
  };

  const handleEditClick = (bagrut) => {
    setEditingId(bagrut.id);
    setEditFormData({
      subject_id: bagrut.subject_id,
      unit_level: bagrut.unit_level?.toString(),
      module_symbol: bagrut.module_symbol || "",
      year: bagrut.year,
      season: bagrut.season
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await base44.entities.BagrutExam.update(id, {
        subject_id: editFormData.subject_id,
        unit_level: parseInt(editFormData.unit_level),
        module_symbol: editFormData.module_symbol,
        year: parseInt(editFormData.year),
        season: editFormData.season,
        title: `${editFormData.season === 'winter' ? 'חורף' : 'קיץ'} ${editFormData.year} (${editFormData.module_symbol || 'כללי'})`
      });
      setEditingId(null);
      DataCache.invalidatePattern('exams_data');
      DataCache.invalidatePattern('home_data');
      window.dispatchEvent(new Event('cache-update'));
      refetch();
    } catch (e) {
      alert("שגיאה בעדכון: " + e.message);
    }
  };

  // Fetch existing Bagrut exams
  const { data: existingBagruts, refetch } = useQuery({
    queryKey: ['bagrut-exams'],
    queryFn: () => base44.entities.BagrutExam.list("-created_date", 50),
    initialData: []
  });

  const handleBulkProcess = async () => {
    if (!confirm(`האם לעבד את כל ${existingBagruts.length} הבגרויות ברשימה? פעולה זו עשויה לקחת זמן.`)) return;
    
    setIsBulkProcessing(true);
    let successCount = 0;
    
    try {
      for (const bagrut of existingBagruts) {
        setProcessingId(bagrut.id);
        try {
          await base44.functions.invoke('processRealBagrut', {
             exam_pdf_url: bagrut.exam_file_url,
             solution_pdf_url: bagrut.solution_file_url, 
             subject: bagrut.subject_id,
             unit: bagrut.unit_level,
             year: bagrut.year,
             season: bagrut.season,
             module_symbol: bagrut.module_symbol
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to process ${bagrut.title}`, e);
        }
      }
      alert(`תהליך הסתיים! ${successCount} בגרויות עובדו בהצלחה.`);
    } catch (error) {
      alert('שגיאה בתהליך העיבוד הקבוצתי');
    } finally {
      setIsBulkProcessing(false);
      setProcessingId(null);
    }
  };

  const [examFile, setExamFile] = useState(null);
  const [solutionFile, setSolutionFile] = useState(null);
  const [uploadedExamUrl, setUploadedExamUrl] = useState(null);
  const [uploadedSolutionUrl, setUploadedSolutionUrl] = useState(null);

  const handleFileUpload = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('שגיאה בהעלאת הקובץ');
      return null;
    }
  };

  const handleInitialUpload = async (e) => {
    e.preventDefault();
    if (!examFile) {
      alert("חובה להעלות קובץ בחינה");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Exam File
      const examUrl = await handleFileUpload(examFile);
      if (examUrl) setUploadedExamUrl(examUrl);

      // 2. Upload Solution File (Optional)
      let solutionUrl = null;
      if (solutionFile) {
        solutionUrl = await handleFileUpload(solutionFile);
        if (solutionUrl) setUploadedSolutionUrl(solutionUrl);
      }

      // 3. Create Metadata Entity Record
      const title = `${formData.season === 'winter' ? 'חורף' : 'קיץ'} ${formData.year} מועד ${formData.term === 'a' ? "א'" : "ב'"}`;

      // Check for duplicates before creating
      const existingBagruts = await base44.entities.BagrutExam.list();
      const duplicate = existingBagruts.find(b => 
        b.subject_id === formData.subject_id && 
        b.year === parseInt(formData.year) && 
        b.season === formData.season && 
        b.term === formData.term &&
        b.unit_level === parseInt(formData.unit_level)
      );

      if (duplicate) {
        if (confirm("נראה שכבר קיימת בגרות במועד זה. האם לעדכן את הקבצים שלה?")) {
           await base44.entities.BagrutExam.update(duplicate.id, {
             exam_file_url: examUrl,
             solution_file_url: solutionUrl || duplicate.solution_file_url,
             module_symbol: formData.module_symbol // Update module symbol if changed
           });
        } else {
           return; // User cancelled
        }
      } else {
        await base44.entities.BagrutExam.create({
          subject_id: formData.subject_id,
          unit_level: parseInt(formData.unit_level),
          year: parseInt(formData.year),
          season: formData.season,
          term: formData.term,
          module_symbol: formData.module_symbol,
          exam_file_url: examUrl,
          solution_file_url: solutionUrl,
          title: title
        });
      }

      DataCache.invalidatePattern('exams_data');
      DataCache.invalidatePattern('home_data');
      window.dispatchEvent(new Event('cache-update'));

      alert("הקבצים הועלו לשרת בהצלחה! כעת לחץ על 'עבד ופרסם' כדי להפוך לבגרות פעילה.");
      
    } catch (error) {
      console.error("Error uploading exam:", error);
      alert("שגיאה בהעלאת הבגרות: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRealExam = async () => {
    if (!uploadedExamUrl) return;
    setProcessError("");
    if (!isAdmin) { alert('רק אדמין יכול לעבד ולפרסם בגרויות.'); return; }

    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('processRealBagrut', {
         exam_pdf_url: uploadedExamUrl,
         solution_pdf_url: uploadedSolutionUrl, 
         subject: formData.subject_id,
         unit: formData.unit_level,
         year: formData.year,
         season: formData.season,
         module_symbol: formData.module_symbol
      });

      if (response.data.success) {
        DataCache.invalidatePattern('exams_data');
        DataCache.invalidatePattern('home_data');
        window.dispatchEvent(new Event('cache-update'));
        
        alert('הבגרות פורסמה בהצלחה למערכת! 🎉\nהשאלות והתשובות סונכרנו.');
        navigate(createPageUrl('AdminExams'));
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing exam:', error);
      const msg = error?.response?.data?.error || error?.message || 'שגיאה לא ידועה';
      setProcessError(msg);
      alert('שגיאה בעיבוד הבגרות: ' + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessExisting = async (bagrut) => {
    if (!confirm(`האם לעבד ולפרסם את הבגרות: ${bagrut.title}?`)) return;
    
    setProcessingId(bagrut.id);
    setProcessError("");
    if (!isAdmin) { alert('רק אדמין יכול לעבד ולפרסם בגרויות.'); setProcessingId(null); return; }
    try {
      const response = await base44.functions.invoke('processRealBagrut', {
         exam_pdf_url: bagrut.exam_file_url,
         solution_pdf_url: bagrut.solution_file_url, 
         subject: bagrut.subject_id,
         unit: bagrut.unit_level,
         year: bagrut.year,
         season: bagrut.season,
         module_symbol: bagrut.module_symbol
      });

      if (response.data.success) {
        DataCache.invalidatePattern('exams_data');
        DataCache.invalidatePattern('home_data');
        window.dispatchEvent(new Event('cache-update'));
        alert('הבגרות עובדה ופורסמה בהצלחה!');
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing exam:', error);
      const msg = error?.response?.data?.error || error?.message || 'שגיאה לא ידועה';
      setProcessError(msg);
      alert('שגיאה בעיבוד: ' + msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteBagrut = async (id) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הבגרות הזו? הפעולה בלתי הפיכה.")) return;
    
    try {
      await base44.entities.BagrutExam.delete(id);
      refetch(); // Refresh the list
      alert("הבגרות נמחקה בהצלחה");
    } catch (e) {
      console.error("Error deleting bagrut:", e);
      alert("שגיאה במחיקה: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">העלאת בגרות רשמית</h1>
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminExams'))}>חזרה לניהול</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. פרטי הבגרות והעלאת קבצים</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInitialUpload} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>מקצוע</Label>
                  <Select 
                    value={formData.subject_id} 
                    onValueChange={(val) => setFormData({...formData, subject_id: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                      <SelectItem value="אנגלית">אנגלית</SelectItem>
                      <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                      <SelectItem value="מדעי המחשב">מדעי המחשב</SelectItem>
                      <SelectItem value="ספרות">ספרות</SelectItem>
                      <SelectItem value="תנ&quot;ך">תנ"ך</SelectItem>
                      <SelectItem value="היסטוריה">היסטוריה</SelectItem>
                      <SelectItem value="אזרחות">אזרחות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>יחידות לימוד</Label>
                  <Select 
                    value={formData.unit_level} 
                    onValueChange={(val) => setFormData({...formData, unit_level: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 יחידות</SelectItem>
                      <SelectItem value="3">3 יחידות</SelectItem>
                      <SelectItem value="4">4 יחידות</SelectItem>
                      <SelectItem value="5">5 יחידות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>שנה</Label>
                  <Input 
                    type="number" 
                    value={formData.year} 
                    onChange={(e) => setFormData({...formData, year: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>מועד (עונה)</Label>
                  <Select 
                    value={formData.season} 
                    onValueChange={(val) => setFormData({...formData, season: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summer">קיץ</SelectItem>
                      <SelectItem value="winter">חורף</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>מועד (א/ב)</Label>
                  <Select 
                    value={formData.term} 
                    onValueChange={(val) => setFormData({...formData, term: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">מועד א'</SelectItem>
                      <SelectItem value="b">מועד ב'</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-blue-700 font-bold">שייך לשאלון/מודול (חובה להצגה באפליקציה)</Label>
                {getModuleOptions(formData.subject_id, formData.unit_level).length > 0 ? (
                  <div className="space-y-2">
                    <Select 
                      value={isManualModule(formData.module_symbol, formData.subject_id, formData.unit_level) ? "other" : formData.module_symbol}
                      onValueChange={(val) => {
                        if (val === "other") {
                          setFormData({...formData, module_symbol: ""}); // Clear to allow manual typing
                        } else {
                          setFormData({...formData, module_symbol: val});
                        }
                      }}
                    >
                      <SelectTrigger className="border-blue-300 bg-blue-50">
                        <SelectValue placeholder="בחר לאיזה שאלון לשייך..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getModuleOptions(formData.subject_id, formData.unit_level).map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                        <SelectItem value="other">אחר (הזנה ידנית)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Show input if "other" is selected or if current value is manual */}
                    {(formData.module_symbol === "" || isManualModule(formData.module_symbol, formData.subject_id, formData.unit_level)) && (
                      <Input 
                        className="mt-2 border-blue-300 focus:ring-blue-500"
                        placeholder="הזן סמל שאלון ידנית (למשל: 806, G)..."
                        value={formData.module_symbol}
                        onChange={(e) => setFormData({...formData, module_symbol: e.target.value})} 
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <Input 
                    placeholder="לדוגמה: 581, 806, G"
                    value={formData.module_symbol} 
                    onChange={(e) => setFormData({...formData, module_symbol: e.target.value})} 
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                {/* Exam File Upload */}
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${examFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    className="hidden" 
                    id="exam-upload"
                    onChange={(e) => setExamFile(e.target.files[0])}
                  />
                  <label htmlFor="exam-upload" className="cursor-pointer block w-full h-full">
                    {examFile ? (
                      <div className="text-blue-700 flex flex-col items-center">
                        <Check className="w-8 h-8 mb-2" />
                        <span className="text-sm font-bold">{examFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 flex flex-col items-center">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm font-bold">טופס בחינה (PDF)</span>
                        <span className="text-xs mt-1 text-red-500">* חובה</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Solution File Upload */}
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${solutionFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    className="hidden" 
                    id="solution-upload"
                    onChange={(e) => setSolutionFile(e.target.files[0])}
                  />
                  <label htmlFor="solution-upload" className="cursor-pointer block w-full h-full">
                    {solutionFile ? (
                      <div className="text-green-700 flex flex-col items-center">
                        <FileCheck className="w-8 h-8 mb-2" />
                        <span className="text-sm font-bold">{solutionFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 flex flex-col items-center">
                        <FileText className="w-8 h-8 mb-2" />
                        <span className="text-sm font-bold">קובץ תשובות (PDF)</span>
                        <span className="text-xs mt-1 text-gray-400">אופציונלי אך מומלץ</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading || uploadedExamUrl}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    מעלה קבצים...
                  </>
                ) : uploadedExamUrl ? (
                  "הקבצים הועלו ✓"
                ) : (
                  "שלב 1: העלה קבצים לשרת"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        {uploadedExamUrl && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <BookCheck className="w-6 h-6" />
                2. עיבוד ופרסום בגרות רשמית
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {authChecked && !isAdmin && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded text-sm">
                  אין לך הרשאת אדמין. עיבוד הבגרות זמין רק למנהלים.
                </div>
              )}
              {processError && (
                <div className="text-red-600 text-sm">שגיאה: {processError}</div>
              )}
              <div className="bg-white p-4 rounded-lg text-sm text-gray-700 border border-blue-100">
                <p className="font-bold mb-2">מה המערכת תעשה?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>תחלץ את טקסט השאלות המדויק מקובץ הבחינה.</li>
                  <li>תחלץ את התשובות והשלבים מקובץ הפתרונות (אם הועלה).</li>
                  <li>תאחד את הכל למבחן דיגיטלי שיופיע באפליקציה.</li>
                  <li>תייצר מנגנון בדיקה אוטומטי המבוסס על התשובות הרשמיות.</li>
                </ul>
              </div>

              <Button 
                onClick={handleProcessRealExam} 
                disabled={isProcessing || !isAdmin}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200/50 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 ml-2 animate-spin" />
                    מעבד ובונה מבחן... (עשוי לקחת כדקה)
                  </>
                ) : (!isAdmin ? "אין הרשאת אדמין" : "עבד ופרסם את הבגרות לאפליקציה 🚀")}
                </Button>
              {processError && (
                <div className="text-red-600 text-sm mt-2">שגיאה: {processError}</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* List of existing Bagrut exams */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">בגרויות שהועלו בעבר</h2>
            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  if (confirm("פעולה זו תמחק את כל המבחנים הקיימים בקרוסלה ותיצור אותם מחדש מתוך הסריקות. האם להמשיך?")) {
                    setIsBulkProcessing(true);
                    try {
                      await base44.functions.invoke('migrateExams');
                      alert("המערכת אופסה והבגרויות נטענו מחדש בהצלחה!");
                      window.location.reload();
                    } catch (e) {
                      alert("שגיאה באיתחול המערכת");
                    } finally {
                      setIsBulkProcessing(false);
                    }
                  }
                }}
                disabled={isBulkProcessing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RefreshCw className="w-4 h-4 ml-2" />}
                אפס וטען הכל מחדש
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {existingBagruts.map(bagrut => (
              <Card key={bagrut.id} className="p-4">
                {editingId === bagrut.id ? (
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>מקצוע</Label>
                        <Select 
                          value={editFormData.subject_id} 
                          onValueChange={(val) => setEditFormData({...editFormData, subject_id: val})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                            <SelectItem value="אנגלית">אנגלית</SelectItem>
                            <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                            <SelectItem value="מדעי המחשב">מדעי המחשב</SelectItem>
                            <SelectItem value="ספרות">ספרות</SelectItem>
                            <SelectItem value="תנ&quot;ך">תנ"ך</SelectItem>
                            <SelectItem value="היסטוריה">היסטוריה</SelectItem>
                            <SelectItem value="אזרחות">אזרחות</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>יחידות</Label>
                        <Select 
                          value={editFormData.unit_level} 
                          onValueChange={(val) => setEditFormData({...editFormData, unit_level: val})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 יחידות</SelectItem>
                            <SelectItem value="3">3 יחידות</SelectItem>
                            <SelectItem value="4">4 יחידות</SelectItem>
                            <SelectItem value="5">5 יחידות</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                       <div>
                         <Label>שאלון/מודול</Label>
                         <Input 
                           value={editFormData.module_symbol} 
                           onChange={(e) => setEditFormData({...editFormData, module_symbol: e.target.value})}
                           placeholder="A, 804, 581..." 
                         />
                       </div>
                       <div>
                         <Label>שנה</Label>
                         <Input 
                           value={editFormData.year} 
                           onChange={(e) => setEditFormData({...editFormData, year: e.target.value})}
                         />
                       </div>
                       <div className="flex items-end gap-2">
                         <Button onClick={() => handleSaveEdit(bagrut.id)} className="w-full bg-green-600 hover:bg-green-700">שמור</Button>
                         <Button onClick={() => setEditingId(null)} variant="outline">ביטול</Button>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">{bagrut.title}</h3>
                        <p className="text-sm text-gray-500">
                          {bagrut.subject_id} • {bagrut.unit_level} יח"ל • שאלון: <span className="font-bold text-blue-600">{bagrut.module_symbol || 'לא מוגדר'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleEditClick(bagrut)}
                      >
                        ערוך פרטים
                      </Button>
                      <Button 
                        onClick={() => handleProcessExisting(bagrut)}
                        disabled={processingId === bagrut.id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {processingId === bagrut.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <BookCheck className="w-4 h-4 mr-2" />
                            עבד ושייך
                          </>
                          )}
                          </Button>
                          <Button 
                          variant="outline"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                          onClick={() => handleDeleteBagrut(bagrut.id)}
                          title="מחק בגרות"
                          >
                          <Trash2 className="w-5 h-5" />
                          </Button>
                          </div>
                          </div>
                          )}
                          </Card>
                          ))}
            {existingBagruts.length === 0 && (
              <p className="text-gray-500 text-center py-8">לא נמצאו בגרויות קודמות במערכת.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}