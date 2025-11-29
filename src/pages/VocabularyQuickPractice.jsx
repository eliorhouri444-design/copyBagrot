import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, CheckCircle, XCircle, RotateCcw, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function VocabularyQuickPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');

  const [words, setWords] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const user = await base44.auth.me();
      const subject = user?.selected_subject || 'אנגלית';
      const units = user?.selected_units || 3;

      const allWords = await base44.entities.VocabularyQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'order', 2000);

      // Get current set words
      const setWords = allWords.slice(startIndex, endIndex);
      
      // Generate questions with distractors from other words
      const questions = setWords.map(word => {
        const distractors = allWords
          .filter(w => w.id !== word.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(w => w.hebrew_word);
        
        return {
          ...word,
          options: [...distractors, word.hebrew_word].sort(() => 0.5 - Math.random())
        };
      });

      setWords(questions);
      setLoading(false);
    } catch (error) {
      console.error("Error loading quiz", error);
    }
  };

  const handleAnswer = async (answer) => {
    if (selectedAnswer) return; // Prevent multiple clicks
    
    setSelectedAnswer(answer);
    const correct = answer === words[currentQuestion].hebrew_word;
    setIsCorrect(correct);

    if (correct) setScore(prev => prev + 1);

    // Save result to DB
    /* (Optional: Save detailed attempt here if needed) */

    setTimeout(() => {
      if (currentQuestion < words.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;

  if (showResult) {
    const percentage = Math.round((score / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full"
        >
          <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl font-black text-blue-600">{percentage}%</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {percentage >= 80 ? 'מצוין!' : percentage >= 60 ? 'טוב מאוד' : 'המשיכו לתרגל'}
          </h2>
          <p className="text-gray-500 mb-8">ענית נכון על {score} מתוך {words.length} שאלות</p>
          
          <Button 
            onClick={() => navigate(createPageUrl("VocabularySets"))}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-12 rounded-xl"
          >
            חזור לרשימה
          </Button>
        </motion.div>
      </div>
    );
  }

  const question = words[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress Bar */}
      <div className="h-2 bg-gray-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${((currentQuestion + 1) / words.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full">
        <div className="flex justify-between items-center mb-8 text-gray-500 text-sm font-medium">
          <span>שאלה {currentQuestion + 1} מתוך {words.length}</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md">בוחן מהיר</span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center border-b-4 border-gray-100">
          <h2 className="text-3xl font-bold text-gray-800" dir="ltr">{question.english_answer}</h2>
        </div>

        <div className="space-y-3">
          {question.options.map((option, idx) => {
            let stateStyle = "bg-white border-2 border-gray-100 text-gray-700 hover:border-blue-300";
            
            if (selectedAnswer) {
              if (option === question.hebrew_word) {
                stateStyle = "bg-green-100 border-2 border-green-500 text-green-800";
              } else if (option === selectedAnswer && option !== question.hebrew_word) {
                stateStyle = "bg-red-100 border-2 border-red-500 text-red-800";
              } else {
                stateStyle = "bg-gray-50 border-2 border-gray-100 text-gray-400 opacity-50";
              }
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(option)}
                disabled={!!selectedAnswer}
                className={`w-full p-4 rounded-xl font-bold text-lg transition-all duration-200 flex justify-between items-center ${stateStyle}`}
              >
                <span>{option}</span>
                {selectedAnswer && option === question.hebrew_word && <CheckCircle className="w-5 h-5"/>}
                {selectedAnswer && option === selectedAnswer && option !== question.hebrew_word && <XCircle className="w-5 h-5"/>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}