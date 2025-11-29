import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BookOpen, ChevronLeft, Loader2, GraduationCap, Target,
  Zap, Repeat, CheckCircle2, ArrowRight, Trophy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const PRACTICE_MODES = [
  {
    id: 'dashboard',
    title: 'דשבורד',
    icon: GraduationCap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'flashcards',
    title: 'כרטיסיות',
    icon: BookOpen,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  {
    id: 'practice',
    title: 'תרגול מהיר',
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  {
    id: 'weak_words',
    title: 'מילים חלשות',
    icon: Target,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
];

export default function VocabularyTrainingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const subject = currentUser?.selected_subject || 'אנגלית';
        const units = currentUser?.selected_units || 3;

        // Fetch basic stats
        const [allWords, userProgress] = await Promise.all([
          base44.entities.VocabularyQuestion.filter({
            subject_id: subject,
            unit_level: units,
            is_active: true
          }),
          base44.entities.VocabularyProgress.filter({
            user_email: currentUser.email,
            subject_id: subject
          })
        ]);

        const mastered = userProgress.filter(p => p.is_known).length;
        const weak = userProgress.filter(p => p.is_weak).length;
        
        setStats({
          total: allWords.length,
          mastered,
          weak,
          progress: allWords.length > 0 ? Math.round((mastered / allWords.length) * 100) : 0
        });

      } catch (error) {
        console.error("Error loading vocabulary stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-white">אימון אוצר מילים</h1>
            <p className="text-sm text-blue-100">
              {user?.selected_subject} • {user?.selected_units} יחידות
            </p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Progress Card */}
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">ההתקדמות שלך</span>
            <span className="text-white font-bold">{stats?.progress}%</span>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${stats?.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-blue-100">
            <span>{stats?.mastered} נלמדו</span>
            <span>{stats?.total} סה"כ</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-4">
        {/* Main Modes */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(createPageUrl("VocabularySets"))}
            className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">למידה לפי סטים</h3>
              <p className="text-xs text-gray-500">כרטיסיות ולימוד מסודר</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(createPageUrl("VocabularyQuickPractice"))}
            className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">תרגול מהיר</h3>
              <p className="text-xs text-gray-500">בחנים קצרים ומהירים</p>
            </div>
          </motion.button>
        </div>

        {/* Weak Words Section */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(createPageUrl("VocabularyStrengthen"))}
          className="w-full bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div className="flex-1 text-right">
            <h3 className="font-bold text-gray-900">חיזוק מילים חלשות</h3>
            <p className="text-xs text-gray-500">
              {stats?.weak > 0 ? `יש לך ${stats.weak} מילים לחיזוק` : 'אין מילים חלשות כרגע'}
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </motion.button>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.mastered}</div>
            <div className="text-xs text-green-800 font-medium">מילים שידעתי</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.weak}</div>
            <div className="text-xs text-red-800 font-medium">טעויות לתקן</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowLeft({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}