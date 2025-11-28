import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Upload, Save, Trash2, ArrowUp, ArrowDown, GripVertical, Crown, Target, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TopicCarousel from "@/components/practice/TopicCarousel";
import RecentPracticeSessions from "@/components/practice/RecentPracticeSessions";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from
"@/components/ui/dialog";

export default function PracticePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTopicEditDialog, setShowTopicEditDialog] = useState(false);
  const [editingTopicData, setEditingTopicData] = useState(null);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [reorderTopics, setReorderTopics] = useState([]);
  const [practiceData, setPracticeData] = useState(null);
  const [cachedSubject, setCachedSubject] = useState(() => localStorage.getItem('selected_subject') || 'אנגלית');
  const [cachedUnits, setCachedUnits] = useState(() => localStorage.getItem('selected_units') || '3');

  const displaySubject = user?.selected_subject || cachedSubject;
  const displayUnits = parseInt(user?.selected_units || cachedUnits);

  const subjectColors = {
    "אנגלית": "bg-blue-600",
    "מתמטיקה": "bg-purple-600",
    "פיזיקה": "bg-green-600",
    "ספרות": "bg-pink-600",
    "היסטוריה": "bg-amber-600",
    "גאוגרפיה": "bg-cyan-600"
  };

  const headerColor = subjectColors[displaySubject] || "bg-blue-600";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (currentUser?.selected_subject) {
          setCachedSubject(currentUser.selected_subject);
          localStorage.setItem('selected_subject', currentUser.selected_subject);
        }
        if (currentUser?.selected_units) {
          setCachedUnits(currentUser.selected_units.toString());
          localStorage.setItem('selected_units', currentUser.selected_units.toString());
        }

        // Load topics and sessions
        const subject = currentUser?.selected_subject || cachedSubject;
        const units = parseInt(currentUser?.selected_units || cachedUnits);

        const [customTopics, allQuestions, recentSessions, allPracticeAttempts] = await Promise.all([
        base44.entities.TopicNew.filter({ subject_id: subject, unit_level: units, is_active: true }, null, 50),
        base44.entities.QuestionBank.filter({ subject_id: subject, unit_level: units, is_active: true }, null, 500),
        base44.entities.PracticeSessionNew.filter({ created_by: currentUser.email, subject_id: subject, unit_level: units }, '-created_date', 5),
        base44.entities.AttemptNew.filter({ created_by: currentUser.email, subject_id: subject }, '-created_date', 500)]
        );

        // Build topics with stats
        const topicsMap = {};
        customTopics.forEach((topic) => {
          topicsMap[topic.topic_id] = {
            topic_id: topic.topic_id,
            name: topic.name,
            icon: topic.icon || '📚',
            color: topic.color || 'from-blue-500 to-blue-600',
            order: topic.order || 0,
            questionCount: 0,
            stats: { correct: 0, wrong: 0, progress: 0 }
          };
        });

        allQuestions.forEach((q) => {
          if (q.topic_id) {
            if (!topicsMap[q.topic_id]) {
              const parts = q.topic_id.split('_');
              topicsMap[q.topic_id] = {
                topic_id: q.topic_id,
                name: parts.length >= 3 ? parts.slice(2).join(' ') : q.topic_id,
                icon: '📚',
                color: 'from-blue-500 to-blue-600',
                order: 999,
                questionCount: 0,
                stats: { correct: 0, wrong: 0, progress: 0 }
              };
            }
            topicsMap[q.topic_id].questionCount++;
          }
        });

        const topicsArray = Object.values(topicsMap).
        filter((t) => t.questionCount > 0 || customTopics.some((ct) => ct.topic_id === t.topic_id)).
        sort((a, b) => a.order - b.order);

        // Process recent sessions
        const sessionsWithTopics = recentSessions.map((session) => {
          const topic = topicsMap[session.topic_id];
          return {
            ...session,
            topicName: topic?.name || session.topic_id?.split('_').slice(2).join(' ') || 'תרגול כללי',
            icon: topic?.icon || '📚'
          };
        });

        setPracticeData({
          topics: topicsArray,
          recentSessions: sessionsWithTopics,
          practiceAttempts: allPracticeAttempts
        });

      } catch (error) {
        console.error("Error loading practice data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEditTopic = async (topic) => {
    setEditingTopicData({
      topic_id: topic.topic_id,
      subject: displaySubject,
      unit_level: displayUnits,
      name: topic.name,
      description: topic.description || '',
      icon: topic.icon || '',
      color: topic.color || 'from-blue-500 to-blue-600',
      order: topic.order || 0
    });
    setShowTopicEditDialog(true);
  };

  const handleSaveTopicEdit = async () => {
    if (!editingTopicData) return;

    // Generate topic_id if adding new topic
    const finalTopicId = editingTopicData.topic_id.endsWith('_') ?
    `${displaySubject}_${displayUnits}_${editingTopicData.name.replace(/\s+/g, '_')}` :
    editingTopicData.topic_id;

    try {
      const existingTopics = await base44.entities.TopicNew.filter({
        topic_id: finalTopicId,
        subject_id: displaySubject,
        unit_level: displayUnits
      });

      const topicData = {
        topic_id: finalTopicId,
        subject_id: displaySubject,
        unit_level: displayUnits,
        name: editingTopicData.name,
        description: editingTopicData.description,
        icon: editingTopicData.icon,
        color: editingTopicData.color || 'from-blue-500 to-blue-600',
        order: editingTopicData.order,
        is_active: true
      };

      if (existingTopics.length > 0) {
        await base44.entities.TopicNew.update(existingTopics[0].id, topicData);
      } else {
        await base44.entities.TopicNew.create(topicData);
      }

      alert('הנושא עודכן בהצלחה! ✅');
      setShowTopicEditDialog(false);
      setEditingTopicData(null);
      window.location.reload();
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('שגיאה בשמירת הנושא: ' + error.message);
    }
  };

  const handleDeleteTopic = async () => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הנושא '${editingTopicData?.name}'?`)) return;

    try {
      const existingTopics = await base44.entities.TopicNew.filter({
        topic_id: editingTopicData.topic_id,
        subject_id: displaySubject,
        unit_level: displayUnits
      });

      if (existingTopics.length > 0) {
        await base44.entities.TopicNew.update(existingTopics[0].id, { is_active: false });
        alert('הנושא הוסתר בהצלחה.');
        setShowTopicEditDialog(false);
        setEditingTopicData(null);
        window.location.reload();
      } else {
        alert('נושא זה לא קיים במערכת.');
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('שגיאה במחיקת הנושא: ' + error.message);
    }
  };

  const handleOpenReorderDialog = async () => {
    try {
      const allQuestions = await base44.entities.QuestionBank.list();
      const relevantQuestions = allQuestions.filter((q) =>
      q.subject_id === displaySubject &&
      parseInt(q.unit_level) === parseInt(displayUnits) &&
      q.is_active === true &&
      q.topic_id
      );

      const customTopics = await base44.entities.TopicNew.filter({
        subject_id: displaySubject,
        unit_level: parseInt(displayUnits),
        is_active: true
      });

      const topicsMap = {};
      relevantQuestions.forEach((q) => {
        if (!topicsMap[q.topic_id]) {
          topicsMap[q.topic_id] = {
            topic_id: q.topic_id,
            name: q.topic_id,
            order: 0,
            questionCount: 0
          };
        }
        topicsMap[q.topic_id].questionCount++;
      });

      customTopics.forEach((ct) => {
        if (topicsMap[ct.topic_id]) {
          topicsMap[ct.topic_id].name = ct.name;
          topicsMap[ct.topic_id].order = ct.order || 0;
          topicsMap[ct.topic_id].customTopicId = ct.id;
        }
      });

      const topicsArray = Object.values(topicsMap).sort((a, b) => a.order - b.order);
      setReorderTopics(topicsArray);
      setShowReorderDialog(true);
    } catch (error) {
      console.error('Error loading topics for reorder:', error);
      alert('שגיאה בטעינת הנושאים');
    }
  };

  const handleMoveTopicUp = (index) => {
    if (index === 0) return;
    const newTopics = [...reorderTopics];
    [newTopics[index], newTopics[index - 1]] = [newTopics[index - 1], newTopics[index]];
    setReorderTopics(newTopics);
  };

  const handleMoveTopicDown = (index) => {
    if (index === reorderTopics.length - 1) return;
    const newTopics = [...reorderTopics];
    [newTopics[index], newTopics[index + 1]] = [newTopics[index + 1], newTopics[index]];
    setReorderTopics(newTopics);
  };

  const handleSaveReorder = async () => {
    try {
      for (let i = 0; i < reorderTopics.length; i++) {
        const topic = reorderTopics[i];

        if (topic.customTopicId) {
          await base44.entities.TopicNew.update(topic.customTopicId, { order: i });
        } else {
          await base44.entities.TopicNew.create({
            topic_id: topic.topic_id,
            subject_id: displaySubject,
            unit_level: displayUnits,
            name: topic.name,
            order: i,
            is_active: true
          });
        }
      }

      alert('הסדר עודכן בהצלחה! ✅');
      setShowReorderDialog(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving reorder:', error);
      alert('שגיאה בשמירת הסדר: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>);

  }

  return (
    <div className="bg-blue-100 pt-0 pb-20 min-h-screen">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("SubjectSelection"))}
          className="text-right flex-1 hover:opacity-90 transition-opacity">

          <h1 className="text-[16px] font-bold text-white">תרגול {displaySubject}</h1>
          <p className="text-[11px] text-white/70">{displayUnits} יחידות</p>
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="bg-blue-100 pb-6 px-6 space-y-6">

        <motion.div
          key={`${displaySubject}_${displayUnits}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>

          <TopicCarousel
            topics={practiceData?.topics || []}
            practiceAttempts={practiceData?.practiceAttempts || []}
            isPremium={user?.is_premium}
            onEditTopic={user?.role === 'admin' ? handleEditTopic : null}
            onAddTopic={user?.role === 'admin' ? () => {
              setEditingTopicData({
                topic_id: `${displaySubject}_${displayUnits}_`,
                subject: displaySubject,
                unit_level: displayUnits,
                name: '',
                description: '',
                icon: '📚',
                color: 'from-blue-500 to-blue-600',
                order: 999
              });
              setShowTopicEditDialog(true);
            } : null} />

        </motion.div>

        {/* תרגולים אחרונים */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}>

          <RecentPracticeSessions
            subject={displaySubject}
            units={displayUnits}
            userEmail={user?.email}
            isPremium={user?.is_premium} />


        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[#3B82F6] p-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex-1 text-right">
                  <h3 className="text-base font-bold">תרגול פרימיום מותאם אישית</h3>
                  <p className="text-xs opacity-90">תכונות ייחודיות למנויי פרימיום</p>
                </div>
                <Crown className="w-7 h-7" />
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-gray-600 text-[13px] mb-4 text-center">
                תרגול חכם ומותאם במיוחד בשבילך
              </p>
              
              <div className="space-y-2">
                {/* תרגול על בסיס טעויות */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (user?.is_premium) {
                      navigate(createPageUrl("WeakAreaSelection"));
                    } else {
                      navigate(createPageUrl("Premium"));
                    }
                  }}
                  className="bg-blue-50 p-3 text-right rounded-xl w-full border-2 transition-all border-blue-200 hover:border-blue-400 cursor-pointer">







                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 rounded-lg flex-shrink-0 w-10 h-10 from-orange-600 to-red-600 flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-[13px] mb-0.5">תרגול טעויות ונושאים חלשים</div>
                      <div className="text-[11px] text-gray-600">תרגול ממוקד בנושאים שטעית בהם בעבר</div>
                    </div>
                    {!user?.is_premium &&
                    <Crown className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                </motion.button>

                {/* בניה עצמאית */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (user?.is_premium) {
                      navigate(createPageUrl("CustomPracticeBuilder"));
                    } else {
                      navigate(createPageUrl("Premium"));
                    }
                  }}
                  className="bg-blue-50 p-3 text-right rounded-xl w-full border-2 transition-all border-blue-200 hover:border-blue-400 cursor-pointer">







                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 rounded-lg w-10 h-10 from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-[13px] mb-0.5">בניה עצמאית של תרגול</div>
                      <div className="text-[11px] text-gray-600">בחר נושאים, כמות שאלות ורמת קושי בעצמך</div>
                    </div>
                    {!user?.is_premium &&
                    <Crown className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                </motion.button>
              </div>

              {!user?.is_premium &&
              <div className="mt-4 text-center">
                  <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="bg-[#3B82F6] hover:bg-blue-700 text-white h-11 text-[13px] font-bold rounded-[14px] px-8">

                    <Crown className="w-4 h-4 ml-2" />
                    שדרג לפרימיום
                  </Button>
                </div>
              }
            </div>
          </div>
        </motion.div>

        {user?.role === 'admin' &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3">

            <div className="bg-white rounded-xl p-3 shadow-md border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-0.5">ניהול שאלות</h3>
                  <p className="text-[11px] text-gray-600">הוסף ועדכן</p>
                </div>
                <Button
                onClick={() => navigate(createPageUrl("AdminQuestionBank"))}
                className="bg-[#3B82F6] hover:bg-blue-700 text-white h-9 text-[12px] rounded-[14px]">

                  <Upload className="w-4 h-4 mr-2" />
                  נהל
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 shadow-md border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-0.5">ניהול נושאים</h3>
                  <p className="text-[11px] text-gray-600">הוסף, ערוך, סדר</p>
                </div>
                <Button
                onClick={() => navigate(createPageUrl("AdminTopics"))}
                className="bg-[#3B82F6] hover:bg-blue-700 text-white h-9 text-[12px] rounded-[14px]">

                  <BookOpen className="w-4 h-4 mr-2" />
                  נהל
                </Button>
              </div>
            </div>
          </motion.div>
        }
      </div>

      <Dialog open={showTopicEditDialog} onOpenChange={setShowTopicEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              {editingTopicData?.name ? `עריכת ${editingTopicData.name}` : 'הוספת נושא חדש'}
            </DialogTitle>
            <DialogDescription>
              ערוך את פרטי הנושא: {displaySubject} - {displayUnits} יחידות
            </DialogDescription>
          </DialogHeader>

          {editingTopicData &&
          <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  שם הנושא
                </label>
                <Input
                type="text"
                value={editingTopicData.name}
                onChange={(e) => setEditingTopicData({ ...editingTopicData, name: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: קריאה והבנה" />

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תיאור הנושא
                </label>
                <Textarea
                value={editingTopicData.description}
                onChange={(e) => setEditingTopicData({ ...editingTopicData, description: e.target.value })}
                className="w-full h-20"
                placeholder="תיאור מפורט של הנושא" />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    אייקון (emoji)
                  </label>
                  <Input
                  type="text"
                  value={editingTopicData.icon}
                  onChange={(e) => setEditingTopicData({ ...editingTopicData, icon: e.target.value })}
                  className="w-full"
                  placeholder="📖" />

                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    סדר תצוגה
                  </label>
                  <Input
                  type="number"
                  value={editingTopicData.order}
                  onChange={(e) => setEditingTopicData({ ...editingTopicData, order: parseInt(e.target.value) })}
                  className="w-full" />

                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  צבע רקע (Tailwind Gradient)
                </label>
                <Select
                value={editingTopicData.color}
                onValueChange={(value) => setEditingTopicData({ ...editingTopicData, color: value })}>

                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר צבע" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from-blue-500 to-blue-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
                        <span>כחול</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-purple-500 to-purple-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-purple-500 to-purple-600" />
                        <span>סגול</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-pink-500 to-pink-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-pink-500 to-pink-600" />
                        <span>ורוד</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-green-500 to-emerald-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-green-500 to-emerald-600" />
                        <span>ירוק</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-orange-500 to-orange-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
                        <span>כתום</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-cyan-500 to-cyan-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-cyan-500 to-cyan-600" />
                        <span>תכלת</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-red-500 to-red-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-red-500 to-red-600" />
                        <span>אדום</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from-indigo-500 to-indigo-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-r from-indigo-500 to-indigo-600" />
                        <span>אינדיגו</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="text-sm text-gray-700">
                  <strong>💡 טיפ:</strong> המידע שתזין יעזור לתלמידים להבין טוב יותר את הנושא ולמצוא תרגולים רלוונטיים
                </div>
              </div>
            </div>
          }

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopicEditDialog(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTopic}>

              <Trash2 className="w-4 h-4 mr-2" />
              הסתר נושא
            </Button>
            <Button onClick={handleSaveTopicEdit} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReorderDialog} onOpenChange={setShowReorderDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <GripVertical className="w-6 h-6 text-indigo-600" />
              שינוי סדר הנושאים
            </DialogTitle>
            <DialogDescription>
              שנה את סדר התצוגה של הנושאים - {displaySubject} {displayUnits} יחידות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {reorderTopics.map((topic, index) =>
            <div
              key={topic.topic_id}
              className="bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center gap-3">

                <div className="text-2xl font-bold text-gray-400 w-8 text-center">
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{topic.name}</div>
                  <div className="text-xs text-gray-500">{topic.questionCount} שאלות</div>
                </div>

                <div className="flex gap-1">
                  <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMoveTopicUp(index)}
                  disabled={index === 0}
                  className="h-9 w-9">

                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMoveTopicDown(index)}
                  disabled={index === reorderTopics.length - 1}
                  className="h-9 w-9">

                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReorderDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveReorder} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              שמור סדר חדש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}