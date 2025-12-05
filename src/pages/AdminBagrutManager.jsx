import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Check, Loader2, FileCheck, BookCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";

export default function AdminBagrutManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  
  const [formData, setFormData] = useState({
    subject_id: "מתמטיקה",
    unit_level: "5",
    year: new Date().getFullYear().toString(),
    season: "summer",
    term: "a",
    module_symbol: "",
  });

  // Fetch existing Bagrut exams
  const { data: existingBagruts, refetch } = useQuery({
    queryKey: ['bagrut-exams'],
    queryFn: () => base44.entities.BagrutExam.list("-created_date", 50),
    initialData: []
  });

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
        alert('הבגרות פורסמה בהצלחה למערכת! 🎉\nהשאלות והתשובות סונכרנו.');
        navigate(createPageUrl('AdminExams'));
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing exam:', error);
      alert('שגיאה בעיבוד הבגרות: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessExisting = async (bagrut) => {
    if (!confirm(`האם לעבד ולפרסם את הבגרות: ${bagrut.title}?`)) return;
    
    setProcessingId(bagrut.id);
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
        alert('הבגרות עובדה ופורסמה בהצלחה!');
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing exam:', error);
      alert('שגיאה בעיבוד: ' + error.message);
    } finally {
      setProcessingId(null);
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
                <Label>סמל שאלון (לדוגמה: 581, G)</Label>
                <Input 
                  placeholder="לדוגמה: 581, 806, G"
                  value={formData.module_symbol} 
                  onChange={(e) => setFormData({...formData, module_symbol: e.target.value})} 
                />
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
                disabled={isProcessing}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200/50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 ml-2 animate-spin" />
                    מעבד ובונה מבחן... (עשוי לקחת כדקה)
                  </>
                ) : (
                  "עבד ופרסם את הבגרות לאפליקציה 🚀"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* List of existing Bagrut exams */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 text-gray-800">בגרויות שהועלו בעבר (ממתינות לעיבוד)</h2>
          <div className="grid gap-4">
            {existingBagruts.map(bagrut => (
              <Card key={bagrut.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">{bagrut.title}</h3>
                    <p className="text-sm text-gray-500">
                      {bagrut.subject_id} • {bagrut.unit_level} יח"ל • {bagrut.year}
                    </p>
                  </div>
                </div>
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
                      עבד ופרסם
                    </>
                  )}
                </Button>
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