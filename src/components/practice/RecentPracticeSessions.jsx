import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  DialogFooter } from
"@/components/ui/dialog";

export default function RecentPracticeSessions({ subject, units, userEmail, isPremium = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAdDialog, setShowAdDialog] = useState(null);
  const [unlockedSessions, setUnlockedSessions] = useState(new Set());

  // האזנה לאירועי עדכון גלובליים
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 RecentPracticeSessions: Received update event');
      queryClient.invalidateQueries({ queryKey: ['practice-sessions', subject, units, userEmail] });
    };

    window.addEventListener('mastery-update', handleUpdate);
    window.addEventListener('practice-complete', handleUpdate);
    window.addEventListener('exam-complete', handleUpdate);

    return () => {
      window.removeEventListener('mastery-update', handleUpdate);
      window.removeEventListener('practice-complete', handleUpdate);
      window.removeEventListener('exam-complete', handleUpdate);
    };
  }, [queryClient, subject, units, userEmail]);

  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['practice-sessions', subject, units, userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const allSessions = await base44.entities.PracticeSessionNew.list("-created_date", 100);
      return allSessions.filter((s) =>
      s.created_by === userEmail &&
      s.subject_id === subject &&
      parseInt(s.unit_level) === parseInt(units) &&
      s.is_completed
      );
    },
    enabled: !!userEmail,
    staleTime: 0, // תמיד רענן
    refetchOnMount: true
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['topics', subject, units],
    queryFn: async () => {
      const topics = await base44.entities.TopicNew.list();
      return topics.filter((t) =>
      t.subject_id === subject &&
      parseInt(t.unit_level) === parseInt(units) &&
      t.is_active
      );
    }
  });

  const getTopicName = (topicId) => {
    const topic = allTopics.find((t) => t.topic_id === topicId);
    return topic?.name || topicId;
  };

  if (!practiceSessions || practiceSessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-[#3B82F6] p-4 from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3 text-white">
            <div className="flex-1 text-right">
              <h3 className="text-base font-bold">תרגולים אחרונים</h3>
              <p className="text-xs opacity-90">הביצועים שלך בתרגול</p>
            </div>
            <BookOpen className="w-7 h-7" />
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">אין תרגולים עדיין</p>
          <p className="text-gray-500 text-sm">התחל לתרגל כדי לראות את ההתקדמות שלך</p>
        </div>
      </div>);

  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-md overflow-hidden mt-6">

        <div className="bg-[#3B82F6] p-4 from-blue-600 to-indigo-600">
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
                  }} className="bg-slate-100 p-3 text-right rounded-lg w-full hover:bg-gray-50 transition-colors border border-gray-100 flex items-center justify-between">


                  <div className="flex items-center gap-3 flex-1">
                    <motion.div
                      className={`p-2 rounded-lg ${passed ? 'bg-green-100' : 'bg-orange-100'}`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}>

                      {passed ?
                      <CheckCircle className="w-4 h-4 text-green-600" /> :
                      <span className="text-orange-600"><TrendingUp className="w-4 h-4" /></span>
                      }
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
                    {isPremium ?
                    <>
                        <motion.div className="text-[#000000] text-lg font-bold"

                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}>

                          {Math.round(session.percentage)}%
                        </motion.div>
                        <div className="text-[10px] text-gray-500">
                          {session.total_score || 0}/{session.max_score || 0}
                        </div>
                      </> :

                    <div className="flex items-center gap-1">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    }
                  </div>
                </motion.button>);

            })}
          </div>

          {practiceSessions.length > 2 &&
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
              onClick={() => setShowAllSessions(true)}
              variant="outline" className="bg-background text-blue-600 mt-3 px-4 py-2 text-sm font-semibold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:text-accent-foreground w-full h-10 border-2 border-blue-200 hover:bg-blue-50">


                צפה בכל התרגולים ({practiceSessions.length})
              </Button>
            </motion.div>
          }
        </div>
      </motion.div>

      <Dialog open={!!showAdDialog} onOpenChange={() => {setShowAdDialog(null);}}>
        <DialogContent dir="rtl" className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-gray-900">צפייה בציון התרגול</DialogTitle>
            <DialogDescription className="text-[12px] text-gray-600">
              בחר אופציה לצפייה בפרטי התרגול והציון
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 text-center">
              <Play className="w-14 h-14 text-blue-600 mx-auto mb-3" />
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">צפה בפרסומת</h3>
              <p className="text-[12px] text-gray-600 mb-4">
                צפה בפרסומת קצרה כדי לפתוח את הציון והמשוב
              </p>
              <Button
                onClick={async () => {
                  alert("🎬 הפרסומת מתחילה...\n(סימולציה - בייצור יופיע וידאו אמיתי)");
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  setUnlockedSessions((prev) => new Set([...prev, showAdDialog.id]));
                  setSelectedSession(showAdDialog);
                  setShowAdDialog(null);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-[14px] font-bold rounded-xl">

                <Play className="w-5 h-5 mr-2" />
                צפה בפרסומת
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-[12px]">
                <span className="px-3 bg-white text-gray-500">או</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 text-center">
              <Crown className="w-14 h-14 text-amber-600 mx-auto mb-3" />
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">שדרג לפרימיום</h3>
              <p className="text-[12px] text-gray-600 mb-4">
                גישה בלתי מוגבלת לכל הציונים והמשוב - ללא פרסומות!
              </p>
              <Button
                onClick={() => {
                  setShowAdDialog(null);
                  navigate(createPageUrl("Premium"));
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white h-12 text-[14px] font-bold rounded-xl">

                <Crown className="w-5 h-5 mr-2" />
                שדרג עכשיו
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowAdDialog(null)} className="w-full h-11 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-[13px]">
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">פרטי התרגול</DialogTitle>
            {!isPremium &&
            <DialogDescription className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                נפתח לאחר צפייה בפרסומת
              </DialogDescription>
            }
          </DialogHeader>

          {selectedSession &&
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
          }

          <DialogFooter>
            <Button onClick={() => setSelectedSession(null)} className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllSessions} onOpenChange={setShowAllSessions}>
        <DialogContent dir="rtl" className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none">
          <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="bg-blue-500 px-5 py-4 from-blue-600 to-indigo-600 flex items-center justify-between flex-shrink-0">
              <div className="text-right flex-1">
                <h1 className="text-[18px] font-bold text-white">כל התרגולים שלך</h1>
                <p className="text-[12px] text-white/70">{practiceSessions.length} תרגולים</p>
              </div>
              <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Content - scrollable with better spacing */}
            <div className="bg-[#ffffff] px-4 py-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-5xl mx-auto pb-4">
                {practiceSessions.map((session, idx) => {
                  const passed = session.percentage >= 70;
                  const hasMistakes = session.percentage < 70;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.5) }}>

                      <button
                        onClick={() => {
                          setShowAllSessions(false);
                          if (isPremium || unlockedSessions.has(session.id)) {
                            setSelectedSession(session);
                          } else {
                            setShowAdDialog(session);
                          }
                        }} className="bg-slate-100 p-4 text-right rounded-xl w-full hover:bg-white transition-all shadow-md border border-gray-100 hover:border-blue-400 flex flex-col gap-3">


                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0 ${passed ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {passed ?
                          <CheckCircle className="w-6 h-6 text-green-600" /> :
                          <span className="text-orange-600"><TrendingUp className="w-6 h-6" /></span>
                          }
                          </div>
                          <div className="text-right flex-1 min-w-0">
                            <div className="text-[14px] font-bold text-gray-900 truncate">
                              {getTopicName(session.topic_id)}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {new Date(session.created_date).toLocaleDateString('he-IL', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div className="text-left">
                            {isPremium ?
                            <>
                                <div className="text-[#000000] font-black">
                                  {Math.round(session.percentage)}%
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {session.total_score || 0}/{session.max_score || 0}
                                </div>
                              </> :

                            <Lock className="w-6 h-6 text-gray-400" />
                            }
                          </div>
                        </div>

                        {hasMistakes && isPremium &&
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAllSessions(false);
                            sessionStorage.setItem('weakPracticeSource', session.id);
                            navigate(createPageUrl("CustomWeakPractice"));
                          }} className="bg-blue-500 text-[12px] px-4 py-2 font-bold rounded-xl whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-9 flex items-center justify-center gap-2">


                            <Target className="w-4 h-4" />
                            תרגול טעויות
                          </Button>
                        }
                      </button>
                    </motion.div>);

                })}
              </div>
            </div>

            {/* Footer - fixed at bottom */}
            <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
              <Button
                onClick={() => setShowAllSessions(false)}
                className="w-full max-w-md mx-auto h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[15px] block">

                סגור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>);

}