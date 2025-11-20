
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, Upload, FileText, File, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminUploadDialog({ onClose, subject, units }) {
  const [uploadType, setUploadType] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState("");
  
  // Module C specific fields
  const [examTitle, setExamTitle] = useState("");
  const [readingText, setReadingText] = useState("");
  const [writingPrompt, setWritingPrompt] = useState("");

  const handleUpload = async () => {
    if (!agreedToTerms) {
      alert("יש לאשר שהתוכן מקורי וללא זכויות יוצרים");
      return;
    }

    if (uploadType === 'module_c') {
      if (!examTitle.trim() || !readingText.trim() || !writingPrompt.trim()) {
        alert("יש למלא את כל השדות הנדרשים למבחן Module C.");
        return;
      }
      try {
        await base44.entities.ModuleCExam.create({
          title: examTitle,
          reading_text: readingText,
          questions: [], // ייווצר ממשק להוספת שאלות - as per instructions, empty for now
          writing_prompt: writingPrompt,
          subject: subject,
          units: units,
          duration_minutes: 90
        });
        alert("מבחן Module C נוסף בהצלחה!");
        onClose();
      } catch (error) {
        console.error("Error creating exam:", error);
        alert("שגיאה בהוספת המבחן. אנא נסה שוב.");
      }
      return;
    }

    // Handle other upload types
    let isValid = false;
    if (uploadType === 'pdf' || uploadType === 'questions') {
      isValid = file !== null;
    } else if (uploadType === 'text') {
      isValid = textContent.trim() !== '';
    }

    if (!isValid) {
      alert("יש לבחור קובץ או להזין טקסט.");
      return;
    }

    console.log("Uploading...", { uploadType, file, textContent, subject, units });
    // Simulate API call for other types
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
    alert(`העלאת ${uploadType} בוצעה בהצלחה!`);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: 100 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: 100 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">העלאת חומר חדש</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>מקצוע:</strong> {subject} • <strong>יחידות:</strong> {units}
            </p>
          </div>

          {!uploadType ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">בחר סוג העלאה:</h3>
              
              <button
                onClick={() => setUploadType('module_c')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3"
              >
                <FileText className="w-6 h-6 text-indigo-600" />
                <div className="text-right">
                  <div className="font-semibold text-gray-900">מבחן Module C</div>
                  <div className="text-sm text-gray-600">הוסף מבחן הבנת נקרא + כתיבה</div>
                </div>
              </button>

              <button
                onClick={() => setUploadType('pdf')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3"
              >
                <File className="w-6 h-6 text-blue-600" />
                <div className="text-right">
                  <div className="font-semibold text-gray-900">העלאת PDF</div>
                  <div className="text-sm text-gray-600">העלה קובץ PDF עם שאלות ותשובות</div>
                </div>
              </button>

              <button
                onClick={() => setUploadType('text')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3"
              >
                <FileText className="w-6 h-6 text-green-600" />
                <div className="text-right">
                  <div className="font-semibold text-gray-900">העלאת טקסט</div>
                  <div className="text-sm text-gray-600">הדבק או כתוב טקסט ישירות</div>
                </div>
              </button>

              <button
                onClick={() => setUploadType('questions')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3"
              >
                <CheckSquare className="w-6 h-6 text-purple-600" />
                <div className="text-right">
                  <div className="font-semibold text-gray-900">בנק שאלות</div>
                  <div className="text-sm text-gray-600">העלה שאלות עם תשובות נכונות</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setUploadType(null)}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                ← חזור לבחירת סוג
              </button>

              {uploadType === 'pdf' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    בחר קובץ PDF
                  </label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="h-12"
                  />
                </div>
              )}

              {uploadType === 'text' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    טקסט החומר
                  </label>
                  <Textarea
                    placeholder="הדבק או כתוב כאן את החומר..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="h-40"
                  />
                </div>
              )}

              {uploadType === 'questions' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    קובץ שאלות (JSON/CSV)
                  </label>
                  <Input
                    type="file"
                    accept=".json,.csv"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="h-12"
                  />
                </div>
              )}

              {uploadType === 'module_c' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      כותרת המבחן
                    </label>
                    <Input
                      placeholder="לדוגמה: Module C - Winter 2024"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      טקסט להבנת הנקרא (באנגלית)
                    </label>
                    <Textarea
                      placeholder="הדבק את הטקסט להבנת הנקרא..."
                      value={readingText}
                      onChange={(e) => setReadingText(e.target.value)}
                      className="h-40"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      נושא הכתיבה (באנגלית)
                    </label>
                    <Textarea
                      placeholder="Write about..."
                      value={writingPrompt}
                      onChange={(e) => setWritingPrompt(e.target.value)}
                      className="h-24"
                    />
                  </div>
                </>
              )}

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={agreedToTerms}
                    onCheckedChange={setAgreedToTerms}
                    className="mt-1"
                  />
                  <label htmlFor="agree-terms" className="text-sm text-amber-900 cursor-pointer">
                    אני מאשר/ת שהתוכן מקורי וללא זכויות יוצרים, או שיש לי הרשאה להעלות אותו
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12"
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={
                    !agreedToTerms ||
                    (
                      (uploadType === 'pdf' || uploadType === 'questions') && !file
                    ) ||
                    (
                      uploadType === 'text' && !textContent.trim()
                    ) ||
                    (
                      uploadType === 'module_c' && (!examTitle.trim() || !readingText.trim() || !writingPrompt.trim())
                    )
                  }
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  העלה
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
