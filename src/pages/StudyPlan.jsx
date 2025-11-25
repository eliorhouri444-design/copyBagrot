import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Loader2, Target, CheckCircle, BookOpen, Repeat, AlertTriangle, Clock, Play, Zap, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Placeholder data - will be replaced with real data fetching
const placeholderData = {
  subject: "אנגלית",
  readiness: {
    overall: 78,
    practice: 82,
    exams: 77,
    plan: 70,
  },
  progress: {
    questions: { completed: 450, total: 700 },
    exams: { completed: 2, total: 6 },
    newTopics: { completed: 4, total: 6 },
    weakTopics: 3,
    activeMistakes: 23,
    mistakeTarget: 20,
  },
  dailyTasks: {
    questions: 70,
    learnTopics: 2,
    reviewMistakes: 8,
    simulation: true,
    studyTime: 90,
  },
  timeline: {
    daysToExam: 3,
    daysToReady: 9,
    onTrack: false,
  },
  alert: {
    type: 'warning', // 'info', 'warning', 'danger'
    message: 'יש לך 3 נושאים חלשים — מומלץ לחזור עליהם היום',
  },
};

const ReadinessGauge = ({ readiness }) => (
  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-full h-full" viewBox="0 0 36 36">
        <path
          className="text-gray-200"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
        <path
          className="text-blue-500"
          strokeDasharray={`${readiness.overall}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-800">{readiness.overall}%</span>
        <span className="text-sm text-gray-500">מוכנות לבגרות</span>
      </div>
    </div>
    <p className="text-sm text-gray-600 mt-4">מבוסס על תרגול, שאלונים ותוכנית אישית</p>
    <div className="flex justify-around mt-4 text-xs text-gray-500">
      <div><span className="font-bold text-gray-700">{readiness.practice}%</span> תרגול</div>
      <div><span className="font-bold text-gray-700">{readiness.exams}%</span> שאלונים</div>
      <div><span className="font-bold text-gray-700">{readiness.plan}%</span> תוכנית</div>
    </div>
  </motion.div>
);

const ProgressSummary = ({ progress }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4">איפה אתה עומד כרגע</h2>
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-sm text-blue-800 font-semibold">שאלות</div>
        <div className="text-lg font-bold text-blue-900">{progress.questions.completed} / {progress.questions.total}</div>
        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(progress.questions.completed / progress.questions.total) * 100}%` }}></div>
        </div>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="text-sm text-purple-800 font-semibold">בגרויות</div>
        <div className="text-lg font-bold text-purple-900">{progress.exams.completed} / {progress.exams.total}</div>
        <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1">
          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(progress.exams.completed / progress.exams.total) * 100}%` }}></div>
        </div>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="text-sm text-green-800 font-semibold">נושאים חדשים</div>
        <div className="text-lg font-bold text-green-900">{progress.newTopics.completed} / {progress.newTopics.total}</div>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="text-sm text-yellow-800 font-semibold">נושאים חלשים</div>
        <div className="text-lg font-bold text-yellow-900">{progress.weakTopics} <span className="text-sm">לחיזוק</span></div>
      </div>
      <div className="bg-red-50 p-4 rounded-lg col-span-2">
        <div className="text-sm text-red-800 font-semibold">טעויות פעילות</div>
        <div className="text-lg font-bold text-red-900">{progress.activeMistakes}</div>
        <p className="text-xs text-red-600">מטרה: פחות מ-{progress.mistakeTarget}% טעויות</p>
      </div>
    </div>
  </motion.div>
);

const DailyTasks = ({ tasks }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white rounded-2xl shadow-lg p-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4">המשימות להיום</h2>
    <ul className="space-y-3">
        <li className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><span className="font-semibold">לפתור {tasks.questions} שאלות</span><CheckCircle className="text-green-500"/></li>
        <li className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><span className="font-semibold">ללמוד {tasks.learnTopics} נושאים חדשים</span><BookOpen className="text-blue-500"/></li>
        <li className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><span className="font-semibold">לחזור על {tasks.reviewMistakes} טעויות</span><Repeat className="text-orange-500"/></li>
        {tasks.simulation && <li className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><span className="font-semibold">לבצע סימולציה</span><Clock className="text-red-500"/></li>}
    </ul>
    <div className="mt-4 text-center text-sm text-gray-600">
        זמן לימוד יומי מומלץ: <span className="font-bold">{tasks.studyTime} דקות</span>
    </div>
  </motion.div>
);

const Timeline = ({ timeline, alert }) => {
    const alertStyles = {
        info: 'bg-blue-100 border-blue-500 text-blue-800',
        warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
        danger: 'bg-red-100 border-red-500 text-red-800',
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center mb-4">
                <div className="flex justify-around">
                    <div>
                        <div className="text-3xl font-bold text-gray-800">{timeline.daysToExam}</div>
                        <div className="text-sm text-gray-500">ימים לבגרות</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-800">{timeline.daysToReady}</div>
                        <div className="text-sm text-gray-500">ימים למוכנות מלאה</div>
                    </div>
                </div>
                {!timeline.onTrack && <p className="text-red-500 font-bold mt-4 flex items-center justify-center"><AlertTriangle className="w-5 h-5 ml-2" /> אתה צריך להגביר את הקצב</p>}
            </div>
            {alert && (
                <div className={`p-4 rounded-lg border-l-4 ${alertStyles[alert.type]}`}>
                    <p className="font-semibold">{alert.message}</p>
                </div>
            )}
        </motion.div>
    )
};

const ActionButtons = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="grid grid-cols-2 gap-3">
        <Button className="bg-red-500 hover:bg-red-600 h-16 text-base"><Repeat className="w-5 h-5 ml-2"/>תרגל טעויות</Button>
        <Button className="bg-blue-500 hover:bg-blue-600 h-16 text-base"><Play className="w-5 h-5 ml-2"/>המשך מאיפה שהפסקת</Button>
        <Button className="bg-yellow-500 hover:bg-yellow-600 h-16 text-base col-span-2"><Zap className="w-5 h-5 ml-2"/>תרגל נושאים חלשים</Button>
        <Button className="bg-green-500 hover:bg-green-600 h-16 text-base"><Clock className="w-5 h-5 ml-2"/>בגרות מלאה</Button>
        <Button className="bg-purple-500 hover:bg-purple-600 h-16 text-base"><Target className="w-5 h-5 ml-2"/>התחל משימה יומית</Button>
    </motion.div>
);

export default function StudyPlanPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real scenario, you'd fetch data here.
    // For now, we use placeholder data after a short delay.
    setTimeout(() => {
      setData(placeholderData);
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="pb-24">
        <div className="bg-white sticky top-0 z-10 shadow-sm p-4 text-center">
            <h1 className="text-xl font-bold text-gray-800">התוכנית האישית לבגרות — {data.subject}</h1>
        </div>
        <div className="p-4 space-y-6">
            <ReadinessGauge readiness={data.readiness} />
            <ProgressSummary progress={data.progress} />
            <DailyTasks tasks={data.dailyTasks} />
            <Timeline timeline={data.timeline} alert={data.alert} />
            <ActionButtons />
        </div>
    </div>
  );
}