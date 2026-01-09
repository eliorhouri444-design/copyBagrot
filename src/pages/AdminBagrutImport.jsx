import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, ExternalLink, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function AdminBagrutImport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeImport, setActiveImport] = useState(null);

  const [foundExams, setFoundExams] = useState([]);

  const [isScanning, setIsScanning] = useState(false);
  const [selectedModule, setSelectedModule] = useState("581");

  const modules = [
    { id: "471", label: "471 - תוכנית חדשה 4 יח\"ל" },
    { id: "472", label: "472 - תוכנית חדשה 4 יח\"ל" },
    { id: "571", label: "571 - תוכנית חדשה 5 יח\"ל" },
    { id: "572", label: "572 - תוכנית חדשה 5 יח\"ל" },
    { id: "581", label: "581 (806) - 5 יח\"ל ישנה" },
    { id: "582", label: "582 (807) - 5 יח\"ל ישנה" },
    { id: "481", label: "481 (804) - 4 יח\"ל ישנה" },
    { id: "482", label: "482 (805) - 4 יח\"ל ישנה" },
    { id: "381", label: "381 (802) - 3 יח\"ל ישנה" },
    { id: "382", label: "382 (803) - 3 יח\"ל ישנה" },
    { id: "801", label: "801 - תכנית ישנה 3 יח\"ל" },
    { id: "802", label: "802 - תכנית ישנה 3 יח\"ל" },
    { id: "803", label: "803 - תכנית ישנה 3 יח\"ל" },
    { id: "804", label: "804 - תכנית ישנה 4 יח\"ל" },
    { id: "805", label: "805 - תכנית ישנה 4 יח\"ל" },
    { id: "806", label: "806 - תכנית ישנה 5 יח\"ל" },
    { id: "807", label: "807 - תכנית ישנה 5 יח\"ל" }
  ];

  const handleScanWebsite = async () => {
    setIsScanning(true);
    setFoundExams([]); // Clear previous results
    try {
      const res = await base44.functions.invoke('scanKibinimatika', { module: selectedModule });
      if (res.data.success && res.data.exams) {
        setFoundExams(res.data.exams);
        alert(`סריקה הסתיימה עבור שאלון ${selectedModule}! נמצאו ${res.data.exams.length} בגרויות חדשות.`);
      } else {
        alert('לא נמצאו בגרויות בסריקה או שאירעה שגיאה. נסה שאלון אחר.');
      }
    } catch (e) {
      console.error("Scan error:", e);
      alert("שגיאה בסריקת האתר: " + e.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async (exam) => {
    if (!exam.examUrl) {
      alert("נא להזין קישור לשאלון");
      return;
    }

    setActiveImport(exam.id);
    setLoading(true);

    try {
      // Determine module_symbol if not present (from scan or user input)
      // Usually scan provides it as 'module'
      const moduleSymbol = exam.module || selectedModule;

      const response = await base44.functions.invoke('processRealBagrut', {
        exam_pdf_url: exam.examUrl,
        solution_pdf_url: exam.solutionUrl,
        subject: "מתמטיקה",
        unit: moduleSymbol.startsWith("5") ? 5 : (moduleSymbol.startsWith("4") ? 4 : 3), // Infer unit from module
        year: exam.year,
        season: exam.season,
        term: exam.term || 'a',
        module_symbol: moduleSymbol
      });

      if (response.data.success) {
        setFoundExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: 'done' } : e));
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Import error:", error);
      setFoundExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: 'error', error: error.message } : e));
      alert(`שגיאה בייבוא ${exam.title}: ` + error.message);
    } finally {
      setLoading(false);
      setActiveImport(null);
    }
  };

  const updateUrl = (id, field, value) => {
    setFoundExams(prev => prev.map(e => e.id === id ? { ...e, [field]: value, status: 'ready' } : e));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ייבוא בגרויות מקיבינימטיקה</h1>
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminExams'))}>
            חזרה לניהול בגרויות
          </Button>
        </div>

        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">ייבוא אוטומטי מקיבינימטיקה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>בחר שאלון לסריקה:</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <Button 
                onClick={handleScanWebsite} 
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Download className="w-4 h-4 ml-2" />}
                סרוק ומצא בגרויות
              </Button>
            </div>
            
            <p className="text-blue-900 mt-4 text-sm">
              המערכת תסרוק את אתר קיבינימטיקה עבור השאלון הנבחר, תאתר את דפי השנים והמועדים, ותחלץ את הקישורים הישירים לקבצי ה-PDF (שאלון ופתרון).
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {foundExams.map((exam) => (
            <Card key={exam.id} className={`border-2 ${exam.status === 'done' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${exam.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {exam.status === 'done' ? <CheckCircle className="w-6 h-6" /> : <Download className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500">שנה: {exam.year} • עונה: {exam.season === 'winter' ? 'חורף' : 'קיץ'} • שאלון: {exam.module}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>קישור לשאלון (PDF)</Label>
                        <Input 
                          dir="ltr"
                          value={exam.examUrl} 
                          onChange={(e) => updateUrl(exam.id, 'examUrl', e.target.value)}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>קישור לפתרון (PDF)</Label>
                        <Input 
                          dir="ltr"
                          value={exam.solutionUrl} 
                          onChange={(e) => updateUrl(exam.id, 'solutionUrl', e.target.value)}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {exam.status === 'error' && (
                      <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
                        שגיאה: {exam.error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center">
                    {exam.status === 'done' ? (
                      <Button disabled className="bg-green-600 text-white">
                        יובא בהצלחה
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleImport(exam)} 
                        disabled={loading || activeImport === exam.id || !exam.examUrl}
                        className="bg-blue-600 hover:bg-blue-700 w-32"
                      >
                        {activeImport === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "ייבא למערכת"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}