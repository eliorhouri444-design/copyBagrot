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
    { id: "581", label: "581 (806) - מתמטיקה 5 יח\"ל" },
    { id: "582", label: "582 (807) - מתמטיקה 5 יח\"ל" },
    { id: "481", label: "481 (804) - מתמטיקה 4 יח\"ל" },
    { id: "482", label: "482 (805) - מתמטיקה 4 יח\"ל" },
    { id: "381", label: "381 (802) - מתמטיקה 3 יח\"ל" },
    { id: "382", label: "382 (803) - מתמטיקה 3 יח\"ל" }
  ];

  const handleScanWebsite = async () => {
    setIsScanning(true);
    try {
      const res = await base44.functions.invoke('scanKibinimatika', { module: selectedModule });
      if (res.data.success && res.data.exams) {
        // Merge with existing found exams to avoid duplicates
        const newExams = res.data.exams.filter(
          newE => !foundExams.some(existing => existing.id === newE.id)
        );
        setFoundExams([...newExams, ...foundExams]);
        alert(`סריקה הסתיימה עבור שאלון ${selectedModule}! נמצאו ${newExams.length} בגרויות חדשות.`);
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
      const response = await base44.functions.invoke('processRealBagrut', {
        exam_pdf_url: exam.examUrl,
        solution_pdf_url: exam.solutionUrl,
        subject: "מתמטיקה",
        unit: 5,
        year: exam.year,
        season: exam.season,
        term: exam.term || 'a',
        module_symbol: exam.module
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
          <h1 className="text-3xl font-bold text-gray-900">ייבוא בגרויות מקיבינימטיקה (581)</h1>
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminExams'))}>
            חזרה לניהול בגרויות
          </Button>
        </div>

        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex justify-between items-center">
              <span>ייבוא אוטומטי</span>
              <Button 
                onClick={handleScanWebsite} 
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Download className="w-4 h-4 ml-2" />}
                סרוק אתר קיבינימטיקה (581)
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-900 mb-4">
              לחץ על הכפתור למעלה כדי לסרוק אוטומטית את אתר קיבינימטיקה ולחלץ את כל המבחנים הקיימים לשאלון 581.
              <br />
              המערכת תמצא שאלונים משנים 2019-2025 ותציג אותם בטבלה למטה לאישור וייבוא.
            </p>
            <div className="text-sm text-gray-500">
              מקור: 
              <a 
                href="https://kibinimatika.org/2019/12/12/%d7%a4%d7%aa%d7%a8%d7%95%d7%a0%d7%95%d7%aa-%d7%9e%d7%9c%d7%90%d7%99%d7%9d-%d7%9c%d7%91%d7%97%d7%99%d7%a0%d7%aa-%d7%94%d7%91%d7%92%d7%a8%d7%95%d7%aa-%d7%91%d7%9e%d7%aa%d7%9e%d7%98%d7%99%d7%a7%d7%94/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 mx-1"
              >
                דף בחינות 581 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
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