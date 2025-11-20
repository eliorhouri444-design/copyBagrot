import { Target, BookOpen, ChevronLeft, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProgressWidget({ userData, currentSubjectStats }) {
  const navigate = useNavigate();
  const weeklyGoal = userData?.weekly_goal || 5;
  const studyHours = (userData?.total_study_time || 0) / 60;
  const weeklyProgress = Math.min(100, (studyHours / weeklyGoal) * 100);
  
  const getProgressColor = (percent) => {
    if (percent < 40) return '#EF4444';
    if (percent < 70) return '#F59E0B';
    return '#10B981';
  };
  
  const progressColor = getProgressColor(weeklyProgress);
  
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📈</div>
            <div>
              <h3 className="text-lg font-bold">ההתקדמות שלך השבוע</h3>
              <p className="text-sm opacity-90">{Math.round(studyHours * 10) / 10} / {weeklyGoal} שעות</p>
            </div>
          </div>
          <button 
            onClick={() => navigate(createPageUrl("Profile"))}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">יעד שבועי</span>
            <span className="text-sm font-semibold" style={{ color: progressColor }}>
              {Math.round(studyHours * 10) / 10} / {weeklyGoal} שעות
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${weeklyProgress}%`,
                backgroundColor: progressColor
              }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">
              {currentSubjectStats?.practiceSessionsCount || 0}
            </div>
            <div className="text-xs text-gray-600">תרגולים</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <Target className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">
              {currentSubjectStats?.topicsCompleted || 0}
            </div>
            <div className="text-xs text-gray-600">נושאים</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <Award className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">
              {currentSubjectStats?.examsCompleted || 0}
            </div>
            <div className="text-xs text-gray-600">מבחנים</div>
          </div>
        </div>
      </div>
    </div>
  );
}