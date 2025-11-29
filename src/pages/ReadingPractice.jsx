import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, ChevronLeft, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ReadingPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const textId = urlParams.get('textId');
  
  const [textData, setTextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const loadText = async () => {
      if (!textId) return;
      try {
        const texts = await base44.entities.ReadingComprehensionText.filter({ id: textId });
        if (texts.length > 0) {
          setTextData(texts[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadText();
  }, [textId]);

  const handleAnswer = (option) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: option }));
  };

  const handleNext = () => {
    if (currentQuestion < (textData?.questions?.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin"/></div>;
  if (!textData) return <div>Text not found</div>;

  if (showResults) {
    const correctCount = textData.questions.reduce((acc, q, idx) => {
      return acc + (answers[idx] === q.answer ? 1 : 0);
    }, 0);
    
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">תוצאות</h2>
          <div className="text-4xl font-black text-green-600 mb-2">
            {Math.round((correctCount / textData.questions.length) * 100)}%
          </div>
          <p className="text-gray-600 mb-6">
            ענית נכון על {correctCount} מתוך {textData.questions.length} שאלות
          </p>
          <Button onClick={() => navigate(createPageUrl("ReadingComprehension"))} className="w-full">
            חזור לרשימה
          </Button>
        </div>
      </div>
    );
  }

  const question = textData.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Text Side */}
      <div className="flex-1 bg-white p-6 overflow-y-auto border-l border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("ReadingComprehension"))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">{textData.title}</h1>
        </div>
        <div className="prose max-w-none text-lg leading-relaxed text-gray-800 whitespace-pre-wrap" dir="ltr">
          {textData.text_content}
        </div>
      </div>

      {/* Question Side */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto flex flex-col">
        <div className="mb-6">
          <span className="text-sm font-medium text-gray-500">שאלה {currentQuestion + 1} מתוך {textData.questions.length}</span>
          <div className="h-2 bg-gray-200 rounded-full mt-2">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / textData.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex-1">
          <h3 className="text-lg font-bold mb-6" dir="ltr">{question.question}</h3>
          
          <div className="space-y-3">
            {question.options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className={`w-full p-4 rounded-lg text-left border-2 transition-all ${
                  answers[currentQuestion] === opt 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 hover:border-blue-200'
                }`}
                dir="ltr"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleNext}
          disabled={!answers[currentQuestion]}
          className="w-full h-12 text-lg"
        >
          {currentQuestion === textData.questions.length - 1 ? 'סיים מבחן' : 'השאלה הבאה'}
        </Button>
      </div>
    </div>
  );
}