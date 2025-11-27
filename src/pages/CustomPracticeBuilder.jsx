import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sliders, ArrowLeft, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";

export default function CustomPracticeBuilderPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allTopics, setAllTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [difficulty, setDifficulty] = useState("all");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState("all");
  const [focusOn, setFocusOn] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const topics = await base44.entities.TopicNew.filter({
        subject_id: currentUser.selected_subject,
        unit_level: currentUser.selected_units,
        is_active: true
      });

      setAllTopics(topics);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleToggleTopic = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleStartPractice = async () => {
    if (selectedTopics.length === 0) {
      alert("בחר לפחות נושא אחד");
      return;
    }

    try {
      // Get all questions from selected topics
      const allQuestions = await base44.entities.QuestionBank.list();
      let filteredQuestions = allQuestions.filter(q => 
        selectedTopics.includes(q.topic_id) && 
        q.is_active === true &&
        q.subject_id === user.selected_subject
      );

      // Filter by difficulty
      if (difficulty !== "all") {
        filteredQuestions = filteredQuestions.filter(q => q.difficulty_level === difficulty);
      }

      // Filter by question type
      if (questionType !== "all") {
        filteredQuestions = filteredQuestions.filter(q => q.question_type === questionType);
      }

      // Focus on weak areas
      if (focusOn === "weak") {
        const attempts = await base44.entities.AttemptNew.list("-created_date", 200);
        const failedQuestionIds = new Set(
          attempts
            .filter(a => a.status === "incorrect" || a.percentage < 60)
            .map(a => a.question_id)
        );
        filteredQuestions = filteredQuestions.filter(q => failedQuestionIds.has(q.question_id));
      } else if (focusOn === "new") {
        const attempts = await base44.entities.AttemptNew.list("-created_date", 200);
        const attemptedQuestionIds = new Set(attempts.map(a => a.question_id));
        filteredQuestions = filteredQuestions.filter(q => !attemptedQuestionIds.has(q.question_id));
      }

      if (filteredQuestions.length === 0) {
        alert("לא נמצאו שאלות מתאימות לקריטריונים שבחרת");
        return;
      }

      // Shuffle and limit
      const shuffled = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, questionCount);
      
      // Create custom practice session
      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "custom",
        subject_id: user.selected_subject,
        unit_level: user.selected_units,
        questions: shuffled.map(q => q.question_id),
        started_at: new Date().toISOString(),
        is_completed: false
      });

      // Navigate to practice with session ID
      navigate(createPageUrl(`TopicPracticeNew?sessionId=${session.id}`));
    } catch (error) {
      console.error("Error starting practice:", error);
      alert("שגיאה ביצירת התרגול");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("Practice"))}
          className="text-right flex-1 hover:opacity-90 transition-opacity"
        >
          <h1 className="text-[16px] font-bold text-white">תרגול מותאם אישית</h1>
          <p className="text-[11px] text-white/90">התאם את התרגול לצרכים שלך</p>
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Sliders className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Topics Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <h3 className="text-base font-bold text-white">בחר נושאים לתרגול</h3>
          </div>
          <div className="p-4 space-y-2">
            {allTopics.map((topic) => (
              <label
                key={topic.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedTopics.includes(topic.topic_id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Checkbox
                  checked={selectedTopics.includes(topic.topic_id)}
                  onCheckedChange={() => handleToggleTopic(topic.topic_id)}
                />
                <span className="text-xl">{topic.icon}</span>
                <span className="font-semibold text-gray-900 flex-1">{topic.name}</span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <h3 className="text-base font-bold text-white">הגדרות תרגול</h3>
          </div>
          <div className="p-4">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">מספר שאלות</label>
              <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 שאלות</SelectItem>
                  <SelectItem value="10">10 שאלות</SelectItem>
                  <SelectItem value="15">15 שאלות</SelectItem>
                  <SelectItem value="20">20 שאלות</SelectItem>
                  <SelectItem value="30">30 שאלות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">רמת קושי</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="easy">קל</SelectItem>
                  <SelectItem value="medium">בינוני</SelectItem>
                  <SelectItem value="hard">קשה</SelectItem>
                  <SelectItem value="expert">מומחה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">סוג שאלה</label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="open">פתוחה</SelectItem>
                  <SelectItem value="multi_choice">רב ברירה</SelectItem>
                  <SelectItem value="fill_in_blank">השלמה</SelectItem>
                  <SelectItem value="writing">כתיבה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">התמקד ב</label>
              <Select value={focusOn} onValueChange={setFocusOn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="weak">שאלות שטעיתי בהן</SelectItem>
                  <SelectItem value="new">שאלות חדשות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <h3 className="text-base font-bold text-white">סיכום התרגול</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <div>✓ {selectedTopics.length} נושאים נבחרו</div>
              <div>✓ {questionCount} שאלות</div>
              <div>✓ רמת קושי: {difficulty === "all" ? "כל הרמות" : difficulty}</div>
              <div>✓ התמקדות: {focusOn === "all" ? "כל השאלות" : focusOn === "weak" ? "שאלות חלשות" : "שאלות חדשות"}</div>
            </div>

            <Button
              onClick={handleStartPractice}
              disabled={selectedTopics.length === 0}
              className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold text-[15px] rounded-[14px]"
            >
              <Play className="w-5 h-5 ml-2" />
              התחל תרגול
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}