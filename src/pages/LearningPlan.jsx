import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Trophy,
  ChevronLeft,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LearningPlanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    target_score: 85,
    exam_date: ''
  });
  const [isCalculating, setIsCalculating] = useState(false);
  
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser?.exam_date) {
          setEditData(prev => ({ ...prev, exam_date: currentUser.exam_date }));
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);
  
  const { data: learningProfile, refetch } = useQuery({
    queryKey: ['learning-profile', user?.email, user?.selected_subject],
    queryFn: async () => {
      if (!user?.email || !user?.selected_subject) return null;
      
      const profiles = await base44.entities.UserLearningProfile.filter({
        user_email: user.email,
        subject_id: user.selected_subject
      });
      
      return profiles[0] || null;
    },
    enabled: !!user?.email && !!user?.selected_subject
  });
  
  const handleRecalculate = async () => {
    if (!user?.selected_subject || !editData.exam_date) return;
    
    setIsCalculating(true);
    try {
      const response = await base44.functions.invoke('calculateLearningPlan', {
        subject_id: user.selected_subject,
        unit_level: user.selected_units || 3,
        target_score: editData.target_score,
        exam_date: editData.exam_date
      });
      
      if (response.data.success) {
        // Update user's exam date
        await base44.auth.updateMe({ exam_date: editData.exam_date });
        
        setShowEditDialog(false);
        refetch();
        alert('התכנית עודכנה בהצלחה! ✅');
      }
    } catch (error) {
      console.error('Error recalculating plan:', error);
      alert('שגיאה בחישוב התכנית');
    } finally {
      setIsCalculating(false);
    }
  };
  
  if (!user || !learningProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  
  const daysLeft = learningProfile.days_until_exam || 0;
  const urgency = daysLeft <= 21 ? 'high' : daysLeft <= 60 ? 'medium' : 'low';
  const urgencyColor = urgency === 'high' ? 'from-red-500 to-orange-600' : 
                        urgency === 'medium' ? 'from-yellow-500 to-orange-500' : 
                        'from-green-500 to-emerald-600';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 pb-24 animate-background-flow">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${urgencyColor} rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">התכנית שלך לבגרות</h1>
            <p className="text-white/90">{user.selected_subject} • {user.selected_units} יחידות</p>
          </div>
        </div>
      </motion.div>
      
      <div className="px-6 space-y-6">
        {/* Days Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-gradient-to-r ${urgencyColor} rounded-2xl shadow-xl p-6 text-white text-center animate-hover-card`}
        >
          <Calendar className="w-16 h-16 mx-auto mb-4" />
          <div className="text-6xl font-black mb-2">{daysLeft}</div>
          <div className="text-xl font-semibold">ימים עד הבגרות</div>
          <div className="text-sm opacity-90 mt-2">
            {new Date(learningProfile.exam_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </motion.div>
        
        {/* Current Status - Based on Curriculum */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-lg p-6 animate-hover-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">התקדמות בסילבוס</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Settings className="w-4 h-4 ml-2" />
              ערוך יעדים
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-sm text-gray-600 mb-1">פרק נוכחי</div>
              <div className="text-xl font-bold text-blue-900">
                פרק {learningProfile.current_chapter}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">התקדמות בתכנית הלימודים</span>
                <span className="text-lg font-bold text-blue-600">{Math.round(learningProfile.current_mastery)}%</span>
              </div>
              <Progress value={learningProfile.current_mastery} className="h-3 bg-blue-100" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{learningProfile.completed_chapters?.length || 0}</div>
                <div className="text-xs text-gray-600">פרקים הושלמו</div>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{learningProfile.chapters_remaining || 0}</div>
                <div className="text-xs text-gray-600">פרקים נותרו</div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Daily Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 animate-hover-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">יעד יומי מחושב</h3>
              <p className="text-sm text-gray-600">מותאם למצבך האישי</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 text-center">
            <div className="text-5xl font-black text-blue-600 mb-2">
              {learningProfile.daily_goal_questions}
            </div>
            <div className="text-sm text-gray-700 font-semibold">שאלות ביום</div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>יעד שבועי</span>
              <span className="font-bold text-gray-900">{learningProfile.daily_goal_questions * 7} שאלות</span>
            </div>
            <div className="flex justify-between">
              <span>יעד חודשי</span>
              <span className="font-bold text-gray-900">{learningProfile.daily_goal_questions * 30} שאלות</span>
            </div>
          </div>
        </motion.div>
        
        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-lg p-6 animate-hover-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-bold text-gray-900">המלצות</h3>
          </div>
          
          <div className="space-y-3">
            {daysLeft <= 21 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-900">דחיפות גבוהה!</span>
                </div>
                <p className="text-sm text-gray-700">
                  נותרו פחות מ-3 שבועות. התמקד בסימולציות מלאות ובנושאים החלשים בלבד.
                </p>
              </div>
            )}
            
            {learningProfile.weak_topics?.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="font-bold text-orange-900 mb-2">נושאים לחיזוק עדיפות גבוהה:</div>
                <div className="space-y-1">
                  {learningProfile.weak_topics.slice(0, 3).map((topic, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span>{topic.topic_id}</span>
                      <span className="text-orange-600 font-semibold">({Math.round(topic.mastery)}% שליטה)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="font-bold text-blue-900 mb-2">תכנון מומלץ:</div>
              <p className="text-sm text-gray-700">
                {daysLeft <= 21 
                  ? 'סימולציה מלאה כל יום + חזרה על טעויות'
                  : daysLeft <= 60 
                    ? `${learningProfile.daily_goal_questions} שאלות ביום + סימולציה פעם בשבוע`
                    : `${learningProfile.daily_goal_questions} שאלות ביום בקצב נוח`}
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Progress to Target */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6 animate-hover-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">התקדמות ליעד</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">יעד ציון</span>
                <span className="text-2xl font-bold text-purple-600">{learningProfile.target_score}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">חומר שנותר ללמוד</span>
                <span className="text-lg font-bold text-blue-600">{Math.round(learningProfile.remaining_material_percent)}%</span>
              </div>
              <Progress value={100 - learningProfile.remaining_material_percent} className="h-3 bg-blue-100" />
            </div>
          </div>
        </motion.div>
        
        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={() => navigate(createPageUrl("DailyPractice"))}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-bold rounded-xl shadow-lg"
          >
            <CheckCircle className="w-5 h-5 ml-2" />
            התחל תרגול היום
          </Button>
        </motion.div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">עדכן יעדים</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                יעד ציון
              </label>
              <Input
                type="number"
                min="55"
                max="100"
                value={editData.target_score}
                onChange={(e) => setEditData({ ...editData, target_score: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך הבגרות
              </label>
              <Input
                type="date"
                value={editData.exam_date}
                onChange={(e) => setEditData({ ...editData, exam_date: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleRecalculate}
              disabled={isCalculating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                  מחשב...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 ml-2" />
                  חשב מחדש
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}