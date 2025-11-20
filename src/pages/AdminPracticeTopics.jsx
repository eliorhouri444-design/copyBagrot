
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Edit2, Trash2, Save, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminPracticeTopicsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [subject, setSubject] = useState("");
  const [units, setUnits] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "📚",
    order: 0
  });
  const [questionCounts, setQuestionCounts] = useState({});

  const subjects = ["אנגלית", "מתמטיקה", "פיזיקה", "כימיה", "ביולוגיה", "ספרות", "היסטוריה"];
  const unitsOptions = ["0", "2", "3", "4", "5"];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setSubject(currentUser?.selected_subject || "אנגלית");
        setUnits(currentUser?.selected_units?.toString() || "3");
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (subject && units) {
      loadTopics();
      loadQuestionCounts();
    }
  }, [subject, units]);

  const loadTopics = async () => {
    try {
      const allTopics = await base44.entities.TopicNew.filter({
        subject_id: subject,
        unit_level: parseInt(units)
      });
      setTopics(allTopics.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const loadQuestionCounts = async () => {
    try {
      const allQuestions = await base44.entities.QuestionBank.filter({
        subject_id: subject,
        unit_level: parseInt(units),
        is_active: true
      });

      const counts = {};
      allQuestions.forEach(q => {
        const topicId = q.topic_id || 'no_topic';
        counts[topicId] = (counts[topicId] || 0) + 1;
      });

      setQuestionCounts(counts);
    } catch (error) {
      console.error("Error loading question counts:", error);
    }
  };

  const handleAdd = () => {
    setEditingTopic(null);
    setFormData({
      name: "",
      description: "",
      icon: "📚",
      order: topics.length
    });
    setShowEditDialog(true);
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || "",
      icon: topic.icon || "📚",
      order: topic.order || 0
    });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("יש למלא שם נושא");
      return;
    }

    try {
      if (editingTopic) {
        await base44.entities.TopicNew.update(editingTopic.id, {
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          order: formData.order
        });
        toast.success("הנושא עודכן!");
      } else {
        const topicId = `${subject}_${units}_${formData.name.replace(/\s+/g, '_')}`.toLowerCase();
        await base44.entities.TopicNew.create({
          topic_id: topicId,
          subject_id: subject,
          unit_level: parseInt(units),
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          order: formData.order,
          is_active: true
        });
        toast.success("הנושא נוסף!");
      }
      setShowEditDialog(false);
      loadTopics();
      loadQuestionCounts(); // Reload counts after saving
    } catch (error) {
      console.error("Error saving topic:", error);
      toast.error("שגיאה בשמירה");
    }
  };

  const handleDelete = async (topic) => {
    if (!confirm(`למחוק את הנושא "${topic.name}"?`)) return;
    
    try {
      await base44.entities.TopicNew.delete(topic.id);
      toast.success("הנושא נמחק!");
      loadTopics();
      loadQuestionCounts(); // Reload counts after deleting
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("שגיאה במחיקה");
    }
  };

  const handleReorder = async (index, direction) => {
    const newTopics = [...topics];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newTopics.length) return;

    [newTopics[index], newTopics[newIndex]] = [newTopics[newIndex], newTopics[index]];

    try {
      await Promise.all(
        newTopics.map((topic, idx) =>
          base44.entities.TopicNew.update(topic.id, { order: idx })
        )
      );
      setTopics(newTopics);
      toast.success("הסדר עודכן!");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("שגיאה בעדכון סדר");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Practice"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <h1 className="text-3xl font-bold text-white mb-2">ניהול נושאי תרגול</h1>
        <p className="text-white/80">עריכת הנושאים לפי מקצוע ויחידה</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2">מקצוע</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">יחידות</label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitsOptions.map(u => (
                    <SelectItem key={u} value={u}>{u === "0" ? "ללא" : u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף נושא חדש
          </Button>
        </div>

        {/* Topics List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            נושאים: {subject} - {units} יחידות ({topics.length})
          </h2>
          
          {topics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>אין נושאים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic, idx) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-all"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(idx, 'up')}
                      disabled={idx === 0}
                      className="h-6 w-6 p-0"
                    >
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(idx, 'down')}
                      disabled={idx === topics.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      ▼
                    </Button>
                  </div>
                  
                  <div className="text-3xl">{topic.icon || "📚"}</div>
                  
                  <div className="flex-1">
                    <div className="font-bold">{topic.name}</div>
                    {topic.description && (
                      <div className="text-sm text-gray-600">{topic.description}</div>
                    )}
                    <div className="text-xs text-orange-600 font-semibold mt-1">
                      {questionCounts[topic.topic_id] || 0} שאלות משוייכות
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(createPageUrl("AdminQuestionBank") + `?topic=${topic.topic_id}`)}
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <List className="w-4 h-4 mr-1" />
                      ראה שאלות
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(topic)}
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(topic)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? "ערוך נושא" : "הוסף נושא חדש"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold mb-2">שם הנושא *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="למשל: זמנים בעבר"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">תיאור</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור קצר של הנושא..."
                className="h-20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">אייקון (אימוג'י)</label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="📚"
                maxLength={2}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
