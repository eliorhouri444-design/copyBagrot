import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Star } from 'lucide-react';

const TopicCard = ({ topic, stats }) => {
  const navigate = useNavigate();

  const handleStartPractice = () => {
    navigate(createPageUrl(`PracticePlayer?topic_id=${topic.topic_id}`));
  };

  const accuracy = stats?.accuracy || 0;
  
  const getAccuracyColor = () => {
    if (accuracy > 80) return 'text-green-500';
    if (accuracy > 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <h3 className="font-bold text-lg text-gray-800">{topic.name}</h3>
      <p className="text-sm text-gray-500">{topic.unit_level} יחידות</p>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Star className={`w-5 h-5 ${getAccuracyColor()}`} />
          <span className={`font-semibold ${getAccuracyColor()}`}>{accuracy.toFixed(0)}%</span>
          <span className="text-xs text-gray-400">({stats?.total_questions || 0} שאלות)</span>
        </div>
        <button 
          onClick={handleStartPractice}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 transition-colors">
          <span>תרגול</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function PracticeTopics() {
  const [user, setUser] = useState(null);
  
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('order'),
  });

  const { data: topics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list('order'),
  });

  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['userTopicStats', user?.email],
    queryFn: () => base44.entities.UserTopicStats.filter({ user_email: user.email }),
    enabled: !!user,
  });

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch(e) {
            // not logged in
        }
    };
    fetchUser();
  }, []);

  const statsMap = React.useMemo(() => {
    if (!userStats) return new Map();
    return new Map(userStats.map(stat => [stat.topic_id, stat]));
  }, [userStats]);

  const isLoading = isLoadingSubjects || isLoadingTopics || (!!user && isLoadingStats);

  return (
    <div className="p-8 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">תרגול בגרויות</h1>
      {isLoading ? (
        <p>טוען נתונים...</p>
      ) : (
        <div className="space-y-8">
          {subjects?.map(subject => (
            <div key={subject.subject_id}>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">{subject.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics?.filter(t => t.subject_id === subject.subject_id).map(topic => (
                  <TopicCard key={topic.topic_id} topic={topic} stats={statsMap.get(topic.topic_id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}