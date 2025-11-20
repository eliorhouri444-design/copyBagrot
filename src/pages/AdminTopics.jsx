import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Plus, Edit2, Trash2, Save, ArrowUp, ArrowDown, Filter, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function AdminTopicsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterUnits, setFilterUnits] = useState("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      const allTopics = await base44.entities.TopicNew.list("-order", 500);
      setTopics(allTopics);
    } catch (error) {
      console.error("Error loading topics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTopics = topics.filter(t => {
    const subjectMatch = filterSubject === "all" || t.subject_id === filterSubject;
    const unitsMatch = filterUnits === "all" || t.unit_level?.toString() === filterUnits;
    return subjectMatch && unitsMatch;
  });

  const groupedTopics = filteredTopics.reduce((acc, topic) => {
    const key = `${topic.subject_id}_${topic.unit_level}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(topic);
    return acc;
  }, {});

  const handleEditTopic = (topic) => {
    setEditingTopic({ ...topic });
    setShowEditDialog(true);
  };

  const handleAddNewTopic = () => {
    const subject = filterSubject !== "all" ? filterSubject : "אנגלית";
    const units = filterUnits !== "all" ? parseInt(filterUnits) : 3;
    
    setEditingTopic({
      topic_id: `${subject}_${units}_new_topic`,
      subject_id: subject,
      unit_level: units,
      name: '',
      description: '',
      icon: '📚',
      color: 'from-blue-500 to-blue-600',
      order: 999,
      is_active: true
    });
    setShowEditDialog(true);
  };

  const handleSaveTopic = async () => {
    if (!editingTopic.name) {
      alert("שם הנושא חובה");
      return;
    }

    try {
      const finalTopicId = editingTopic.id 
        ? editingTopic.topic_id 
        : `${editingTopic.subject_id}_${editingTopic.unit_level}_${editingTopic.name.replace(/\s+/g, '_')}`;

      const topicData = {
        topic_id: finalTopicId,
        subject_id: editingTopic.subject_id,
        unit_level: editingTopic.unit_level,
        name: editingTopic.name,
        description: editingTopic.description || '',
        icon: editingTopic.icon || '📚',
        color: editingTopic.color || 'from-blue-500 to-blue-600',
        order: editingTopic.order || 0,
        is_active: true
      };

      if (editingTopic.id) {
        await base44.entities.TopicNew.update(editingTopic.id, topicData);
      } else {
        await base44.entities.TopicNew.create(topicData);
      }

      alert('הנושא נשמר בהצלחה! ✅');
      setShowEditDialog(false);
      setEditingTopic(null);
      loadTopics();
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('שגיאה בשמירת הנושא: ' + error.message);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק נושא זה?`)) return;

    try {
      await base44.entities.TopicNew.delete(topicId);
      alert('הנושא נמחק! ✅');
      loadTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('שגיאה במחיקת הנושא: ' + error.message);
    }
  };

  const handleMoveUp = async (topic, groupTopics) => {
    const currentIndex = groupTopics.findIndex(t => t.id === topic.id);
    if (currentIndex === 0) return;

    try {
      const prevTopic = groupTopics[currentIndex - 1];
      
      await base44.entities.TopicNew.update(topic.id, { order: prevTopic.order });
      await base44.entities.TopicNew.update(prevTopic.id, { order: topic.order });
      
      loadTopics();
    } catch (error) {
      console.error('Error moving topic:', error);
      alert('שגיאה בהזזת הנושא');
    }
  };

  const handleMoveDown = async (topic, groupTopics) => {
    const currentIndex = groupTopics.findIndex(t => t.id === topic.id);
    if (currentIndex === groupTopics.length - 1) return;

    try {
      const nextTopic = groupTopics[currentIndex + 1];
      
      await base44.entities.TopicNew.update(topic.id, { order: nextTopic.order });
      await base44.entities.TopicNew.update(nextTopic.id, { order: topic.order });
      
      loadTopics();
    } catch (error) {
      console.error('Error moving topic:', error);
      alert('שגיאה בהזזת הנושא');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Practice"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">ניהול נושאי תרגול</h1>
            <p className="text-white/80">נהל את כל הנושאים בכל המקצועות</p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">סינון:</span>

            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="מקצוע" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקצועות</SelectItem>
                <SelectItem value="אנגלית">אנגלית</SelectItem>
                <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                <SelectItem value="ספרות">ספרות</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUnits} onValueChange={setFilterUnits}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="יחידות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל היחידות</SelectItem>
                <SelectItem value="3">3 יחידות</SelectItem>
                <SelectItem value="4">4 יחידות</SelectItem>
                <SelectItem value="5">5 יחידות</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button onClick={handleAddNewTopic} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              הוסף נושא
            </Button>
          </div>
        </div>

        {Object.keys(groupedTopics).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">אין נושאים בסינון זה</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTopics).sort().map(groupKey => {
              const [subject, units] = groupKey.split('_');
              const groupTopics = groupedTopics[groupKey].sort((a, b) => (a.order || 0) - (b.order || 0));

              return (
                <div key={groupKey} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                    <h2 className="text-xl font-bold text-white">
                      {subject} - {units} יחידות
                    </h2>
                    <p className="text-sm text-white/80">{groupTopics.length} נושאים</p>
                  </div>

                  <div className="p-4 space-y-3">
                    {groupTopics.map((topic, idx) => (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`border-2 rounded-xl p-4 ${topic.is_active === false ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${topic.color || 'from-blue-500 to-blue-600'} flex items-center justify-center text-2xl flex-shrink-0`}>
                            {topic.icon || '📚'}
                          </div>

                          <div className="flex-1">
                            <div className="font-bold text-gray-900">{topic.name}</div>
                            <div className="text-xs text-gray-500">
                              סדר: {topic.order || 0} • topic_id: {topic.topic_id}
                            </div>
                            {topic.description && (
                              <div className="text-xs text-gray-600 mt-1">{topic.description}</div>
                            )}
                            {topic.is_active === false && (
                              <div className="text-xs text-red-600 font-bold mt-1">❌ מוסתר</div>
                            )}
                          </div>

                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleMoveUp(topic, groupTopics)}
                              disabled={idx === 0}
                              className="h-9 w-9"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleMoveDown(topic, groupTopics)}
                              disabled={idx === groupTopics.length - 1}
                              className="h-9 w-9"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditTopic(topic)}
                              className="h-9 w-9 text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="h-9 w-9 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingTopic?.id ? 'עריכת נושא' : 'הוספת נושא חדש'}
            </DialogTitle>
            <DialogDescription>
              {editingTopic?.subject_id} - {editingTopic?.unit_level} יחידות
            </DialogDescription>
          </DialogHeader>

          {editingTopic && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מקצוע</label>
                  <Select
                    value={editingTopic.subject_id}
                    onValueChange={(v) => setEditingTopic({...editingTopic, subject_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="אנגלית">אנגלית</SelectItem>
                      <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                      <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                      <SelectItem value="ספרות">ספרות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">יחידות</label>
                  <Select
                    value={editingTopic.unit_level?.toString()}
                    onValueChange={(v) => setEditingTopic({...editingTopic, unit_level: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 יחידות</SelectItem>
                      <SelectItem value="4">4 יחידות</SelectItem>
                      <SelectItem value="5">5 יחידות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">שם הנושא</label>
                <Input
                  value={editingTopic.name}
                  onChange={(e) => setEditingTopic({...editingTopic, name: e.target.value})}
                  placeholder="לדוגמה: Listening Comprehension"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
                <Textarea
                  value={editingTopic.description || ''}
                  onChange={(e) => setEditingTopic({...editingTopic, description: e.target.value})}
                  placeholder="תיאור הנושא"
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">אייקון</label>
                  <Input
                    value={editingTopic.icon || ''}
                    onChange={(e) => setEditingTopic({...editingTopic, icon: e.target.value})}
                    placeholder="📚"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">סדר</label>
                  <Input
                    type="number"
                    value={editingTopic.order || 0}
                    onChange={(e) => setEditingTopic({...editingTopic, order: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">צבע רקע</label>
                <Select
                  value={editingTopic.color || 'from-blue-500 to-blue-600'}
                  onValueChange={(v) => setEditingTopic({...editingTopic, color: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from-blue-500 to-blue-600">כחול</SelectItem>
                    <SelectItem value="from-purple-500 to-purple-600">סגול</SelectItem>
                    <SelectItem value="from-pink-500 to-pink-600">ורוד</SelectItem>
                    <SelectItem value="from-green-500 to-emerald-600">ירוק</SelectItem>
                    <SelectItem value="from-orange-500 to-orange-600">כתום</SelectItem>
                    <SelectItem value="from-cyan-500 to-cyan-600">תכלת</SelectItem>
                    <SelectItem value="from-red-500 to-red-600">אדום</SelectItem>
                    <SelectItem value="from-indigo-500 to-indigo-600">אינדיגו</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveTopic} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}