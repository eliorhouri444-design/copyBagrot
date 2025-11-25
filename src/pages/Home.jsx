import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, PlayCircle, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle } from "@/components/ui/card-simple";
import OverallMasteryCard from "@/components/mastery/OverallMasteryCard";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import DailyPlanCard from "@/components/home/DailyPlanCard";
import RatingDialog from "@/components/ads/RatingDialog";
import ShareDialog from "@/components/ads/ShareDialog";
import { useHomeData } from "@/components/cache/useHomeData";

export default function HomePage() {
  const navigate = useNavigate();
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [adSettings, setAdSettings] = useState(null);
  
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

  // Track referral clicks when someone opens a shared link
  useEffect(() => {
    const trackReferral = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (refCode) {
        try {
          // Check if this visitor already clicked (using localStorage)
          const clickedRefs = JSON.parse(localStorage.getItem('clicked_refs') || '[]');

          if (!clickedRefs.includes(refCode)) {
            // Record the click
            await base44.entities.ReferralClick.create({
              referral_code: refCode,
              clicked_at: new Date().toISOString(),
              visitor_id: Math.random().toString(36).substring(7)
            });

            // Mark as clicked
            clickedRefs.push(refCode);
            localStorage.setItem('clicked_refs', JSON.stringify(clickedRefs));
          }

          // Clean URL
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
        // Load ad settings
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
        
        // אם כבר דירג - לא מציגים
        if (currentSettings.has_rated) return;
        
        // בדוק אם המשתמש ביקש לא לראות שוב
        const neverShowRating = localStorage.getItem('never_show_rating_dialog') === 'true';
        const neverShowShare = localStorage.getItem('never_show_share_dialog') === 'true';
        
        // Show rating dialog after 3 minutes (180000ms)
        const ratingTimer = setTimeout(() => {
          // אל תציג אם כבר הוצג היום או אם ביקש לא לראות
          if (lastRatingShown === today || neverShowRating) return;
          setShowRatingDialog(true);
          localStorage.setItem('last_rating_dialog_date', today);
        }, 180000); // 3 דקות
        
        // Show share dialog after 5 minutes (300000ms)
        const shareTimer = setTimeout(() => {
          // אל תציג אם כבר הוצג היום או אם ביקש לא לראות
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

  // חישוב overallMastery מ-stats (כבר מחושב ב-useHomeData)
  const overallMastery = useMemo(() => ({
    topicMastery: stats.practiceAccuracy || 0,
    examMastery: stats.examAverage || 0,
    readinessScore: stats.overallMastery || 0
  }), [stats]);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] from-blue-500 to-indigo-500 flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">שלום, {user?.full_name?.split(' ')[0] || 'תלמיד'}! 👋</h1>
          <p className="text-[11px] text-white/90">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* מוכנות כללית - כרטיס מאוחד */}
        <OverallMasteryCard
          overallMastery={overallMastery}
          isLoading={masteryLoading} />


        {/* נושאים ושאלונים + משימות היום */}
        <DailyPlanCard
          readinessData={readinessData}
          topics={topics}
          modules={modules}
          practiceAttempts={practiceAttempts}
          examAttempts={examAttempts}
          isPremium={user?.is_premium}
          completedTasks={completedTasks}
          onToggleTask={toggleTask} />

        {/* המשך מאיפה שהפסקת */}
        {lastActivity &&
        <CardSimple delay={0.3}>
            <CardTitle icon={PlayCircle}>המשך מאיפה שהפסקת</CardTitle>
            <div className="mb-3">
              <div className="text-[15px] font-bold text-[#2B2B2B]">{lastActivity.topic}</div>
              <div className="text-[13px] text-[#6E6E6E]">{lastActivity.type === 'practice' ? 'תרגול נושא' : 'בגרות'}</div>
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
            className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]">

              <PlayCircle className="w-5 h-5 ml-2" />
              המשך
            </Button>
          </CardSimple>
        }

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