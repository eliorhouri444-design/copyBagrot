import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Award, Repeat, ArrowRight } from 'lucide-react';

export default function PracticeSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const topicId = params.get('topic_id');

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch(e) {}
    };
    fetchUser();
  }, []);

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['practiceSession', sessionId],
    queryFn: () => base44.entities.PracticeAttempt.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  const { data: topic, isLoading: isLoadingTopic } = useQuery({
      queryKey: ['topic', topicId],
      queryFn: () => base44.entities.Topic.filter({topic_id: topicId}).then(res => res[0]),
      enabled: !!topicId
  })

  const { data: weakTopics, isLoading: isLoadingWeakTopics } = useQuery({
      queryKey: ['weakTopics', user?.email],
      queryFn: () => base44.entities.UserTopicStats.filter({ user_email: user.email }, 'accuracy', 3),
      enabled: !!user,
  })

  useEffect(() => {
    if (attempts && attempts.length > 0 && user) {
      const correct = attempts.filter(a => a.is_correct).length;
      const total = attempts.length;
      const accuracy = (correct / total) * 100;

      const updateStats = async () => {
        const existingStats = await base44.entities.UserTopicStats.filter({ user_email: user.email, topic_id: topicId });
        
        if (existingStats.length > 0) {
          const stat = existingStats[0];
          const newTotal = stat.total_questions + total;
          const newCorrect = stat.correct_questions + correct;
          await base44.entities.UserTopicStats.update(stat.id, {
            total_questions: newTotal,
            correct_questions: newCorrect,
            accuracy: (newCorrect / newTotal) * 100,
          });
        } else {
          await base44.entities.UserTopicStats.create({
            user_email: user.email,
            topic_id: topicId,
            total_questions: total,
            correct_questions: correct,
            accuracy: accuracy,
          });
        }
      };
      updateStats();
    }
  }, [attempts, user, topicId]);

  const recommendedTopic = weakTopics?.[0];

  if (isLoading || isLoadingTopic || isLoadingWeakTopics) return <div className="p-8">טוען סיכום...</div>;
  if (!attempts) return <div className="p-8">לא נמצאו נתונים עבור תרגול זה.</div>;

  const correctAnswers = attempts.filter(a => a.is_correct).length;
  const totalQuestions = attempts.length;
  const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  return (
    <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-2xl text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">כל הכבוד!</h1>
            <p className="text-gray-600 mt-2">סיימת את התרגול בנושא: {topic?.name}</p>

            <div className="my-8">
                <div className={`text-6xl font-bold ${score >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                    {score.toFixed(0)}%
                </div>
                <p className="text-gray-500">({correctAnswers} מתוך {totalQuestions} תשובות נכונות)</p>
            </div>

            <div className="space-y-4">
                <button 
                    onClick={() => navigate(createPageUrl(`PracticePlayer?topic_id=${topicId}`))}
                    className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Repeat className="w-5 h-5" />
                    תרגל שוב
                </button>
                <button 
                    onClick={() => navigate(createPageUrl('PracticeTopics'))}
                    className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    חזור לנושאים
                </button>
            </div>
        </div>

        {recommendedTopic && recommendedTopic.topic_id !== topicId && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="font-bold text-lg mb-2">השלב הבא</h3>
                <p className="text-sm text-gray-600 mb-4">נראה שאתה קצת חלש בנושא: <span className="font-semibold">{recommendedTopic.name}</span>. רוצה לנסות לתרגל אותו?</p>
                <button 
                    onClick={() => navigate(createPageUrl(`PracticePlayer?topic_id=${recommendedTopic.topic_id}`))}
                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                    <span>תרגול בנושא חלש</span>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        )}

      </div>
    </div>
  )
}