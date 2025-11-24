import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, Loader2 } from "lucide-react";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import ReadinessDashboard from "@/components/readiness/ReadinessDashboard";

export default function ReadinessPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [practiceAttempts, setPracticeAttempts] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser?.selected_subject || 'אנגלית';
      const units = parseInt(currentUser?.selected_units || 3);

      const [allTopics, allAttempts, allExamAttempts] = await Promise.all([
        base44.entities.TopicNew.list(),
        base44.entities.AttemptNew.list("-created_date", 2000),
        base44.entities.ExamAttempt.list("-created_date", 100)
      ]);

      const relevantTopics = allTopics.filter(
        t => t.subject_id === subject && parseInt(t.unit_level) === units && t.is_active
      );
      setTopics(relevantTopics);

      const userAttempts = allAttempts.filter(
        a => a.created_by === currentUser.email && 
             a.subject_id === subject && 
             parseInt(a.unit_level) === units
      );
      setPracticeAttempts(userAttempts);

      const userExamAttempts = allExamAttempts.filter(
        e => e.subject === subject && parseInt(e.unit_level) === units
      );
      setExamAttempts(userExamAttempts);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const readinessData = useReadinessCalculator(user, topics, practiceAttempts, examAttempts);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">מחשב את המוכנות שלך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("Statistics"))}
          className="text-right flex-1 hover:opacity-90 transition-opacity"
        >
          <h1 className="text-[16px] font-bold text-white">מחשב המוכנות לבגרות</h1>
          <p className="text-[11px] text-white/70">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Target className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-6">
        <ReadinessDashboard 
          readinessData={readinessData} 
          isPremium={user?.is_premium}
        />
      </div>
    </div>
  );
}