import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle, BookOpen, FileEdit, RotateCcw, Clock } from "lucide-react";

export default function DailyTasksCard({ tasks, onTaskComplete }) {
  const [completedTasks, setCompletedTasks] = useState(new Set());

  const handleToggle = (taskId) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
    onTaskComplete?.(taskId, newCompleted.has(taskId));
  };

  const taskIcons = {
    learn: BookOpen,
    practice: FileEdit,
    review: RotateCcw,
    exam: Clock
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">המשימות שלך היום 📋</h3>
      
      <div className="space-y-3">
        {tasks.map((task, idx) => {
          const Icon = taskIcons[task.type] || BookOpen;
          const isCompleted = completedTasks.has(task.id);
          
          return (
            <motion.button
              key={task.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggle(task.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isCompleted 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-blue-50 border-blue-200 hover:border-blue-400'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-6 h-6 text-blue-400 flex-shrink-0" />
              )}
              
              <Icon className={`w-5 h-5 flex-shrink-0 ${isCompleted ? 'text-green-600' : 'text-blue-600'}`} />
              
              <div className="flex-1 text-right">
                <div className={`font-semibold ${isCompleted ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                  {task.title}
                </div>
                <div className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
                  {task.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          הושלמו {completedTasks.size} מתוך {tasks.length} משימות
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedTasks.size / tasks.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}