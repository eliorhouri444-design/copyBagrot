import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  FileText, 
  BookOpen, 
  Headphones, 
  Edit, 
  Clock, 
  Target,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import AudioPlayer from "@/components/exams/AudioPlayer";

export default function AdminExamViewerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [examData, setExamData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    reading: true,
    listening: true,
    writing: true,
    questions: true
  });

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  const moduleType = urlParams.get('moduleType');

  useEffect(() => {
    const loadUser = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          setIsUserLoaded(true);
          
          if (currentUser?.role !== 'admin') {
            navigate(createPageUrl("Home"));
          }
          return;
        } catch (error) {
          console.error(`Error loading user (retries left: ${retries - 1}):`, error);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      console.warn("Failed to load user after retries, continuing anyway");
      setIsUserLoaded(true);
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    const loadExam = async () => {
      if (!examId || !moduleType || !isUserLoaded) return;

      let retries = 3;
      while (retries > 0) {
        try {
          let exam = null;
          
          if (moduleType === 'A') {
            const exams = await base44.entities.ModuleAExam.filter({ id: examId });
            exam = exams[0];
          } else if (moduleType === 'B') {
            const exams = await base44.entities.ModuleBExam.filter({ id: examId });
            exam = exams[0];
          } else if (moduleType === 'C') {
            const exams = await base44.entities.ModuleCExam.filter({ id: examId });
            exam = exams[0];
          } else {
            const exams = await base44.entities.GenericExam.filter({ id: examId });
            exam = exams[0];
          }

          if (exam) {
            setExamData({ ...exam, moduleType });
          }
          return;
        } catch (error) {
          console.error(`Error loading exam (retries left: ${retries - 1}):`, error);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      console.warn("Failed to load exam after retries");
    };

    loadExam();
  }, [examId, moduleType, isUserLoaded]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isUserLoaded || !examData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מבחן...</p>
        </div>
      </div>
    );
  }

  const hasReading = examData.reading_text || examData.reading_questions;
  const hasListening = examData.listening_audio_url || examData.listening_questions || examData.listening_transcript;
  const hasWriting = examData.writing_prompt;
  const hasQuestions = examData.questions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{examData.title}</h1>
            <p className="text-white/80">
              מודול {examData.moduleType} • {examData.subject} • {examData.unit_level || examData.units} יחידות
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {examData.duration_minutes || examData.duration || 90}
              </div>
              <div className="text-sm text-gray-600">דקות</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {examData.total_points || examData.total_reading_points || 100}
              </div>
              <div className="text-sm text-gray-600">נקודות</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {(examData.reading_questions?.length || 0) + 
                 (examData.listening_questions?.length || 0) + 
                 (examData.questions?.length || 0)}
              </div>
              <div className="text-sm text-gray-600">שאלות</div>
            </div>
          </div>

          {examData.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className="text-sm font-semibold text-gray-700 mb-1">תיאור:</div>
              <p className="text-gray-600">{examData.description}</p>
            </div>
          )}
        </motion.div>

        {hasReading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden"
          >
            <button
              onClick={() => toggleSection('reading')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white flex items-center justify-between hover:from-blue-600 hover:to-blue-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <div className="text-right">
                  <h3 className="font-bold text-lg">הבנת הנקרא</h3>
                  <p className="text-sm opacity-90">
                    {examData.reading_questions?.length || 0} שאלות • {examData.total_reading_points || 70} נקודות
                  </p>
                </div>
              </div>
              {expandedSections.reading ? (
                <ChevronUp className="w-6 h-6" />
              ) : (
                <ChevronDown className="w-6 h-6" />
              )}
            </button>

            {expandedSections.reading && (
              <div className="p-6 space-y-4">
                {examData.reading_text && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="font-semibold text-blue-900 mb-2">📖 הטקסט:</div>
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed" dir="ltr">
                      {examData.reading_text}
                    </div>
                  </div>
                )}

                {examData.reading_questions && examData.reading_questions.length > 0 && (
                  <div className="space-y-3">
                    <div className="font-semibold text-gray-900">שאלות הבנת הנקרא:</div>
                    {examData.reading_questions.map((q, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {q.question_number || idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                              {q.question_text}
                            </div>
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {q.options.map((opt, i) => (
                                  <div 
                                    key={i} 
                                    className={`text-sm p-2 rounded ${
                                      opt === q.correct_answer 
                                        ? 'bg-green-100 text-green-800 font-semibold' 
                                        : 'text-gray-700'
                                    }`}
                                    dir="ltr"
                                  >
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600 font-semibold">
                                ✓ תשובה: {q.correct_answer}
                              </span>
                              <span className="text-blue-600">
                                {q.points || 10} נקודות
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {hasListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden"
          >
            <button
              onClick={() => toggleSection('listening')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white flex items-center justify-between hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Headphones className="w-6 h-6" />
                <div className="text-right">
                  <h3 className="font-bold text-lg">האזנה</h3>
                  <p className="text-sm opacity-90">
                    {examData.listening_questions?.length || 0} שאלות • {examData.total_listening_points || 30} נקודות
                  </p>
                </div>
              </div>
              {expandedSections.listening ? (
                <ChevronUp className="w-6 h-6" />
              ) : (
                <ChevronDown className="w-6 h-6" />
              )}
            </button>

            {expandedSections.listening && (
              <div className="p-6 space-y-4">
                {(examData.listening_audio_url || examData.listening_transcript) && (
                  <div>
                    <div className="font-semibold text-purple-900 mb-3">🎧 קובץ השמע:</div>
                    <AudioPlayer
                      audioUrl={examData.listening_audio_url}
                      audioText={examData.listening_transcript}
                      captionUrl={examData.listening_caption_url}
                      playLimit={Infinity}
                      allowSpeedControl={true}
                    />
                  </div>
                )}

                {examData.listening_transcript && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <div className="font-semibold text-purple-900 mb-2">📝 תמלול:</div>
                    <div className="text-gray-800 whitespace-pre-wrap" dir="ltr">
                      {examData.listening_transcript}
                    </div>
                  </div>
                )}

                {examData.listening_questions && examData.listening_questions.length > 0 && (
                  <div className="space-y-3">
                    <div className="font-semibold text-gray-900">שאלות האזנה:</div>
                    {examData.listening_questions.map((q, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {q.question_number || idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                              {q.question_text}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600 font-semibold">
                                ✓ תשובה: {q.correct_answer}
                              </span>
                              <span className="text-purple-600">
                                {q.points || 10} נקודות
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {hasWriting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden"
          >
            <button
              onClick={() => toggleSection('writing')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white flex items-center justify-between hover:from-green-600 hover:to-emerald-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Edit className="w-6 h-6" />
                <div className="text-right">
                  <h3 className="font-bold text-lg">כתיבה</h3>
                  <p className="text-sm opacity-90">
                    {examData.writing_min_words || 35}-{examData.writing_max_words || 40} מילים • {examData.total_writing_points || 30} נקודות
                  </p>
                </div>
              </div>
              {expandedSections.writing ? (
                <ChevronUp className="w-6 h-6" />
              ) : (
                <ChevronDown className="w-6 h-6" />
              )}
            </button>

            {expandedSections.writing && (
              <div className="p-6">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="font-semibold text-green-900 mb-2">✍️ נושא הכתיבה:</div>
                  <div className="text-gray-800" dir="ltr">
                    {examData.writing_prompt}
                  </div>
                  <div className="mt-3 text-sm text-green-700">
                    מגבלת מילים: {examData.writing_min_words || 35}-{examData.writing_max_words || 40} מילים
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {hasQuestions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden"
          >
            <button
              onClick={() => toggleSection('questions')}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 p-4 text-white flex items-center justify-between hover:from-indigo-600 hover:to-blue-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6" />
                <div className="text-right">
                  <h3 className="font-bold text-lg">שאלות המבחן</h3>
                  <p className="text-sm opacity-90">
                    {examData.questions.length} שאלות
                  </p>
                </div>
              </div>
              {expandedSections.questions ? (
                <ChevronUp className="w-6 h-6" />
              ) : (
                <ChevronDown className="w-6 h-6" />
              )}
            </button>

            {expandedSections.questions && (
              <div className="p-6 space-y-3">
                {examData.questions.map((q, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {q.question_number || idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                          {q.question_text}
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {q.options.map((opt, i) => (
                              <div 
                                key={i} 
                                className={`text-sm p-2 rounded ${
                                  opt === q.correct_answer 
                                    ? 'bg-green-100 text-green-800 font-semibold' 
                                    : 'text-gray-700'
                                }`}
                                dir="ltr"
                              >
                                {String.fromCharCode(65 + i)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600 font-semibold">
                            ✓ תשובה: {q.correct_answer}
                          </span>
                          {q.points && (
                            <span className="text-indigo-600">
                              {q.points} נקודות
                            </span>
                          )}
                          {q.topic && (
                            <span className="text-gray-600">
                              נושא: {q.topic}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}