
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Calculator, Info, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function GradeCalculatorPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [examGrade, setExamGrade] = useState("");
  const [shieldGrade, setShieldGrade] = useState("");
  const [finalGrade, setFinalGrade] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // קריאת המקצוע מ-localStorage מיד בטעינה
  const [cachedSubject, setCachedSubject] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_subject') || null;
    }
    return null;
  });

  const subjectColors = {
    "אנגלית": "bg-blue-600",
    "מתמטיקה": "bg-purple-600",
    "פיזיקה": "bg-green-600",
    "ספרות": "bg-pink-600",
    "היסטוריה": "bg-amber-600",
    "גאוגרפיה": "bg-cyan-600"
  };

  const headerColor = (user?.selected_subject || cachedSubject)
    ? subjectColors[user?.selected_subject || cachedSubject] || "bg-blue-600"
    : "bg-blue-600";

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // שמירת המקצוע ב-localStorage
        if (currentUser?.selected_subject) {
          localStorage.setItem('selected_subject', currentUser.selected_subject);
          setCachedSubject(currentUser.selected_subject);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const calculateFinalGrade = () => {
    if (!examGrade || !shieldGrade) return;
    
    const exam = parseFloat(examGrade);
    const shield = parseFloat(shieldGrade);
    
    if (exam < 0 || exam > 100 || shield < 0 || shield > 100) {
      return;
    }
    
    const final = (exam * 0.7) + (shield * 0.3);
    setFinalGrade(final.toFixed(1));
    setShowResult(true);
  };

  const pieData = examGrade && shieldGrade ? [
    { name: 'מבחן בגרות (70%)', value: parseFloat(examGrade) * 0.7, color: '#8B5CF6' }, // Purple-600
    { name: 'ציון מגן (30%)', value: parseFloat(shieldGrade) * 0.3, color: '#3B82F6' } // Blue-600
  ] : [];

  const getGradeColor = (grade) => {
    if (grade >= 85) return "text-green-600";
    if (grade >= 70) return "text-blue-600";
    if (grade >= 56) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeStatus = (grade) => {
    if (grade >= 85) return "מצוין! 🎉";
    if (grade >= 70) return "טוב מאוד! 👍";
    if (grade >= 56) return "עבר ✓";
    return "לא עבר";
  };

  const reset = () => {
    setExamGrade("");
    setShieldGrade("");
    setFinalGrade(null);
    setShowResult(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header with decorative elements */}
      <div className={`${headerColor} rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">מחשבון ציון בגרות</h1>
              <p className="text-white/80">חשב את הציון הסופי שלך</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-6 space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">איך מחושב הציון?</h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                הציון הסופי בבגרות מורכב מ־<span className="font-bold">70% מבחן בגרות</span> ו־<span className="font-bold">30% מציון המגן</span> שניתן על סמך לימודיך במהלך השנה (ממוצע שנתי, מתכונת והערכה כללית).
              </p>
            </div>
          </div>
        </div>

        {/* Calculator Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Exam Grade Input */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                ציון מבחן בגרות (70%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="הזן ציון בגרות (0-100)"
                  value={examGrade}
                  onChange={(e) => setExamGrade(e.target.value)}
                  className="h-14 text-lg pr-12"
                  min="0"
                  max="100"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                  / 100
                </div>
              </div>
            </div>

            {/* Shield Grade Input */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                ציון מגן (30%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="הזן ציון מגן (0-100)"
                  value={shieldGrade}
                  onChange={(e) => setShieldGrade(e.target.value)}
                  className="h-14 text-lg pr-12"
                  min="0"
                  max="100"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                  / 100
                </div>
              </div>
            </div>

            {/* Breakdown Display */}
            {examGrade && shieldGrade && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-xl p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ציון בגרות × 70%</span>
                  <span className="font-bold text-gray-900">
                    {(parseFloat(examGrade) * 0.7).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ציון מגן × 30%</span>
                  <span className="font-bold text-gray-900">
                    {(parseFloat(shieldGrade) * 0.3).toFixed(1)}
                  </span>
                </div>
                <div className="border-t-2 border-gray-200 pt-2"></div>
              </motion.div>
            )}

            {/* Calculate Button */}
            <Button
              onClick={calculateFinalGrade}
              disabled={!examGrade || !shieldGrade}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl disabled:opacity-50"
            >
              <Calculator className="w-5 h-5 ml-2" />
              חשב ציון סופי
            </Button>
          </div>
        </div>

        {/* Result Card */}
        {showResult && finalGrade && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            {/* תרשים עוגה */}
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((dataEntry, dataIndex) => (
                      <Cell key={`cell-${dataIndex}`} fill={dataEntry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value.toFixed(1)}`, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-600">בגרות 70%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-sm text-gray-600">מגן 30%</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">הציון הסופי שלך</h2>
            </div>

            <div className={`text-7xl font-bold mb-4 ${getGradeColor(parseFloat(finalGrade))}`}>
              {finalGrade}
            </div>

            <div className="text-2xl font-semibold text-gray-700 mb-6">
              {getGradeStatus(parseFloat(finalGrade))}
            </div>

            {/* Visual Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>0</span>
                <span>56</span>
                <span>70</span>
                <span>85</span>
                <span>100</span>
              </div>
              <Progress 
                value={parseFloat(finalGrade)} 
                className="h-4"
              />
            </div>

            {/* Explanation */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-800 text-sm leading-relaxed">
                הציון הסופי בבגרות מורכב מ־<span className="font-bold">70% מבחן בגרות</span> ו־<span className="font-bold">30% מציון המגן</span> שניתן על סמך לימודיך במהלך השנה.
              </p>
            </div>

            {/* Grade Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {examGrade}
                </div>
                <div className="text-sm text-gray-600">ציון בגרות</div>
                <div className="text-xs text-gray-500">70% משקל</div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {shieldGrade}
                </div>
                <div className="text-sm text-gray-600">ציון מגן</div>
                <div className="text-xs text-gray-500">30% משקל</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={reset}
                className="flex-1 h-12"
              >
                חשב שוב
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
              >
                חזרה לדף הבית
              </Button>
            </div>
          </motion.div>
        )}

        {/* Grade Scale Reference */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            סולם ציונים
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">85-100 • מצוין</div>
                <div className="text-xs text-gray-600">ציון גבוה המעיד על הישגים יוצאי דופן</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">70-84 • טוב מאוד</div>
                <div className="text-xs text-gray-600">רמה גבוהה של הבנה ושליטה בחומר</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">56-69 • עבר</div>
                <div className="text-xs text-gray-600">עמידה בדרישות המינימום</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">0-55 • לא עבר</div>
                <div className="text-xs text-gray-600">נדרש תרגול נוסף ושיפור</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900 mb-3">💡 טיפ חשוב</h3>
          <p className="text-amber-800 text-sm leading-relaxed">
            ציון המגן שלך תלוי בביצועיך לאורך השנה - מבחנים, שיעורי בית, השתתפות בכיתה ועוד. 
            שמור על עבודה קבועה כדי להבטיח ציון מגן גבוה שיעזור לך להגיע לציון הסופי הטוב ביותר!
          </p>
        </div>
      </div>
    </div>
  );
}
