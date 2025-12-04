import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Check, Loader2, FileCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminBagrutManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: "מתמטיקה",
    unit_level: "5",
    year: new Date().getFullYear().toString(),
    season: "summer",
    term: "a",
    module_symbol: "",
  });

  const [examFile, setExamFile] = useState(null);
  const [solutionFile, setSolutionFile] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAI = async (bagrutExam) => {
    if (!confirm("האם אתה רוצה לייצר מבחן חדש מבוסס על הבגרות שהועלתה? הפעולה עשויה לקחת דקה.")) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await base44.functions.invoke('generateExamFromPDF', {
        pdf_url: bagrutExam.exam_file_url,
        subject: formData.subject_id,
        unit: formData.unit_level,
        original_exam_id: bagrutExam.id
      });
      
      if (response.data?.success) {
        alert("המבחן נוצר בהצלחה ונשמר במערכת!");
      } else {
         throw new Error(response.data?.error || "Unknown error");
      }
    } catch (error) {
      console.error("AI Generation error:", error);
      alert("שגיאה ביצירת המבחן: " + error.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleFileUpload = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examFile) {
      alert("חובה להעלות קובץ בחינה");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Exam File
      const examUrl = await handleFileUpload(examFile);
      
      // 2. Upload Solution File (if exists)
      let solutionUrl = null;
      if (solutionFile) {
        solutionUrl = await handleFileUpload(solutionFile);
      }

      // 3. Create Entity Record
      const title = `${formData.season === 'winter' ? 'חורף' : 'קיץ'} ${formData.year} מועד ${formData.term === 'a' ? "א'" : "ב'"}`;

      const newExam = await base44.entities.BagrutExam.create({
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

      if (window.confirm("הבגרות הועלתה בהצלחה! האם תרצה לייצר אוטומטית מבחן תרגול חדש (AI) מבוסס על בגרות זו?")) {
          await handleGenerateAI(newExam);
      } 
      
      // Reset files
      setExamFile(null);
      setSolutionFile(null);
    } catch (error) {
      console.error("Error uploading exam:", error);
      alert("שגיאה בהעלאת הבגרות: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ניהול מאגר בגרויות</h1>
          <Button variant="outline" onClick={() => navigate('/Exams')}>חזרה לבגרויות</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>העלאת בחינה ופתרון</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
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
                <Label>סמל שאלון (אופציונלי)</Label>
                <Input 
                  placeholder="לדוגמה: 581, 806"
                  value={formData.module_symbol} 
                  onChange={(e) => setFormData({...formData, module_symbol: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                {/* Exam File Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    קובץ הבחינה (PDF) *
                  </Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${examFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                    <input 
                      type="file" 
                      accept="application/pdf"
                      className="hidden" 
                      id="exam-upload"
                      onChange={(e) => setExamFile(e.target.files[0])}
                    />
                    <label htmlFor="exam-upload" className="cursor-pointer block w-full h-full">
                      {examFile ? (
                        <div className="text-green-700 flex flex-col items-center">
                          <Check className="w-8 h-8 mb-2" />
                          <span className="text-sm font-bold">{examFile.name}</span>
                        </div>
                      ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-sm">לחץ להעלאת טופס הבחינה</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Solution File Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    קובץ פתרונות (PDF)
                  </Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${solutionFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                    <input 
                      type="file" 
                      accept="application/pdf"
                      className="hidden" 
                      id="solution-upload"
                      onChange={(e) => setSolutionFile(e.target.files[0])}
                    />
                    <label htmlFor="solution-upload" className="cursor-pointer block w-full h-full">
                      {solutionFile ? (
                        <div className="text-blue-700 flex flex-col items-center">
                          <Check className="w-8 h-8 mb-2" />
                          <span className="text-sm font-bold">{solutionFile.name}</span>
                        </div>
                      ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-sm">לחץ להעלאת קובץ פתרונות</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    מעלה קבצים...
                  </>
                ) : (
                  "העלה למאגר הבגרויות"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}