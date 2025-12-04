import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, PlayCircle, CheckCircle, User, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle } from "@/components/ui/card-simple";
import OverallMasteryCard from "@/components/mastery/OverallMasteryCard";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import DailyPlanCard from "@/components/home/DailyPlanCard";
import RatingDialog from "@/components/ads/RatingDialog";
import ShareDialog from "@/components/ads/ShareDialog";
import { useHomeData } from "@/components/cache/useHomeData";
import {
  fetchUserPerformanceData,
  calculateFullReadiness,
  calculateGapAndRequirements,
  buildCompleteDailyPlan
} from "@/components/studyplan/ReadinessEngine";

export default function HomePage() {
  const navigate = useNavigate();
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [adSettings, setAdSettings] = useState(null);
  const [engineData, setEngineData] = useState(null);
  
  // קריאה אחת לכל הנתונים עם Cache
  const { data: homeData, isLoading, error } = useHomeData();
  
  // Extract data from homeData
  const user = homeData?.user;
  const topics = homeData?.topics || [];
  const practiceAttempts = homeData?.attempts || [];
  const examAttempts = homeData?.examAttempts || [];
  const modules = homeData?.modules || [];
  const lastActivity = homeData?.lastActivity;
  const stats = homeData?.stats || {};

  // טעינת נתונים מה-Readiness Engine
  useEffect(() => {
    const loadEngineData = async () => {
      if (!user?.email) return;
      
      const subject = user?.selected_subject || 'אנגלית';
      const unitLevel = user?.selected_units || 5;
      const targetScore = user?.target_score || 85;
      const examDate = user?.exam_date ? new Date(user.exam_date) : null;
      const daysUntilExam = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24))) : 60;

      try {
        const perfData = await fetchUserPerformanceData(base44, user.email, subject, unitLevel);
        if (perfData) {
          const readinessData = calculateFullReadiness(perfData, subject, unitLevel);
          const reqs = calculateGapAndRequirements({
            targetScore,
            readinessScore: readinessData.readinessScore,
            performanceData: perfData,
            subject,
            unitLevel,
            daysUntilExam
          });
          const plan = buildCompleteDailyPlan({
            performanceData: perfData,
            requirements: reqs,
            targetScore,
            daysUntilExam,
            subject,
            unitLevel,
            dayOfWeek: new Date().getDay()
          });

          setEngineData({ readiness: readinessData, requirements: reqs, dailyPlan: plan, performanceData: perfData });
        }
      } catch (error) {
        console.error("Error loading engine data:", error);
      }
    };
    loadEngineData();
  }, [user]);

  // Track referral clicks when someone opens a shared link
  useEffect(() => {
    const trackReferral = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (refCode) {
        try {
          const clickedRefs = JSON.parse(localStorage.getItem('clicked_refs') || '[]');
          if (!clickedRefs.includes(refCode)) {
            await base44.entities.ReferralClick.create({
              referral_code: refCode,
              clicked_at: new Date().toISOString(),
              visitor_id: Math.random().toString(36).substring(7)
            });
            clickedRefs.push(refCode);
            localStorage.setItem('clicked_refs', JSON.stringify(clickedRefs));
          }
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error("Error tracking referral:", error);
        }
      }
    };
    trackReferral();
  }, []);

  // Redirect to onboarding if needed
  useEffect(() => {
    if (homeData?.needsOnboarding) {
      navigate(createPageUrl("Onboarding"));
    }
  }, [homeData, navigate]);

  // Timer for rating and share dialogs
  useEffect(() => {
    if (!user || user.is_premium) return;
    
    const checkAndShowDialogs = async () => {
      try {
        const settings = await base44.entities.UserAdSettings.list();
        let currentSettings = settings[0];
        
        if (!currentSettings) {
          currentSettings = await base44.entities.UserAdSettings.create({
            free_attempts: 3,
            has_seen_info_today: false,
            ads_viewed_today: 0,
            has_rated: false,
            last_reset_date: new Date().toISOString().split('T')[0]
          });
        }
        
        setAdSettings(currentSettings);
        
        const today = new Date().toISOString().split('T')[0];
        const lastRatingShown = localStorage.getItem('last_rating_dialog_date');
        const lastShareShown = localStorage.getItem('last_share_dialog_date');
        
        if (currentSettings.has_rated) return;
        
        const neverShowRating = localStorage.getItem('never_show_rating_dialog') === 'true';
        const neverShowShare = localStorage.getItem('never_show_share_dialog') === 'true';
        
        const ratingTimer = setTimeout(() => {
          if (lastRatingShown === today || neverShowRating) return;
          setShowRatingDialog(true);
          localStorage.setItem('last_rating_dialog_date', today);
        }, 180000); // 3 דקות
        
        const shareTimer = setTimeout(() => {
          if (lastShareShown === today || neverShowShare) return;
          setShowShareDialog(true);
          localStorage.setItem('last_share_dialog_date', today);
        }, 300000); // 5 דקות
        
        return () => {
          clearTimeout(ratingTimer);
          clearTimeout(shareTimer);
        };
      } catch (error) {
        console.error("Error loading ad settings:", error);
      }
    };
    
    checkAndShowDialogs();
  }, [user]);

  const handleSubmitRating = async (rating) => {
    try {
      if (rating === 5 && adSettings) {
        const bonusEndDate = new Date();
        bonusEndDate.setDate(bonusEndDate.getDate() + 1);

        await base44.entities.UserAdSettings.update(adSettings.id, {
          has_rated: true,
          rating_date: new Date().toISOString(),
          bonus_active_until: bonusEndDate.toISOString().split('T')[0]
        });

        alert("🎉 תודה על הדירוג! קיבלת יום אחד ללא פרסומות!");
      } else if (adSettings) {
        await base44.entities.UserAdSettings.update(adSettings.id, {
          has_rated: true,
          rating_date: new Date().toISOString()
        });
      }
      setShowRatingDialog(false);
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  const getReferralCode = () => {
    if (!user?.email) return 'guest';
    return btoa(user.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  };

  const readinessData = useReadinessCalculator(user, topics, practiceAttempts, examAttempts);

  // חישוב overallMastery מ-stats או מה-engine
  const overallMastery = useMemo(() => {
    if (engineData?.readiness) {
      return {
        totalTopicMastery: engineData.readiness.contentScore || 0,
        examsMastery: engineData.readiness.examScore || 0,
        readinessScore: engineData.readiness.readinessScore || 0
      };
    }
    return {
      totalTopicMastery: stats?.practiceAccuracy || 0,
      examsMastery: stats?.examAverage || 0,
      readinessScore: stats?.overallMastery || 0
    };
  }, [stats, engineData]);

  const daysUntilExam = user?.exam_date ?
  Math.max(0, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24))) :
  90;

  const toggleTask = (taskId) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter((t) => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p className="text-red-500">Error loading data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">שלום, {user?.full_name?.split(' ')[0] || 'תלמיד'}! 👋</h1>
          <p className="text-[11px] text-white/90">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-5 space-y-4">
        {user?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100"
          >
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <div className="bg-purple-100 p-2 rounded-full">
                   <Settings className="w-5 h-5 text-purple-600" />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900 text-sm">ניהול מערכת</h3>
                   <p className="text-xs text-gray-500">קיצורי דרך למנהל</p>
                 </div>
               </div>
               <div className="flex gap-2">
                 <Button 
                   size="sm" 
                   onClick={() => navigate(createPageUrl('AdminAIExams'))}
                   className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 rounded-lg"
                 >
                   מבחני AI
                 </Button>
                 <Button 
                   size="sm" 
                   onClick={() => navigate(createPageUrl('AdminBagrutManager'))}
                   className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 rounded-lg"
                 >
                   ניהול בגרויות
                 </Button>
               </div>
            </div>
          </motion.div>
        )}

        {/* מוכנות כללית - כרטיס מאוחד */}
        <OverallMasteryCard
          overallMastery={overallMastery}
          isLoading={isLoading} />


        {/* נושאים ושאלונים + משימות היום */}
        <DailyPlanCard
          readinessData={readinessData}
          topics={topics}
          modules={modules}
          practiceAttempts={practiceAttempts}
          examAttempts={examAttempts}
          isPremium={user?.is_premium}
          completedTasks={completedTasks}
          onToggleTask={toggleTask}
          engineData={engineData}
          subject={user?.selected_subject || ''}
          unitLevel={user?.selected_units || 0}
          userEmail={user?.email || ''} />

        {/* המשך מאיפה שהפסקת */}
        {lastActivity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-[#3B82F6] p-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex-1 text-right">
                  <h3 className="text-base font-bold">המשך מאיפה שהפסקת</h3>
                </div>
                <PlayCircle className="w-7 h-7" />
              </div>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <div className="text-[15px] font-bold text-gray-900">{lastActivity.topic}</div>
                <div className="text-[13px] text-gray-600">{lastActivity.type === 'practice' ? 'תרגול נושא' : 'בגרות'}</div>
              </div>

              <Button
                onClick={() => {
                  if (lastActivity.type === 'practice') {
                    navigate(`${createPageUrl("TopicPracticeNew")}?topicId=${lastActivity.topicId}&setNumber=1`);
                  } else {
                    sessionStorage.setItem('currentExamId', lastActivity.examId);
                    navigate(`${createPageUrl("ExamGeneric")}?examId=${lastActivity.examId}`);
                  }
                }}
                className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]"
              >
                <PlayCircle className="w-5 h-5 ml-2" />
                המשך
              </Button>
            </div>
          </motion.div>
        )}

      </div>

      {/* Rating Dialog - appears after 3 minutes */}
      <RatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        onSubmitRating={handleSubmitRating}
        onClose={() => setShowRatingDialog(false)}
      />

      {/* Share Dialog - appears after 5 minutes */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        referralCode={getReferralCode()}
        onClose={() => setShowShareDialog(false)}
      />
    </div>);

}