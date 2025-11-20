import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Database, Trash2, RefreshCw, Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function AdminCacheManagerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
        loadAnalytics();
      } catch (error) {
        console.error("Error:", error);
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('cacheOptimizer', {
        operation: 'analytics'
      });

      if (result.data?.success) {
        setAnalytics(result.data.analytics);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm("למחוק שאלות ישנות ולא בשימוש?")) return;

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('cacheOptimizer', {
        operation: 'cleanup'
      });

      if (result.data?.success) {
        alert(`✅ נמחקו ${result.data.deleted_count} שאלות\n\nנותרו ${result.data.remaining} שאלות`);
        loadAnalytics();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("שגיאה בניקוי");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!confirm("למזג שאלות כמעט זהות?")) return;

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('cacheOptimizer', {
        operation: 'optimize'
      });

      if (result.data?.success) {
        alert(`✅ מוזגו ${result.data.merged_count} שאלות כפולות`);
        loadAnalytics();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("שגיאה באופטימיזציה");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || isLoading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("QuestionBank"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Database className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            ניהול מטמון
          </h1>
          <p className="text-white/90 text-sm">
            אופטימיזציה ומעקב ביצועים
          </p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {analytics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-md text-center">
                <div className="text-3xl font-bold text-purple-600">{analytics.total_questions}</div>
                <div className="text-sm text-gray-600">שאלות במטמון</div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 shadow-md text-center border-2 border-green-200">
                <div className="text-3xl font-bold text-green-600">{analytics.cache_hit_rate}</div>
                <div className="text-sm text-gray-600">Cache Hit Rate</div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 shadow-md text-center border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{analytics.total_usage}</div>
                <div className="text-sm text-gray-600">סה"כ שימושים</div>
              </div>
              
              <div className="bg-amber-50 rounded-xl p-4 shadow-md text-center border-2 border-amber-200">
                <div className="text-3xl font-bold text-amber-600">{analytics.estimated_cost_saved}</div>
                <div className="text-sm text-gray-600">חיסכון</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📚 לפי מקצוע</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.by_subject).map(([subject, count]) => (
                    <div key={subject}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{subject}</span>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                      <Progress 
                        value={(count / analytics.total_questions) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ לפי קושי</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.by_difficulty).map(([difficulty, count]) => (
                    <div key={difficulty}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{difficulty}</span>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                      <Progress 
                        value={(count / analytics.total_questions) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔥 שאלות פופולריות</h3>
              <div className="space-y-2">
                {analytics.top_used.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {item.question}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.subject} • {item.topic}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">{item.times_used}</div>
                      <div className="text-xs text-gray-600">שימושים</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={loadAnalytics}
                disabled={isLoading}
                className="h-14 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                רענן
              </Button>

              <Button
                onClick={handleOptimize}
                disabled={isLoading}
                className="h-14 bg-purple-600 hover:bg-purple-700"
              >
                <Zap className="w-5 h-5 mr-2" />
                אופטימיזציה
              </Button>

              <Button
                onClick={handleCleanup}
                disabled={isLoading}
                variant="destructive"
                className="h-14"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                ניקוי
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}