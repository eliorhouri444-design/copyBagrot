import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ExplanationStep = ({ step, index }) => (
  <div className="mt-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
    <h4 className="font-semibold text-blue-800">שלב {index + 1}: {step.step_title}</h4>
    <p className="text-sm text-gray-700 mt-1">{step.step_explanation}</p>
  </div>
);

export default function PracticePlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // { is_correct: boolean, explanation_steps: [] }
  const [sessionId] = useState(uuidv4());
  const [user, setUser] = useState(null);

  const params = new URLSearchParams(location.search);
  const topicId = params.get('topic_id');

  const { data, isLoading } = useQuery({
    queryKey: ['practiceQuestions', topicId],
    queryFn: () => base44.entities.PracticeQuestion.filter({ topic_id: topicId }, null, 10),
    enabled: !!topicId,
  });

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch(e) {}
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (data) {
      setQuestions(data);
    }
  }, [data]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleCheckAnswer = async () => {
    if (!user) {
        alert('Please log in to save your progress.');
        return;
    }
    const isCorrect = userAnswer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
    
    setFeedback({
        is_correct: isCorrect,
        explanation_steps: currentQuestion.explanation_steps
    });

    await base44.entities.PracticeAttempt.create({
        user_email: user.email,
        question_id: currentQuestion.id,
        topic_id: topicId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        session_id: sessionId
    });
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setUserAnswer('');
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Navigate to summary page
      navigate(`/PracticeSummary?session_id=${sessionId}&topic_id=${topicId}`);
    }
  };
  
  if (isLoading) return <div className="p-8">טוען שאלות...</div>;
  if (!currentQuestion) return <div className="p-8">לא נמצאו שאלות בנושא זה.</div>

  return (
    <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="mb-6">
            <p className="text-sm text-gray-500">שאלה {currentQuestionIndex + 1} מתוך {questions.length}</p>
            <h2 className="text-2xl font-semibold text-gray-800 mt-2">{currentQuestion.question_text}</h2>
            {currentQuestion.question_image_url && <img src={currentQuestion.question_image_url} alt="Question visual" className="mt-4 rounded-lg"/>}
          </div>

          {!feedback && (
             <div className="space-y-4">
                {currentQuestion.question_type === 'multiple_choice' ? (
                    <div className="space-y-2">
                        {currentQuestion.options.map((option, index) => (
                            <button key={index} onClick={() => setUserAnswer(option)} className={`block w-full text-right p-4 rounded-lg border-2 ${userAnswer === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-100'}`}>
                                {option}
                            </button>
                        ))}
                    </div>
                ) : (
                    <input 
                        type="text" 
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="הקלד את תשובתך..."
                    />
                )}
                <button onClick={handleCheckAnswer} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    בדוק תשובה
                </button>
            </div>
          )}

          {feedback && (
            <div>
              <div className={`p-4 rounded-lg flex items-center gap-3 ${feedback.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {feedback.is_correct ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                <span className="font-semibold">{feedback.is_correct ? 'תשובה נכונה!' : 'תשובה שגויה'}</span>
              </div>

              <div className="mt-4">
                <h3 className="font-bold flex items-center gap-2 text-gray-800"><HelpCircle className="w-5 h-5 text-blue-500"/>הסבר:</h3>
                {feedback.explanation_steps.map((step, index) => (
                    <ExplanationStep key={index} step={step} index={index} />
                ))}
              </div>

              <button onClick={handleNextQuestion} className="w-full mt-6 bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2">
                <span>{currentQuestionIndex < questions.length - 1 ? 'השאלה הבאה' : 'סיים תרגול'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
         <div className="w-full mt-4">
            <div className="h-2 bg-gray-200 rounded-full">
                <div style={{width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`}} className="h-2 bg-blue-500 rounded-full transition-all duration-300"></div>
            </div>
        </div>
      </div>
    </div>
  );
}