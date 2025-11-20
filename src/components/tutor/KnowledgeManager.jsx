
import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Upload, Loader2, Check, X, Brain, Trash2,
  Eye, Search, Sparkles,
  Book, FileQuestion, GraduationCap, File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function KnowledgeManager({ user, onKnowledgeUpdated }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSettings, setUploadSettings] = useState({
    title: "",
    fileType: "other",
    subject: user?.selected_subject || "מתמטיקה",
    unitLevel: user?.selected_units || 5
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [expandedDoc, setExpandedDoc] = useState(null);

  // שליפת כל מסמכי הידע - אופטימיזציה
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => base44.entities.KnowledgeDocument.list("-created_date", 50), // הקטנתי מ-100 ל-50
    staleTime: 20 * 60 * 1000, // 20 דקות
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const fileTypeIcons = {
    exam: FileQuestion,
    quiz: GraduationCap,
    study_guide: Book,
    pdf: FileText,
    word: FileText,
    text: File,
    other: File
  };

  const fileTypeLabels = {
    exam: "בגרות",
    quiz: "בוחן",
    study_guide: "חומר לימוד",
    pdf: "PDF",
    word: "Word",
    text: "טקסט",
    other: "אחר"
  };

  // עיבוד חכם של קובץ עם retry mechanism
  const processLargeFile = async (file, fileUrl) => {
    setIsProcessing(true);
    setProcessingProgress(5);
    setProcessingStatus('מעלה קובץ...');

    try {
      // בדיקה נוספת לפני תחילת עיבוד
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`⚠️ הקובץ גדול מדי!\n\nמקסימום: 10MB\nהקובץ שלך: ${(file.size / 1024 / 1024).toFixed(1)}MB\n\n💡 פתרונות:\n\n1️⃣ דחוס חזק יותר\n2️⃣ פצל לקבצים קטנים\n3️⃣ העלה רק דפים רלוונטיים`);
      }

      // שלב 1: חילוץ תוכן עם timeout handling משופר
      setProcessingProgress(15);
      setProcessingStatus('מחלץ תוכן... (עד 10 דקות)');

      let extractResult;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: {
              type: "object",
              properties: {
                content: { type: "string" }
              }
            }
          });

          // אם הצלחנו - נצא מהלולאה
          if (extractResult.status === "success") {
            break;
          }

          // אם זו לא שגיאת timeout - נזרוק שגיאה
          if (!extractResult.details?.includes('Timeout') && !extractResult.details?.includes('timed out')) {
            throw new Error(extractResult.details || 'שגיאה בחילוץ תוכן');
          }

          retryCount++;
          if (retryCount <= maxRetries) {
            setProcessingStatus(`ניסיון ${retryCount + 1}/${maxRetries + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // המתן 2 שניות
          }

        } catch (extractError) {
          console.error(`Extract attempt ${retryCount + 1} error:`, extractError);

          // בדיקה אם זו שגיאת timeout
          if (extractError.message?.includes('Timeout') || extractError.message?.includes('timed out')) {
            retryCount++;
            
            if (retryCount > maxRetries) {
              throw new Error(`⏱️ הקובץ גדול מדי לעיבוד!\n\nגודל: ${(file.size / 1024 / 1024).toFixed(1)}MB\nזמן עיבוד: יותר מ-10 דקות\n\n💡 הבעיה: קבצים מעל 5MB עלולים לגרום ל-timeout\n\n🔧 פתרונות:\n\n1️⃣ דחוס ל-5MB או פחות\n2️⃣ פצל לקבצים של 3-5MB\n3️⃣ העלה רק עמודים חשובים\n4️⃣ צלם תמונות במקום PDF\n\n📌 הצוות עובד על שיפור זה`);
            }

            setProcessingStatus(`ניסיון ${retryCount + 1}/${maxRetries + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          throw new Error('שגיאה בחילוץ תוכן מהקובץ. נסה קובץ קטן יותר.');
        }
      }

      if (!extractResult || extractResult.status !== "success" || !extractResult.output?.content) {
        throw new Error("לא הצלחנו לחלץ תוכן מהקובץ. הקובץ עלול להיות גדול מדי או פגום.");
      }

      const fullContent = extractResult.output.content;
      const totalChars = fullContent.length;
      const totalWords = fullContent.split(/\s+/).length;

      // בדיקה שיש תוכן משמעותי
      if (totalWords < 10) {
        throw new Error("הקובץ כמעט ריק או שלא הצלחנו לקרוא אותו. נסה קובץ אחר.");
      }

      setProcessingProgress(30);
      setProcessingStatus(`נמצאו ${totalWords.toLocaleString()} מילים - מחלק לחתיכות...`);

      // שלב 2: פיצול לחתיכות (כל חתיכה מקסימום 5000 תווים)
      const chunkSize = 5000;
      const chunks = [];
      for (let i = 0; i < fullContent.length; i += chunkSize) {
        chunks.push({
          chunk_index: Math.floor(i / chunkSize),
          content: fullContent.substring(i, i + chunkSize),
          tokens: Math.floor((i + chunkSize > fullContent.length ? fullContent.length - i : chunkSize) / 4)
        });
      }

      setProcessingProgress(50);
      setProcessingStatus(`${chunks.length} חתיכות נוצרו - מנתח תוכן...`);

      // שלב 3: ניתוח חכם של התוכן (רק חלק מהתוכן למהירות)
      const sampleContent = fullContent.substring(0, Math.min(10000, fullContent.length));
      
      const analysisPrompt = `נתח את התוכן הבא ותן:
1. סיכום קצר (2-3 משפטים)
2. 5 מושגי מפתח עם הסברים
3. נושאים עיקריים

תוכן:
${sampleContent}...

השב בעברית בפורמט JSON.`;

      let analysisResult;
      try {
        analysisResult = await base44.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          add_context_from_internet: false,
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              key_concepts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    concept: { type: "string" },
                    explanation: { type: "string" },
                    examples: { type: "array", items: { type: "string" } }
                  }
                }
              },
              topics: { type: "array", items: { type: "string" } }
            }
          }
        });
      } catch (llmError) {
        console.error("LLM analysis error:", llmError);
        // אם הניתוח נכשל, נמשיך בלי אנליזה
        analysisResult = {
          summary: "מסמך שהועלה בהצלחה",
          key_concepts: [],
          topics: []
        };
      }

      setProcessingProgress(80);
      setProcessingStatus('שומר למאגר ידע...');

      // שלב 4: יצירת המסמך
      const newDoc = await base44.entities.KnowledgeDocument.create({
        title: uploadSettings.title || file.name,
        file_type: uploadSettings.fileType,
        file_url: fileUrl,
        content_chunks: chunks,
        total_chars: totalChars,
        total_words: totalWords,
        processing_status: "completed",
        processing_progress: 100,
        subject: uploadSettings.subject,
        unit_level: uploadSettings.unitLevel,
        topics: analysisResult.topics || [],
        key_concepts: analysisResult.key_concepts || [],
        summary: analysisResult.summary || "",
        is_active: true,
        usage_count: 0
      });

      setProcessingProgress(100);
      setProcessingStatus('הושלם! ✅');

      // עדכון
      queryClient.invalidateQueries(['knowledge-documents']);
      if (onKnowledgeUpdated) onKnowledgeUpdated();

      setTimeout(() => {
        setShowUploadDialog(false);
        setSelectedFile(null);
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 1500);

      alert(`✅ "${uploadSettings.title || file.name}" נוסף לבסיס הידע!\n\n📊 ${totalWords.toLocaleString()} מילים\n📚 ${chunks.length} חלקים\n🎯 ${analysisResult.topics?.length || 0} נושאים זוהו`);

    } catch (error) {
      console.error("Error processing file:", error);
      setProcessingStatus("❌ שגיאה");
      setIsProcessing(false);

      let errorMessage = error.message || "שגיאה בעיבוד הקובץ";

      // אם זו לא כבר הודעת שגיאה מפורטת שלנו
      if (!errorMessage.includes('💡') && !errorMessage.includes('פתרונות')) {
        errorMessage = `❌ שגיאה בעיבוד הקובץ\n\n${errorMessage}\n\n💡 נסה:\n• קובץ קטן יותר (מקסימום 10MB)\n• דחיסה חזקה יותר\n• פיצול לקבצים קטנים (3-5MB)`;
      }

      alert(errorMessage);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // בדיקת גודל - מגבלה של 10MB (למניעת timeout)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`⚠️ הקובץ גדול מדי!\n\nגודל: ${(file.size / 1024 / 1024).toFixed(1)}MB\nמקסימום מומלץ: 10MB\n\n💡 למה? קבצים גדולים לוקחים יותר מ-10 דקות לעיבוד וגורמים ל-timeout.\n\n🔧 פתרונות:\n\n1️⃣ דחוס חזק ב-ilovepdf.com (מצב "Extreme")\n2️⃣ פצל ל-2-3 קבצים קטנים\n3️⃣ העלה רק דפים חשובים (לא כל הבגרות)\n4️⃣ צלם תמונות של דפים במקום PDF\n\n📌 המערכת צריכה לעבד את כל התוכן - זה לוקח זמן.`);
      setSelectedFile(null);
      return;
    }

    // אזהרה על קבצים בין 5-10MB
    if (file.size > 5 * 1024 * 1024) {
      const proceed = confirm(`⚠️ הקובץ גדול (${(file.size / 1024 / 1024).toFixed(1)}MB)\n\nהעיבוד עלול לקחת 5-10 דקות.\n\nמומלץ לדחוס או לפצל לקבצים קטנים יותר.\n\nלהמשיך בכל זאת?`);
      if (!proceed) {
        setSelectedFile(null);
        return;
      }
    }

    setSelectedFile(file);
    setUploadSettings({
      ...uploadSettings,
      title: file.name.replace(/\.[^/.]+$/, "")
    });
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: selectedFile
      });

      await processLargeFile(selectedFile, file_url);
    } catch (error) {
      console.error("Error:", error);
      alert("שגיאה בהעלאת הקובץ");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.KnowledgeDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge-documents']);
      if (onKnowledgeUpdated) onKnowledgeUpdated();
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      base44.entities.KnowledgeDocument.update(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge-documents']);
      if (onKnowledgeUpdated) onKnowledgeUpdated();
    }
  });

  const filteredDocs = documents
    .filter(doc => {
      const matchesSearch = !searchQuery ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === "all" || doc.file_type === filterType;
      return matchesSearch && matchesFilter;
    })
    .filter(doc => doc.is_active);

  const totalWords = documents.reduce((sum, doc) => sum + (doc.total_words || 0), 0);
  const totalDocs = documents.filter(d => d.is_active).length;

  return (
    <div className="space-y-6">
      {/* כותרת וסטטיסטיקות */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border-2 border-amber-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-7 h-7 text-amber-600" />
              מאגר הידע שלי
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              המורה החכם לומד מכל הקבצים שאתה מעלה
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={!user?.is_premium}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 h-12"
          >
            <Upload className="w-5 h-5 mr-2" />
            העלה קובץ חדש
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border-2 border-amber-200">
            <div className="text-3xl font-bold text-amber-600">{totalDocs}</div>
            <div className="text-sm text-gray-600">מסמכים</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600">
              {totalWords.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">מילים</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-orange-200">
            <div className="text-3xl font-bold text-orange-600">
              {documents.reduce((sum, d) => sum + (d.usage_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">שימושים</div>
          </div>
        </div>
      </div>

      {/* פילטרים */}
      {documents.length > 0 && (
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="חפש מסמכים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              <SelectItem value="exam">בגרויות</SelectItem>
              <SelectItem value="quiz">בוחנים</SelectItem>
              <SelectItem value="study_guide">חומר לימוד</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="text">טקסט</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* רשימת מסמכים */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-gray-600">טוען מסמכים...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {searchQuery || filterType !== "all" ? "אין תוצאות" : "עדיין אין מסמכי ידע"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterType !== "all"
              ? "נסה חיפוש או פילטר אחר"
              : "העלה בגרויות, בוחנים, וחומרי לימוד"
            }
          </p>
          {!searchQuery && filterType === "all" && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!user?.is_premium}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              העלה קובץ ראשון
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredDocs.map((doc) => {
              const Icon = fileTypeIcons[doc.file_type] || File;
              const isExpanded = expandedDoc === doc.id;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-xl border-2 border-gray-200 hover:border-amber-400 transition-all overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        doc.file_type === 'exam' ? 'bg-red-100' :
                        doc.file_type === 'quiz' ? 'bg-blue-100' :
                        doc.file_type === 'study_guide' ? 'bg-green-100' :
                        'bg-gray-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          doc.file_type === 'exam' ? 'text-red-600' :
                          doc.file_type === 'quiz' ? 'text-blue-600' :
                          doc.file_type === 'study_guide' ? 'text-green-600' :
                          'text-gray-600'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{doc.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                                {fileTypeLabels[doc.file_type]}
                              </span>
                              {doc.subject && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {doc.subject} • {doc.unit_level} יח'
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {doc.summary && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {doc.summary}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {doc.total_words?.toLocaleString()} מילים
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {doc.usage_count || 0} שימושים
                          </span>
                          {doc.topics && doc.topics.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Book className="w-3 h-3" />
                              {doc.topics.length} נושאים
                            </span>
                          )}
                        </div>

                        {doc.topics && doc.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {doc.topics.slice(0, 5).map((topic, idx) => (
                              <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                                {topic}
                              </span>
                            ))}
                            {doc.topics.length > 5 && (
                              <span className="text-xs text-gray-500">+{doc.topics.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActiveMutation.mutate({ id: doc.id, isActive: doc.is_active })}
                        >
                          {doc.is_active ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`למחוק את "${doc.title}"?`)) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* פרטים מורחבים */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t-2 border-gray-100"
                        >
                          {doc.key_concepts && doc.key_concepts.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                                🎯 מושגי מפתח:
                              </h4>
                              <div className="space-y-2">
                                {doc.key_concepts.map((concept, idx) => (
                                  <div key={idx} className="bg-blue-50 rounded-lg p-3">
                                    <div className="font-semibold text-blue-900 text-sm">
                                      {concept.concept}
                                    </div>
                                    <div className="text-xs text-blue-700 mt-1">
                                      {concept.explanation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            <div>📅 הועלה: {new Date(doc.created_date).toLocaleString('he-IL')}</div>
                            <div>📦 {doc.content_chunks?.length || 0} חתיכות תוכן</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Input נסתר */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* דיאלוג העלאה */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Upload className="w-6 h-6 text-amber-600" />
              העלאת קובץ ידע חדש
            </DialogTitle>
            <DialogDescription>
              המורה החכם ילמד את כל התוכן (מומלץ עד 10MB)
            </DialogDescription>
            <p className="text-xs text-slate-500">מומלץ: PDF עד 10MB</p>
            <p className="text-xs text-slate-400 mt-1">⚠️ קבצים גדולים יותר עלולים להיכשל</p>
          </DialogHeader>

          {!isProcessing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  שם המסמך
                </label>
                <Input
                  value={uploadSettings.title}
                  onChange={(e) => setUploadSettings({ ...uploadSettings, title: e.target.value })}
                  placeholder="לדוגמה: בגרות מתמטיקה 2023 קיץ"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  סוג הקובץ
                </label>
                <Select
                  value={uploadSettings.fileType}
                  onValueChange={(v) => setUploadSettings({ ...uploadSettings, fileType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">📝 בגרות</SelectItem>
                    <SelectItem value="quiz">📋 בוחן</SelectItem>
                    <SelectItem value="study_guide">📚 חומר לימוד</SelectItem>
                    <SelectItem value="pdf">📄 PDF כללי</SelectItem>
                    <SelectItem value="text">📃 טקסט</SelectItem>
                    <SelectItem value="other">📁 אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    מקצוע
                  </label>
                  <Input
                    value={uploadSettings.subject}
                    onChange={(e) => setUploadSettings({ ...uploadSettings, subject: e.target.value })}
                    placeholder="מתמטיקה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    יחידות
                  </label>
                  <Select
                    value={uploadSettings.unitLevel?.toString()}
                    onValueChange={(v) => setUploadSettings({ ...uploadSettings, unitLevel: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 יחידות</SelectItem>
                      <SelectItem value="4">4 יחידות</SelectItem>
                      <SelectItem value="5">5 יחידות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-green-900">{selectedFile.name}</div>
                      <div className="text-sm text-green-700">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <strong>מה יקרה:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>✓ הקובץ יעובד (5-10 דקות לקבצים גדולים)</li>
                      <li>✓ המערכת תזהה נושאים ומושגי מפתח</li>
                      <li>✓ המורה החכם ישתמש במידע בכל שיחה</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <strong className="text-blue-700">💡 טיפ חשוב:</strong>
                      <p className="text-xs mt-1">קבצים מעל 10MB עלולים להיכשל. דחסו או פצלו אותם!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8">
              <div className="text-center mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-amber-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {processingStatus}
                </h3>
                <p className="text-sm text-gray-600">
                  זה יכול לקחת מספר דקות לקבצים גדולים...
                </p>
              </div>

              <Progress value={processingProgress} className="h-3" />

              <div className="mt-2 text-center text-sm font-semibold text-amber-600">
                {processingProgress}%
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
              }}
              disabled={isProcessing}
            >
              ביטול
            </Button>
            {!isProcessing && (
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadSettings.title}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                התחל עיבוד
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
