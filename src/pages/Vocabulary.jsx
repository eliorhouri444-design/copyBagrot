import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, ArrowLeft, ChevronLeft, Sparkles, Trophy, Brain, Globe, Zap, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function VocabularyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cachedData] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        subject: localStorage.getItem('selected_subject') || 'אנגלית',
        units: localStorage.getItem('selected_units') || '4'
      };
    }
    return { subject: 'אנגלית', units: '4' };
  });

  const displaySubject = user?.selected_subject || cachedData.subject;
  const displayUnits = parseInt(user?.selected_units || cachedData.units);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['vocabulary-all', displaySubject, displayUnits],
    queryFn: async () => {
      const questions = await base44.entities.VocabularyQuestion.list();
      return questions.filter(q => q.subject_id === displaySubject && q.unit_level === displayUnits && q.is_active);
    },
    enabled: !!displaySubject && displayUnits > 0
  });

  const categories = React.useMemo(() => {
    const categoryMap = {};
    
    allQuestions.forEach(q => {
      const cat = q.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          name: cat,
          count: 0,
          icon: getCategoryIcon(cat),
          color: getCategoryColor(cat)
        };
      }
      categoryMap[cat].count++;
    });

    return Object.values(categoryMap).sort((a, b) => b.count - a.count);
  }, [allQuestions]);

  const getCategoryIcon = (category) => {
    if (category.includes('Verb')) return Zap;
    if (category.includes('Academic') || category.includes('Advanced')) return Brain;
    if (category.includes('Connector')) return Sparkles;
    if (category.includes('Phrasal')) return BookMarked;
    if (category.includes('Technology') || category.includes('Science')) return Globe;
    return BookOpen;
  };

  const getCategoryColor = (category) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-cyan-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500'
    ];
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-6 shadow-2xl mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
            <span className="text-xl font-bold text-white">אוצר מילים</span>
          </div>
        </div>
        
        <div className="text-center text-white mt-3">
          <h2 className="text-2xl font-bold mb-1">{displaySubject}</h2>
          <p className="text-sm opacity-90">{displayUnits} יחידות • {allQuestions.length} מילים</p>
        </div>
      </motion.div>

      <div className="px-4 space-y-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10" />
            <div>
              <h3 className="text-lg font-bold">תרגל אוצר מילים</h3>
              <p className="text-sm opacity-90">בחר קטגוריה והתחל לתרגל</p>
            </div>
          </div>
        </motion.div>

        {categories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">אין שאלות זמינות</h3>
            <p className="text-gray-600">בקרוב יתווספו שאלות אוצר מילים</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {categories.map((category, idx) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  whileHover={{ scale: 1.02, x: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl(`VocabularyPractice?category=${encodeURIComponent(category.name)}`))}
                  className="w-full bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center shadow-md flex-shrink-0`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1 text-right">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.count} מילים</p>
                    </div>

                    <ChevronLeft className="w-6 h-6 text-gray-400" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}