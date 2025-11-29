import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Loader2, Trophy, Zap, PlayCircle, FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ReadingComprehensionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    learned: 0,
    mastered: 0,
    weak: 0,
    total: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const units = currentUser?.selected_units || 3;

      // Load all reading texts for user level
      const allTexts = await base44.entities.ReadingComprehensionText.filter({
        unit_level: units,
        is_active: true
      });

      let totalQuestions = 0;
      allTexts.forEach(text => {
        totalQuestions += (text.questions || []).length;
      });

      // Load user progress
      const userProgress = await base44.entities.ReadingProgress.filter({
        user_email: currentUser.email
      });

      // Calculate stats
      const learned = userProgress.filter(p => p.times_seen > 0).length;
      const mastered = userProgress.filter(p => p.is_mastered).length;
      const weak = userProgress.filter(p => p.is_weak).length;

      setStats({
        learned,
        mastered,
        weak,
        total: totalQuestions
      });

    } catch (error) {
      console.error("Error loading reading stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = () => {
    navigate(createPageUrl("ReadingPractice?mode=auto"));
  };

  const handleStrengthenWeak = () => {
    navigate(createPageUrl("ReadingPractice?mode=weak"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-white">הבנת הנקרא • Reading</h1>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">סטטיסטיקות</h3>
            <span className="text-sm text-blue-600 font-semibold">{stats.total} שאלות</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{stats.learned}</div>
              <div className="text-xs text-blue-700">למדת</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-600">{stats.mastered}</div>
              <div className="text-xs text-green-700">בשליטה</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-orange-600">{stats.weak}</div>
              <div className="text-xs text-orange-700">חיזוק</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-xs text-gray-700">סה״כ</div>
            </div>
          </div>
        </div>

        {/* Start Practice Button */}
        <Button 
          onClick={handleStartPractice}
          className="w-full h-20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-lg flex items-center justify-center gap-3 text-xl font-bold transform transition-all hover:scale-[1.02]"
        >
          <PlayCircle className="w-8 h-8" />
          התחל תרגול
        </Button>

        {/* Strengthen Weak Button */}
        {stats.weak > 0 && (
          <Button
            onClick={handleStrengthenWeak}
            className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md"
          >
            <Zap className="w-5 h-5" />
            חזק {stats.weak} שאלות חלשות
          </Button>
        )}
      </div>
    </div>
  );
}