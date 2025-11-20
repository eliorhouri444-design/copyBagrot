import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileText, Copy, Eye, Download, Trash2, Sparkles, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminBulkImportPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rawInput, setRawInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [results, setResults] = useState(null);
  
  const [subject, setSubject] = useState("");
  const [units, setUnits] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [availableTopics, setAvailableTopics] = useState([]);
  const [readingStory, setReadingStory] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
        setSubject(currentUser.selected_subject || "אנגלית");
        setUnits(currentUser.selected_units?.toString() || "3");
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (subject && units) {
      loadTopics();
    }
  }, [subject, units]);

  const loadTopics = async () => {
    try {
      const topics = await base44.entities.TopicNew.filter({
        subject_id: subject,
        unit_level: parseInt(units),
        is_active: true
      });
      const sorted = topics.sort((a, b) => (a.order || 0) - (b.order || 0));
      setAvailableTopics(sorted);
    } catch (error) {
      console.error("Error loading topics:", error);
      setAvailableTopics([]);
    }
  };

  const handleProcess = async () => {
    if (!rawInput.trim()) {
      toast.error("אנא הזן נתונים לעיבוד");
      return;
    }

    if (!subject || !units) {
      toast.error("אנא בחר מקצוע ויחידות");
      return;
    }
    
    if (!selectedTopicId || selectedTopicId.trim() === '') {
      toast.error("⚠️ חובה לבחור נושא לפני העיבוד!");
      return;
    }
    
    console.log('🚀 Processing with:', { subject, units, selectedTopicId });

    setIsProcessing(true);
    toast.loading("מעבד...");

    try {
      const response = await base44.functions.invoke('processBulkImport', {
        raw_input: rawInput,
        subject: subject,
        units: parseInt(units),
        topic_id: selectedTopicId,
        reading_story: readingStory.trim() || null
      });

      toast.dismiss();

      if (response?.data?.success) {
        setPreviewQuestions(response.data.questions || []);
        toast.success(`✅ ${response.data.questions.length} שאלות מוכנות!`);
      } else {
        toast.error("שגיאה: " + (response?.data?.error || "לא ידוע"));
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast.dismiss();
      toast.error("שגיאה: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (previewQuestions.length === 0) {
      toast.error("אין שאלות לייבוא");
      return;
    }

    setIsProcessing(true);
    toast.loading("מייבא...");

    try {
      let addedCount = 0;
      let errors = [];
      
      for (let i = 0; i < previewQuestions.length; i++) {
        const q = previewQuestions[i];
        try {
          console.log(`📝 Importing Q${i + 1}:`, {
            question_id: q.question_id,
            subject_id: q.subject_id,
            unit_level: q.unit_level,
            topic_id: q.topic_id
          });

          await base44.entities.QuestionBank.create({
            question_id: q.question_id,
            subject_id: q.subject_id,
            unit_level: q.unit_level,
            topic_id: q.topic_id,
            question_text: q.question_text,
            question_type: q.question_type,
            max_score: q.max_score,
            difficulty_level: q.difficulty_level,
            reading_text: q.reading_text || null,
            options: q.options || null,
            origin_type: "teacher_custom",
            is_active: true
          });

          if (q.question_type !== "writing") {
            await base44.entities.SolutionBank.create({
              question_id: q.question_id,
              solution_text: q.answer || "",
              final_answers: [{ part_id: "main", value: q.answer || "" }],
              verified: false
            });
          }

          console.log(`✅ Q${i + 1} imported successfully`);
          addedCount++;
        } catch (err) {
          console.error(`❌ Error importing Q${i + 1}:`, err);
          errors.push(`שאלה ${i + 1}: ${err.message}`);
        }
      }

      toast.dismiss();
      
      if (errors.length > 0) {
        console.error("Import errors:", errors);
        toast.error(`יובאו ${addedCount}/${previewQuestions.length} שאלות. שגיאות: ${errors.slice(0, 3).join(', ')}`);
      } else {
        toast.success(`✅ ${addedCount} שאלות יובאו בהצלחה!`);
      }
      
      setResults({ questionsAdded: addedCount, errors: errors.length });
      setPreviewQuestions([]);
      setRawInput("");
      setReadingStory("");
    } catch (error) {
      console.error("Import error:", error);
      toast.dismiss();
      toast.error("שגיאה: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteQuestion = (index) => {
    setPreviewQuestions(prev => prev.filter((_, i) => i !== index));
    toast.success("השאלה הוסרה");
  };

  const handleToggleSelectQuestion = (index) => {
    setSelectedQuestions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === previewQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(previewQuestions.map((_, i) => i));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedQuestions.length === 0) {
      toast.error("לא נבחרו שאלות למחיקה");
      return;
    }

    const count = selectedQuestions.length;
    setPreviewQuestions(prev => prev.filter((_, i) => !selectedQuestions.includes(i)));
    setSelectedQuestions([]);
    toast.success(`${count} שאלות נמחקו`);
  };

  const handleEditQuestion = (index, field, value) => {
    setPreviewQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const exampleFormats = [
    {
      title: "פורמט פשוט",
      example: `What is 2+2? | 4
The capital of France? | Paris
תרגם: שלום | Hello`
    },
    {
      title: "עם סיפור",
      example: `Story: Tom went to the park yesterday. He played football with his friends and had a great time. They stayed until sunset.
Q: Where did Tom go? | To the park
Q: When did Tom go? | Yesterday
Q: What did he play? | Football
Q: Who did he play with? | His friends`
    },
    {
      title: "שאלות כתיבה",
      example: `[WRITING] Write about your favorite hobby (80-100 words) | writing
[WRITING] Describe a memorable trip you took | writing
[WRITING] What would you do with a million dollars? | writing`
    },
    {
      title: "Extended Reading",
      example: `[EXTENDED_READING]
Many students today use technology. They often sit in front of screens for schoolwork and entertainment. However, one school decided to try something different.

Three years ago, the school started a program called 'Outdoor Challenge.' Students had to spend one hour outside each week. At first, students did not like the idea. But after a few weeks, something surprising happened.

Students felt more energetic. Some said their grades improved. Teachers noticed the difference too. Today, the program is very popular.

[QUESTIONS]
What is the 'Outdoor Challenge' program? | A program to get students outside
Why did students not like it at first? | They thought it was boring
What happened after a few weeks? | Students felt more energetic
[END]`
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Bulk Import</h1>
            <p className="text-white/80">ייבוא המוני של שאלות</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* הגדרות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">📍 יעד השאלות</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">מקצוע *</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                  <SelectItem value="כימיה">כימיה</SelectItem>
                  <SelectItem value="ביולוגיה">ביולוגיה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">יחידות *</label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="0">ללא</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">נושא *</label>
              <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר נושא" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {availableTopics.map(t => (
                    <SelectItem key={t.topic_id} value={t.topic_id}>
                      {t.icon} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* דוגמאות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200"
        >
          <h2 className="text-xl font-bold mb-4">📝 פורמטים נתמכים</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exampleFormats.map((format, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-sm">{format.title}</h3>
                  <Button
                    onClick={() => {
                      setRawInput(format.example);
                      toast.success("הועתק!");
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                  {format.example}
                </pre>
              </div>
            ))}
          </div>
        </motion.div>

        {/* סיפור/טקסט קריאה (אופציונלי) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-indigo-200"
        >
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            📖 סיפור/טקסט קריאה (אופציונלי)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            עבור vocabulary & grammar ב-4/5 יחידות - הדבק כאן את הסיפור שכל השאלות מבוססות עליו
          </p>

          <Textarea
            value={readingStory}
            onChange={(e) => setReadingStory(e.target.value)}
            placeholder="Paste the reading text here (in English)...&#10;&#10;Example:&#10;Last summer, a group of students..."
            className="min-h-[200px] font-mono text-sm"
            dir="ltr"
          />
        </motion.div>

        {/* קלט */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">📥 הדבק שאלות</h2>

          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="הדבק כאן עד 500 שאלות:&#10;&#10;Question | Answer&#10;Question | Answer&#10;&#10;או:&#10;&#10;Q: ... | Answer&#10;Q: ... | Answer"
            className="min-h-[400px] font-mono text-sm"
          />

          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !rawInput.trim() || !selectedTopicId}
              className="flex-1 h-12 text-lg font-bold bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2" />
                  מעבד...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 ml-2" />
                  עבד והצג Preview
                </>
              )}
            </Button>
            
            <Button
              onClick={() => {
                setRawInput("");
                setReadingStory("");
              }}
              variant="outline"
              className="h-12"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Preview */}
        {previewQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-bold">✅ {previewQuestions.length} שאלות מוכנות</h2>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  className="h-10"
                >
                  {selectedQuestions.length === previewQuestions.length ? "בטל בחירה" : "בחר הכל"}
                </Button>
                {selectedQuestions.length > 0 && (
                  <Button
                    onClick={handleDeleteSelected}
                    variant="outline"
                    className="h-10 border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק {selectedQuestions.length} שאלות
                  </Button>
                )}
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 h-10 font-bold"
                >
                  <Upload className="w-4 h-4 ml-2" />
                  ייבא הכל
                </Button>
              </div>
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {Array.from({ length: Math.ceil(previewQuestions.length / 10) }, (_, setIndex) => {
                const setStart = setIndex * 10;
                const setEnd = Math.min(setStart + 10, previewQuestions.length);
                const setQuestions = previewQuestions.slice(setStart, setEnd);
                
                return (
                  <div key={setIndex} className="border-2 border-blue-300 rounded-2xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-200">
                      <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                          {setIndex + 1}
                        </div>
                        סט {setIndex + 1}
                      </h3>
                      <div className="text-sm text-gray-600 font-semibold">
                        {setQuestions.length} שאלות ({setStart + 1}-{setEnd})
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {setQuestions.map((q, localIdx) => {
                        const idx = setStart + localIdx;
                        return (
                          <div
                            key={idx}
                            className={`bg-white rounded-xl p-4 border-2 shadow-sm transition-colors ${
                              selectedQuestions.includes(idx) ? 'border-blue-500 bg-blue-50' : 'border-blue-200'
                            }`}
                          >
                          {editingIndex === idx ? (
                    <div className="space-y-3">
                      <Input
                        value={q.question_text}
                        onChange={(e) => handleEditQuestion(idx, 'question_text', e.target.value)}
                        className="font-bold"
                      />
                      <Input
                        value={q.answer}
                        onChange={(e) => handleEditQuestion(idx, 'answer', e.target.value)}
                        placeholder="תשובה"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingIndex(null)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 ml-2" />
                          שמור
                        </Button>
                        <Button
                          onClick={() => setEditingIndex(null)}
                          variant="outline"
                        >
                          ביטול
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(idx)}
                        onChange={() => handleToggleSelectQuestion(idx)}
                        className="w-5 h-5 mt-1 cursor-pointer accent-blue-600"
                      />
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-2">{q.question_text}</div>
                        
                        {q.reading_text && (
                          <div className="bg-amber-50 rounded-lg p-3 mb-2 border border-amber-200 text-sm">
                            📖 {q.reading_text.substring(0, 100)}...
                          </div>
                        )}

                        {q.question_type !== "writing" && (
                          <div className="bg-green-100 rounded-lg p-2 border border-green-200 mb-2">
                            <span className="text-xs font-bold text-green-800">✓ תשובה: </span>
                            <span className="text-sm text-gray-900">{q.answer}</span>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {q.question_type === "writing" ? "✍️ כתיבה" : q.question_type === "multi_choice" ? "רב-בריירה" : "פתוחה"}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {q.max_score} נק׳
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {q.difficulty_level}
                          </span>
                          <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                            {q.subject_id}
                          </span>
                          <span className="text-xs bg-purple-100 px-2 py-1 rounded">
                            {q.topic_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          onClick={() => setEditingIndex(idx)}
                          variant="ghost"
                          size="sm"
                          className="h-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteQuestion(idx)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* תוצאות */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              הצלחה!
            </h2>
            
            <div className="bg-green-50 rounded-xl p-6 text-center border-2 border-green-200">
              <div className="text-5xl font-bold text-green-600 mb-2">{results.questionsAdded}</div>
              <div className="text-lg text-gray-700">שאלות נוספו למערכת</div>
              <div className="text-sm text-gray-600 mt-2">
                📍 {subject} • {units} יחידות • נושא: {availableTopics.find(t => t.topic_id === selectedTopicId)?.name}
              </div>
              {readingStory && (
                <div className="text-sm text-purple-600 mt-2">
                  📖 כולל reading text משותף
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}