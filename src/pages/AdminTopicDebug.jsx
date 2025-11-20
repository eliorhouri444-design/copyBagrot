import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, AlertCircle, CheckCircle, Wrench, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminTopicDebugPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('אנגלית');
  const [selectedUnits, setSelectedUnits] = useState(3);
  const [mismatches, setMismatches] = useState([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const [resetLog, setResetLog] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
        
        if (currentUser?.selected_subject) {
          setSelectedSubject(currentUser.selected_subject);
        }
        if (currentUser?.selected_units) {
          setSelectedUnits(currentUser.selected_units);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: topics, refetch: refetchTopics } = useQuery({
    queryKey: ['topics', selectedSubject, selectedUnits],
    queryFn: async () => {
      const allTopics = await base44.entities.Topic.list("order", 100);
      return allTopics.filter(t => 
        t.subject === selectedSubject && 
        t.unit_level === selectedUnits
      );
    },
    initialData: [],
  });

  const { data: questions, refetch: refetchQuestions } = useQuery({
    queryKey: ['questions', selectedSubject, selectedUnits],
    queryFn: async () => {
      const allQuestions = await base44.entities.PracticeQuestion.list("-created_date", 500);
      return allQuestions.filter(q => 
        q.subject === selectedSubject && 
        q.units === selectedUnits
      );
    },
    initialData: [],
  });

  const addLog = (message, type = 'info') => {
    setResetLog(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (topics.length > 0 && questions.length > 0) {
      const topicKeys = topics.map(t => t.topic_key.trim().toLowerCase());
      const foundMismatches = [];

      questions.forEach(q => {
        const questionTopic = (q.topic || '').trim().toLowerCase();
        
        const exactMatch = topicKeys.includes(questionTopic);
        const partialMatch = topicKeys.find(tk => 
          tk.includes(questionTopic) || questionTopic.includes(tk)
        );
        const normalizedMatch = topicKeys.find(tk => 
          tk.replace(/[-_\s]/g, '') === questionTopic.replace(/[-_\s]/g, '')
        );
        
        if (!exactMatch && questionTopic) {
          const suggestedTopic = topics.find(t => 
            t.topic_key.trim().toLowerCase() === (partialMatch || normalizedMatch)
          );
          
          foundMismatches.push({
            questionId: q.id,
            questionTopic: q.topic,
            questionText: q.question_text.substring(0, 80),
            suggestedFix: suggestedTopic?.topic_key || null,
            matchType: partialMatch ? 'partial' : normalizedMatch ? 'normalized' : 'none'
          });
        }
      });

      setMismatches(foundMismatches);
    }
  }, [topics, questions]);

  const fixQuestionMutation = useMutation({
    mutationFn: ({ questionId, newTopic }) => 
      base44.entities.PracticeQuestion.update(questionId, { topic: newTopic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['all-practice-questions'] });
    },
  });

  const fixAllMutation = useMutation({
    mutationFn: async () => {
      const fixes = mismatches
        .filter(m => m.suggestedFix)
        .map(m => 
          base44.entities.PracticeQuestion.update(m.questionId, { topic: m.suggestedFix })
        );
      await Promise.all(fixes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['all-practice-questions'] });
      alert(`✅ תוקנו ${mismatches.filter(m => m.suggestedFix).length} אי-התאמות!`);
    },
  });

  const handleResetAndRebuild = async () => {
    setIsResetting(true);
    setResetProgress(0);
    setResetLog([]);

    try {
      addLog('🚀 מתחיל תהליך איפוס ובנייה מחדש', 'info');
      
      // שלב 1: מחיקת שאלות קיימות
      setResetProgress(10);
      addLog(`🗑️ מוחק ${questions.length} שאלות קיימות...`, 'info');
      
      for (const q of questions) {
        await base44.entities.PracticeQuestion.delete(q.id);
      }
      addLog('✅ כל השאלות נמחקו', 'success');
      
      setResetProgress(30);
      
      // שלב 2: יצירת נושאים סטנדרטיים
      addLog('📚 בודק ויוצר נושאים סטנדרטיים...', 'info');
      
      const standardTopics = [
        {
          subject: selectedSubject,
          unit_level: selectedUnits,
          title: "אוצר מילים",
          subtitle: "Vocabulary",
          description: "לימוד מילים חדשות וביטויים",
          topic_key: "vocabulary",
          order: 1,
          target_items: 50,
          weight: 20,
          color: "from-green-500 to-green-600",
          icon: "FileText",
          is_premium: false
        },
        {
          subject: selectedSubject,
          unit_level: selectedUnits,
          title: "הבנת הנקרא",
          subtitle: "Reading Comprehension",
          description: "קריאה והבנת טקסטים",
          topic_key: "reading_comprehension",
          order: 2,
          target_items: 50,
          weight: 25,
          color: "from-blue-500 to-blue-600",
          icon: "BookText",
          is_premium: false
        },
        {
          subject: selectedSubject,
          unit_level: selectedUnits,
          title: "דקדוק",
          subtitle: "Grammar",
          description: "כללי דקדוק ומבנה משפטים",
          topic_key: "grammar",
          order: 3,
          target_items: 50,
          weight: 25,
          color: "from-purple-500 to-purple-600",
          icon: "Languages",
          is_premium: false
        },
        {
          subject: selectedSubject,
          unit_level: selectedUnits,
          title: "כתיבה",
          subtitle: "Writing",
          description: "כתיבת חיבורים וטקסטים",
          topic_key: "writing",
          order: 4,
          target_items: 30,
          weight: 15,
          color: "from-pink-500 to-pink-600",
          icon: "Pencil",
          is_premium: false
        },
        {
          subject: selectedSubject,
          unit_level: selectedUnits,
          title: "שמיעה",
          subtitle: "Listening",
          description: "הבנת טקסטים מוקלטים",
          topic_key: "listening",
          order: 5,
          target_items: 30,
          weight: 15,
          color: "from-orange-500 to-orange-600",
          icon: "Headphones",
          is_premium: false
        }
      ];

      const existingTopicKeys = topics.map(t => t.topic_key);
      const topicsToCreate = standardTopics.filter(t => !existingTopicKeys.includes(t.topic_key));
      
      for (const topic of topicsToCreate) {
        await base44.entities.Topic.create(topic);
        addLog(`✅ נוצר נושא: ${topic.title}`, 'success');
      }
      
      await refetchTopics();
      const updatedTopics = (await base44.entities.Topic.list("order", 100)).filter(t => 
        t.subject === selectedSubject && t.unit_level === selectedUnits
      );
      
      addLog(`📚 סה"כ ${updatedTopics.length} נושאים`, 'success');
      setResetProgress(50);

      // שלב 3: יצירת שאלות לכל נושא - בלי AI, ידני למטרות בדיקה
      addLog('📝 יוצר שאלות לכל נושא (ללא AI)...', 'info');
      
      let totalCreated = 0;
      
      for (const topic of updatedTopics) {
        addLog(`🔄 יוצר שאלות עבור: ${topic.title}`, 'info');
        
        const sampleQuestions = [];
        
        // יצירת 5 שאלות לדוגמה לכל נושא
        for (let i = 1; i <= 5; i++) {
          sampleQuestions.push({
            question_text: `Sample question ${i} for ${topic.title}`,
            question_type: "multiple_choice",
            category: topic.topic_key === "vocabulary" ? "vocabulary" :
                     topic.topic_key === "reading_comprehension" ? "reading" :
                     topic.topic_key === "grammar" ? "grammar" :
                     topic.topic_key === "writing" ? "writing" : "listening",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answers: ["Option A"],
            explanation: `זוהי שאלת דוגמה ${i} עבור ${topic.title}`,
            explanation_image: "",
            example_text: "",
            points: 10,
            topic: topic.topic_key,  // ✅ התאמה מדויקת!
            module: "A",
            difficulty: "intermediate",
            auto_difficulty: false,
            subject: selectedSubject,
            units: selectedUnits,
            word_limit: 0,
            audio_url: "",
            audio_transcript: "",
            matching_pairs: [],
            is_premium: false,
            tts_enabled: false
          });
        }
        
        try {
          await base44.entities.PracticeQuestion.bulkCreate(sampleQuestions);
          totalCreated += sampleQuestions.length;
          addLog(`✅ נוצרו ${sampleQuestions.length} שאלות עבור ${topic.title}`, 'success');
        } catch (error) {
          addLog(`❌ שגיאה ביצירת שאלות עבור ${topic.title}: ${error.message}`, 'error');
        }
        
        setResetProgress(50 + ((updatedTopics.indexOf(topic) + 1) / updatedTopics.length) * 40);
      }

      setResetProgress(95);
      addLog('🔄 מרענן נתונים...', 'info');
      
      await refetchQuestions();
      await queryClient.invalidateQueries({ queryKey: ['all-practice-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
      
      setResetProgress(100);
      addLog(`✅ הושלם! נוצרו ${totalCreated} שאלות`, 'success');
      
      setTimeout(() => {
        alert(`🎉 המערכת אופסה ונבנתה מחדש בהצלחה!\n\n✅ ${totalCreated} שאלות נוצרו\n✅ ${updatedTopics.length} נושאים מוכנים\n\nכעת אתה יכול לצפות בנושאים בדף התרגול!`);
        setShowResetDialog(false);
        setIsResetting(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error resetting:", error);
      addLog(`❌ שגיאה: ${error.message}`, 'error');
      alert(`❌ אירעה שגיאה: ${error.message}`);
      setIsResetting(false);
    }
  };

  const topicKeys = topics.map(t => t.topic_key);
  const questionTopics = [...new Set(questions.map(q => q.topic))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-purple-600 rounded-2xl p-6 shadow-xl mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("AdminPractice"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">כלי ניהול נושאים ושאלות</h1>
          <p className="text-white/90">איפוס, בדיקה ותיקון אוטומטי</p>
        </div>

        {/* כפתור איפוס */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8" />
            <div>
              <h3 className="text-xl font-bold">איפוס מלא ובנייה מחדש</h3>
              <p className="text-white/90 text-sm">מוחק הכל ויוצר נושאים ושאלות חדשים</p>
            </div>
          </div>
          <Button
            onClick={() => setShowResetDialog(true)}
            disabled={isResetting}
            className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            התחל איפוס ובנייה
          </Button>
        </div>

        {/* סטטיסטיקות */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{topics.length}</div>
            <div className="text-sm text-gray-600">נושאים קיימים</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{questions.length}</div>
            <div className="text-sm text-gray-600">שאלות קיימות</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-red-600">{mismatches.length}</div>
            <div className="text-sm text-gray-600">אי-התאמות</div>
          </div>
        </div>

        {/* תצוגת נושאים ושאלות */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🔖 נושאים (topic_key)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topicKeys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <code className="font-mono text-gray-900">{key}</code>
                </div>
              ))}
              {topicKeys.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">אין נושאים</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📝 נושאים בשאלות (topic)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {questionTopics.map((topic, idx) => {
                const isMatch = topicKeys.some(key => 
                  key.trim().toLowerCase() === (topic || '').trim().toLowerCase()
                );
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                      isMatch 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {isMatch ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <code className="font-mono text-gray-900">{topic || '(ריק)'}</code>
                  </div>
                );
              })}
              {questionTopics.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">אין שאלות</div>
              )}
            </div>
          </div>
        </div>

        {/* אי-התאמות */}
        {mismatches.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-600">⚠️ {mismatches.length} אי-התאמות</h3>
              <Button
                onClick={() => fixAllMutation.mutate()}
                disabled={fixAllMutation.isPending || mismatches.filter(m => m.suggestedFix).length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Wrench className="w-4 h-4 mr-2" />
                תקן הכל
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mismatches.map((mismatch, idx) => (
                <div key={idx} className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">שאלה:</div>
                      <div className="text-sm text-gray-700 mb-2 truncate">{mismatch.questionText}...</div>
                      
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-red-600 font-mono bg-white px-2 py-1 rounded border border-red-300">
                          ❌ "{mismatch.questionTopic}"
                        </span>
                        {mismatch.suggestedFix && (
                          <>
                            <span>→</span>
                            <span className="text-green-600 font-mono bg-white px-2 py-1 rounded border border-green-300">
                              ✅ "{mismatch.suggestedFix}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {mismatch.suggestedFix && (
                      <Button
                        size="sm"
                        onClick={() => fixQuestionMutation.mutate({
                          questionId: mismatch.questionId,
                          newTopic: mismatch.suggestedFix
                        })}
                        disabled={fixQuestionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 flex-shrink-0 text-xs"
                      >
                        תקן
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mismatches.length === 0 && questions.length > 0 && topics.length > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-semibold">
              ✅ מצוין! כל השאלות מקושרות נכון לנושאים!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* דיאלוג איפוס */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              איפוס ובנייה מחדש
            </DialogTitle>
            <DialogDescription>
              מערכת תמחק ותיצור מחדש את כל הנתונים
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!isResetting ? (
              <>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">📋 מה יקרה:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ מחיקת כל השאלות הקיימות</li>
                    <li>✓ יצירת 5 נושאים סטנדרטיים</li>
                    <li>✓ יצירת 5 שאלות לדוגמה לכל נושא</li>
                    <li>✓ בדיקת תקינות מלאה</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-900 mb-2">✨ יתרונות:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ התאמה מושלמת בין נושאים לשאלות</li>
                    <li>✓ מערכת נקייה ומסודרת</li>
                    <li>✓ פועל מיד בלי בעיות</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>מתקדם...</span>
                    <span className="font-bold">{resetProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
                      style={{ width: `${resetProgress}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {resetLog.map((log, idx) => (
                    <div key={idx} className={`text-xs p-2 rounded ${
                      log.type === 'success' ? 'bg-green-50 text-green-800' :
                      log.type === 'error' ? 'bg-red-50 text-red-800' :
                      'bg-blue-50 text-blue-800'
                    }`}>
                      <span className="font-mono text-gray-500">[{log.time}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={isResetting}
            >
              {isResetting ? 'סגור' : 'ביטול'}
            </Button>
            {!isResetting && (
              <Button
                onClick={handleResetAndRebuild}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                התחל איפוס
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}