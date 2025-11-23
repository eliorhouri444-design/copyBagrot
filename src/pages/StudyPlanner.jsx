import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Target, Clock, TrendingUp, Plus, Edit, Trash2, CheckCircle, AlertCircle, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { differenceInDays } from "date-fns";

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [studyPlan, setStudyPlan] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: 30,
    type: "practice",
    priority: "medium",
    topic: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load study plan tasks
      const tasks = await base44.entities.StudySession.list("-created_date", 100);
      const userTasks = tasks.filter(t => t.created_by === currentUser.email);
      setStudyPlan(userTasks);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSaveTask = async () => {
    try {
      const taskData = {
        ...taskForm,
        subject: user.selected_subject,
        unit_level: user.selected_units,
        completed: false
      };

      if (editingTask) {
        await base44.entities.StudySession.update(editingTask.id, taskData);
      } else {
        await base44.entities.StudySession.create(taskData);
      }

      await loadData();
      setShowDialog(false);
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: 30,
        type: "practice",
        priority: "medium",
        topic: ""
      });
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("האם למחוק משימה זו?")) return;
    try {
      await base44.entities.StudySession.delete(taskId);
      await loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      await base44.entities.StudySession.update(task.id, { completed: !task.completed });
      await loadData();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      date: task.date || "",
      time: task.time || "",
      duration: task.duration || 30,
      type: task.type || "practice",
      priority: task.priority || "medium",
      topic: task.topic || ""
    });
    setShowDialog(true);
  };

  const getTasksByDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    return {
      today: studyPlan.filter(t => t.date === today && !t.completed),
      tomorrow: studyPlan.filter(t => t.date === tomorrow && !t.completed),
      upcoming: studyPlan.filter(t => t.date > tomorrow && !t.completed),
      completed: studyPlan.filter(t => t.completed)
    };
  };

  const tasksByDate = getTasksByDate();

  const priorityColors = {
    high: "from-red-500 to-orange-500",
    medium: "from-yellow-500 to-orange-500",
    low: "from-blue-500 to-cyan-500"
  };

  const typeIcons = {
    practice: "📝",
    exam: "📋",
    review: "🔍",
    video: "🎥",
    reading: "📖"
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-6 shadow-2xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
            <span className="text-xl font-bold text-white">תכנון לימודים</span>
          </div>

          <Button
            onClick={() => setShowDialog(true)}
            size="icon"
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        <div className="text-center text-white">
          <h2 className="text-lg font-bold mb-1">ארגן את הלמידה שלך</h2>
          <p className="text-sm opacity-90">תכנן מראש והצלח בבגרות</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Today's Tasks */}
        {tasksByDate.today.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              היום - {tasksByDate.today.length} משימות
            </h3>
            <div className="space-y-3">
              {tasksByDate.today.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => openEditDialog(task)}
                  onDelete={() => handleDeleteTask(task.id)}
                  onToggle={() => handleToggleComplete(task)}
                  priorityColors={priorityColors}
                  typeIcons={typeIcons}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Tomorrow's Tasks */}
        {tasksByDate.tomorrow.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              מחר - {tasksByDate.tomorrow.length} משימות
            </h3>
            <div className="space-y-3">
              {tasksByDate.tomorrow.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => openEditDialog(task)}
                  onDelete={() => handleDeleteTask(task.id)}
                  onToggle={() => handleToggleComplete(task)}
                  priorityColors={priorityColors}
                  typeIcons={typeIcons}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Tasks */}
        {tasksByDate.upcoming.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              עתיד - {tasksByDate.upcoming.length} משימות
            </h3>
            <div className="space-y-3">
              {tasksByDate.upcoming.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => openEditDialog(task)}
                  onDelete={() => handleDeleteTask(task.id)}
                  onToggle={() => handleToggleComplete(task)}
                  priorityColors={priorityColors}
                  typeIcons={typeIcons}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Completed Tasks */}
        {tasksByDate.completed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              הושלמו - {tasksByDate.completed.length}
            </h3>
            <div className="space-y-3">
              {tasksByDate.completed.slice(0, 5).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => openEditDialog(task)}
                  onDelete={() => handleDeleteTask(task.id)}
                  onToggle={() => handleToggleComplete(task)}
                  priorityColors={priorityColors}
                  typeIcons={typeIcons}
                />
              ))}
            </div>
          </motion.div>
        )}

        {studyPlan.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">התחל לתכנן</h3>
            <p className="text-gray-600 mb-6">צור משימות לימוד והשג את היעדים שלך</p>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף משימה ראשונה
            </Button>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingTask ? "ערוך משימה" : "הוסף משימה חדשה"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">כותרת</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                placeholder="למשל: תרגול דקדוק"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                placeholder="פרטים נוספים..."
                className="h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך</label>
                <Input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm({...taskForm, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">שעה</label>
                <Input
                  type="time"
                  value={taskForm.time}
                  onChange={(e) => setTaskForm({...taskForm, time: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">משך (דקות)</label>
                <Input
                  type="number"
                  value={taskForm.duration}
                  onChange={(e) => setTaskForm({...taskForm, duration: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">עדיפות</label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({...taskForm, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="low">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">סוג משימה</label>
              <Select value={taskForm.type} onValueChange={(value) => setTaskForm({...taskForm, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">תרגול</SelectItem>
                  <SelectItem value="exam">מבחן</SelectItem>
                  <SelectItem value="review">חזרה</SelectItem>
                  <SelectItem value="video">צפייה בסרטון</SelectItem>
                  <SelectItem value="reading">קריאה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveTask} disabled={!taskForm.title || !taskForm.date}>
              {editingTask ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onToggle, priorityColors, typeIcons }) {
  return (
    <div className={`rounded-xl p-4 border-2 ${
      task.completed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'
          }`}
        >
          {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{typeIcons[task.type] || "📝"}</span>
            <h4 className={`font-bold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {task.title}
            </h4>
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg">
              {task.date} {task.time && `• ${task.time}`}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
              {task.duration} דקות
            </span>
            <span className={`text-xs bg-gradient-to-r ${priorityColors[task.priority]} text-white px-2 py-1 rounded-lg`}>
              {task.priority === 'high' ? 'גבוהה' : task.priority === 'medium' ? 'בינונית' : 'נמוכה'}
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}