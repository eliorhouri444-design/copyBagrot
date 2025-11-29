import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Check, X, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function GrammarPracticeNewPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('topicid');
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // In a real scenario, fetch by topic_id from GrammarQuestion
        // For now mock or fetch all
        const user = await base44.auth.me();
        const allQuestions = await base44.entities.GrammarQuestion.filter({
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          is_active: true
        });
        
        // Filter manually if needed (or use query)
        // Assuming topicId matches topic field loosely or exactly
        const topicQuestions = allQuestions.filter(q => q.topic && topicId && q.topic.includes(topicId.split('_')[2] || ''));
        
        setQuestions(topicQuestions.length > 0 ? topicQuestions : allQuestions.slice(0, 10));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [topicId]);

  const handleAnswer = (ans) => {
    if (showFeedback) return;
    setSelectedAnswer(ans);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      navigate(createPageUrl("GrammarTopics"));
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin"/></div>;
  if (questions.length === 0) return <div className="p-6 text-center">אין שאלות זמינות בנושא זה</div>;

  const question = questions[currentIndex];

  return (
    <div className="min-h-screen bg-indigo-50 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("GrammarTopics"))}>
          <ArrowRight />
        </Button>
        <span className="font-bold text-indigo-900">שאלה {currentIndex + 1}/{questions.length}</span>
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 text-center">
          <h2 className="text-xl font-bold mb-2" dir="ltr">{question.question}</h2>
          <p className="text-gray-500 text-sm">{question.topic}</p>
        </div>

        <div className="space-y-3">
          {question.options?.map((opt, idx) => {
            let style = "bg-white border-2 border-indigo-100 text-indigo-900 hover:border-indigo-300";
            if (showFeedback) {
              if (opt === question.answer) style = "bg-green-100 border-green-500 text-green-800";
              else if (opt === selectedAnswer) style = "bg-red-100 border-red-500 text-red-800";
              else style = "bg-gray-50 border-gray-100 text-gray-400";
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className={`w-full p-4 rounded-xl font-medium transition-all ${style}`}
                dir="ltr"
              >
                {opt}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4">
            <div className={`p-4 rounded-xl mb-4 ${selectedAnswer === question.answer ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-bold mb-1">{selectedAnswer === question.answer ? 'נכון מאוד!' : 'לא נורא, נסה שוב'}</p>
              <p className="text-sm">{question.explanation}</p>
            </div>
            <Button onClick={handleNext} className="w-full h-12 text-lg">
              המשך
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}