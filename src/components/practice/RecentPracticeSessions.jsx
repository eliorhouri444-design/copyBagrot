import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function RecentPracticeSessions({ subject, units, userEmail }) {
  const navigate = useNavigate();
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

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
                  onClick={() => setSelectedSession(session)}
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

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">פרטי התרגול</DialogTitle>
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

              return (
                <button
                  key={session.id}
                  onClick={() => {
                    setShowAllSessions(false);
                    setSelectedSession(session);
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
                    <div className={`text-xl font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
                      {Math.round(session.percentage)}%
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {session.total_score || 0}/{session.max_score || 0}
                    </div>
                  </div>
                </button>
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