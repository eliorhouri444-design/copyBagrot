import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-3xl p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Statistics"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Target className="w-10 h-10 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-2"
            >
              מחשב המוכנות לבגרות
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base text-white/90"
            >
              {user?.selected_subject} • {user?.selected_units} יחידות
            </motion.p>
          </div>
        </div>
      </motion.div>

      <div className="px-6">
        <ReadinessDashboard 
          readinessData={readinessData} 
          isPremium={user?.is_premium}
        />
      </div>
    </div>
  );
}