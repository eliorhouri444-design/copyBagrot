import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, BookOpen, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function GrammarTopicsPage() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const user = await base44.auth.me();
        const userTopics = await base44.entities.TopicNew.filter({
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          is_active: true
        });
        
        // Filter only grammar topics
        const grammarTopics = userTopics.filter(t => 
          t.topic_id.includes('grammar') || 
          t.topic_id.includes('דקדוק') ||
          t.name.includes('דקדוק')
        );
        
        setTopics(grammarTopics);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadTopics();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-indigo-50 p-6">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("Practice"))}>
          <ChevronLeft />
        </Button>
        <h1 className="text-xl font-bold text-indigo-900">נושאי דקדוק</h1>
        <BookOpen className="text-indigo-600" />
      </div>

      <div className="space-y-4">
        {topics.map(topic => (
          <div 
            key={topic.id}
            onClick={() => navigate(`${createPageUrl("TopicPracticeNew")}?topicid=${encodeURIComponent(topic.topic_id)}&set=1`)}
            className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">{topic.icon || '📝'}</div>
              <div>
                <h3 className="font-bold text-gray-900">{topic.name}</h3>
                <p className="text-sm text-gray-500">{topic.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}