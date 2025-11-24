import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, FileCheck, ChevronLeft } from "lucide-react";
import { CardSimple, CardTitle } from "@/components/ui/card-simple";
import { Button } from "@/components/ui/button";

export default function WhatToStudyCard({ 
  topics = [], 
  modules = [], 
  practiceAttempts = [], 
  examAttempts = [],
  subject,
  units 
}) {
  const navigate = useNavigate();

  // חישוב נושאים חלשים (פחות מ-75% נכונות או פחות מ-5 תשובות)
  const weakTopics = useMemo(() => {
    if (!topics || topics.length === 0) return [];

    const topicStats = {};
    
    practiceAttempts.forEach(attempt => {
      const topicId = attempt.topic_id;
      if (!topicId) return;
      
      if (!topicStats[topicId]) {
        topicStats[topicId] = { total: 0, correct: 0, topicData: null };
      }
      topicStats[topicId].total++;
      if (attempt.status === "correct") {
        topicStats[topicId].correct++;
      }
    });

    const weak = topics.filter(topic => {
      const stats = topicStats[topic.topic_id];
      if (!stats) return true; // נושא שלא נענה עליו בכלל
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      return stats.total < 5 || accuracy < 75;
    }).slice(0, 3);

    return weak.map(topic => {
      const stats = topicStats[topic.topic_id] || { total: 0, correct: 0 };
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return {
        ...topic,
        accuracy,
        attempted: stats.total
      };
    });
  }, [topics, practiceAttempts]);

  // חישוב שאלונים שצריך להבחן עליהם
  const modulesToStudy = useMemo(() => {
    if (!modules || modules.length === 0) return [];

    const moduleAttempts = {};
    
    examAttempts.forEach(attempt => {
      const moduleId = attempt.module_id;
      if (!moduleId) return;
      
      if (!moduleAttempts[moduleId]) {
        moduleAttempts[moduleId] = { total: 0, avgScore: 0, scores: [] };
      }
      moduleAttempts[moduleId].total++;
      moduleAttempts[moduleId].scores.push(attempt.score_percent || 0);
    });

    Object.keys(moduleAttempts).forEach(moduleId => {
      const scores = moduleAttempts[moduleId].scores;
      moduleAttempts[moduleId].avgScore = scores.length > 0 
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
    });

    // מצא שאלונים שלא נבחנו או שהציון הממוצע נמוך
    const needPractice = modules.filter(module => {
      const stats = moduleAttempts[module.id];
      if (!stats) return true; // שאלון שלא נבחן עליו
      return stats.total < 2 || stats.avgScore < 75;
    }).slice(0, 3);

    return needPractice.map(module => {
      const stats = moduleAttempts[module.id] || { total: 0, avgScore: 0 };
      return {
        ...module,
        avgScore: stats.avgScore,
        attempted: stats.total
      };
    });
  }, [modules, examAttempts]);

  // חישוב אחוז מוכנות כללי
  const overallReadiness = useMemo(() => {
    if (!topics || topics.length === 0 || !modules || modules.length === 0) return 0;

    // שליטה בנושאים
    const topicStats = {};
    practiceAttempts.forEach(attempt => {
      const topicId = attempt.topic_id;
      if (!topicId) return;
      if (!topicStats[topicId]) topicStats[topicId] = { total: 0, correct: 0 };
      topicStats[topicId].total++;
      if (attempt.status === "correct") topicStats[topicId].correct++;
    });

    const masteredTopics = topics.filter(topic => {
      const stats = topicStats[topic.topic_id];
      if (!stats) return false;
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      return stats.total >= 5 && accuracy >= 75;
    }).length;

    const topicMastery = topics.length > 0 ? (masteredTopics / topics.length) * 100 : 0;

    // ביצועים בשאלונים
    const moduleScores = examAttempts
      .filter(e => e.score_percent !== undefined)
      .map(e => e.score_percent);
    const avgModuleScore = moduleScores.length > 0
      ? moduleScores.reduce((sum, s) => sum + s, 0) / moduleScores.length
      : 0;

    // משוקלל: 60% שליטה בנושאים, 40% ביצועים בשאלונים
    const overall = Math.round(topicMastery * 0.6 + avgModuleScore * 0.4);
    
    return Math.min(100, overall);
  }, [topics, modules, practiceAttempts, examAttempts]);

  const handleTopicClick = (topic) => {
    // שמירה בסשן - הנושא שנבחר
    sessionStorage.setItem('selectedTopicId', topic.topic_id);
    navigate(createPageUrl("Practice"));
  };

  const handleModuleClick = (module) => {
    // שמירה בסשן - השאלון שנבחר
    sessionStorage.setItem('selectedModuleId', module.id);
    navigate(createPageUrl("Exams"));
  };

  return (
    <CardSimple delay={0.1}>
      <CardTitle>מה ללמוד כדאי להצליח</CardTitle>

      {/* אחוז מוכנות כללי */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 mb-4 text-white text-center">
        <div className="text-[13px] mb-1 opacity-90">מוכנות כוללת לבגרות</div>
        <div className="text-4xl font-black mb-1">{overallReadiness}%</div>
        <div className="text-[11px] opacity-90">מבוסס על {topics.length} נושאים ו-{modules.length} שאלונים</div>
      </div>

      {/* נושאים ללמידה */}
      {weakTopics.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-gray-900">נושאים לתרגול</h3>
          </div>
          <div className="space-y-2">
            {weakTopics.map((topic, idx) => (
              <button
                key={topic.topic_id}
                onClick={() => handleTopicClick(topic)}
                className="w-full bg-white rounded-xl p-3 border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all text-right flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-[13px] font-bold text-blue-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-gray-900">{topic.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {topic.attempted > 0 ? `${topic.accuracy}% נכונות` : 'טרם תורגל'}
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* שאלונים להבחן */}
      {modulesToStudy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-gray-900">שאלונים להבחן</h3>
          </div>
          <div className="space-y-2">
            {modulesToStudy.map((module, idx) => (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module)}
                className="w-full bg-white rounded-xl p-3 border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all text-right flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 bg-gradient-to-r ${module.color} rounded-lg flex items-center justify-center text-[13px] font-bold text-white`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-gray-900">{module.title}</div>
                    <div className="text-[11px] text-gray-500">
                      {module.attempted > 0 ? `ממוצע: ${module.avgScore}%` : 'טרם נבחן'}
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {weakTopics.length === 0 && modulesToStudy.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-[13px]">
          מעולה! אתה מוכן בכל הנושאים והשאלונים 🎉
        </div>
      )}
    </CardSimple>
  );
}