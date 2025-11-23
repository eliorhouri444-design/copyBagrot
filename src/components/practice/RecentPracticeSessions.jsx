import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, X, TrendingUp, Crown, Target, Lock, Play } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function RecentPracticeSessions({ subject, units, userEmail, isPremium = false }) {
  const navigate = useNavigate();
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAdDialog, setShowAdDialog] = useState(null);
  const [unlockedSessions, setUnlockedSessions] = useState(new Set());

  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['practice-sessions', subject, units, userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const allSessions = await base44.entities.PracticeSessionNew.list("-created_date", 100);
      return allSessions.filter(s => 
        s.created_by === userEmail &&
        s.subject_id === subject &&
        parseInt(s.unit_level) === parseInt(units) &&
        s.is_completed
      );
    },
    enabled: !!userEmail
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['topics', subject, units],
    queryFn: async () => {
      const topics = await base44.entities.TopicNew.list();
      return topics.filter(t => 
        t.subject_id === subject &&
        parseInt(t.unit_level) === parseInt(units) &&
        t.is_active
      );
    }
  });

  const getTopicName = (topicId) => {
    const topic = allTopics.find(t => t.topic_id === topicId);
    return topic?.name || topicId;
  };

  if (!practiceSessions || practiceSessions.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-md overflow-hidden mt-6"
      >
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
          <div className="flex items-center gap-3 text-white">
            <div className="flex-1 text-right">
              <h3 className="text-base font-bold">תרגולים אחרונים</h3>
              <p className="text-xs opacity-90">הביצועים שלך בתרגול</p>
            </div>
            <BookOpen className="w-7 h-7" />
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {practiceSessions.slice(0, 2).map((session, idx) => {
              const passed = session.percentage >= 70;

              return (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  whileHover={{ scale: 1.02, x: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isPremium || unlockedSessions.has(session.id)) {
                      setSelectedSession(session);
                    } else {
                      setShowAdDialog(session);
                    }
                  }}
                  className="w-full text-right hover:bg-gray-50 rounded-lg p-3 transition-colors border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <motion.div
                      className={`p-2 rounded-lg ${passed ? 'bg-green-100' : 'bg-orange-100'}`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      {passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      )}
                    </motion.div>
                    <div className="flex-1 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {getTopicName(session.topic_id)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.created_date).toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {isPremium ? (
                      <>
                        <motion.div
                          className={`text-lg font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
                        >
                          {Math.round(session.percentage)}%
                        </motion.div>
                        <div className="text-[10px] text-gray-500">
                          {session.total_score || 0}/{session.max_score || 0}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {practiceSessions.length > 2 && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setShowAllSessions(true)}
                variant="outline"
                className="w-full mt-3 h-10 text-sm font-semibold border-2 border-green-200 text-green-600 hover:bg-green-50"
              >
                צפה בכל התרגולים ({practiceSessions.length})
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      <Dialog open={!!showAdDialog} onOpenChange={() => { setShowAdDialog(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">צפייה בציון התרגול</DialogTitle>
            <DialogDescription>
              בחר אופציה לצפייה בפרטי התרגול והציון
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200 text-center">
              <Play className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">צפה בפרסומת</h3>
              <p className="text-sm text-gray-600 mb-4">
                צפה בפרסומת קצרה כדי לפתוח את הציון והמשוב
              </p>
              <Button
                onClick={async () => {
                  alert("🎬 הפרסומת מתחילה...\n(סימולציה - בייצור יופיע וידאו אמיתי)");
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  setUnlockedSessions(prev => new Set([...prev, showAdDialog.id]));
                  setSelectedSession(showAdDialog);
                  setShowAdDialog(null);
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 font-bold"
              >
                <Play className="w-5 h-5 mr-2" />
                צפה בפרסומת
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">או</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200 text-center">
              <Crown className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">שדרג לפרימיום</h3>
              <p className="text-sm text-gray-600 mb-4">
                גישה בלתי מוגבלת לכל הציונים והמשוב - ללא פרסומות!
              </p>
              <Button
                onClick={() => {
                  setShowAdDialog(null);
                  navigate(createPageUrl("Premium"));
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white h-12 font-bold"
              >
                <Crown className="w-5 h-5 mr-2" />
                שדרג עכשיו
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdDialog(null)} className="w-full">
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">פרטי התרגול</DialogTitle>
            {!isPremium && (
              <DialogDescription className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                נפתח לאחר צפייה בפרסומת
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(selectedSession.percentage)}%
                    </div>
                    <div className="text-xs text-gray-600">ציון סופי</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedSession.total_score || 0}/{selectedSession.max_score || 0}
                    </div>
                    <div className="text-xs text-gray-600">נקודות</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {new Date(selectedSession.created_date).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                    <div className="text-xs text-gray-600">תאריך</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="text-sm text-gray-700">
                  <div className="font-bold text-blue-900 mb-2">📚 נושא התרגול</div>
                  <div>{getTopicName(selectedSession.topic_id)}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedSession(null)} className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllSessions} onOpenChange={setShowAllSessions}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">כל התרגולים שלך</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {practiceSessions.map((session) => {
              const passed = session.percentage >= 70;
              const hasMistakes = session.percentage < 70;

              return (
                <div key={session.id} className="space-y-2">
                  <button
                    onClick={() => {
                      setShowAllSessions(false);
                      if (isPremium || unlockedSessions.has(session.id)) {
                        setSelectedSession(session);
                      } else {
                        setShowAdDialog(session);
                      }
                    }}
                    className="w-full text-right hover:bg-gray-50 rounded-lg p-3 transition-colors border border-gray-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${passed ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {passed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <div className="text-right flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {getTopicName(session.topic_id)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(session.created_date).toLocaleDateString('he-IL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isPremium ? (
                        <>
                          <div className={`text-xl font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
                            {Math.round(session.percentage)}%
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {session.total_score || 0}/{session.max_score || 0}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </button>

                  {hasMistakes && (
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-3 border-2 border-red-200 mr-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-red-600" />
                        <h4 className="font-bold text-gray-900 text-sm">תרגול טעויות מתרגול זה</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        חזור על השאלות שטעית בהן
                      </p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllSessions(false);
                          if (isPremium) {
                            sessionStorage.setItem('weakPracticeSource', session.id);
                            navigate(createPageUrl("CustomWeakPractice"));
                          } else {
                            navigate(createPageUrl("Premium"));
                          }
                        }}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white h-9 text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <Target className="w-3 h-3" />
                        {isPremium ? 'תרגול טעויות' : '🔒 שדרג לפרימיום'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAllSessions(false)} className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}