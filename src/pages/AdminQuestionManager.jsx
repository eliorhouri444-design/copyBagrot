import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Plus, Save, FileText, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AdminQuestionManagerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    question_id: `q_${Date.now()}`,
    subject_id: 'math',
    unit_level: 4,
    origin_type: 'bagrut',
    origin_details: '',
    topic_id: '',
    question_text: '',
    question_image_url: '',
    question_type: 'calculation',
    max_score: 10,
    difficulty_level: 'medium',
    parts: [],
    is_active: true
  });

  const [solutionData, setSolutionData] = useState({
    solution_text: '',
    solution_steps: [],
    final_answers: [],
    rubric: []
  });

  const [currentPart, setCurrentPart] = useState({ part_id: 'a', text: '', max_score: 0 });
  const [currentStep, setCurrentStep] = useState({ step: 1, description: '', key_formula: '', key_result: '' });
  const [currentAnswer, setCurrentAnswer] = useState({ part_id: 'a', value: '', unit: '', variants: [] });
  const [currentRubricRule, setCurrentRubricRule] = useState({ part_id: 'a', condition: '', score: 0, percentage: 100 });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('מעלה תמונה...', { id: 'upload' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, question_image_url: file_url });
      toast.success('תמונה הועלתה!', { id: 'upload' });
    } catch (error) {
      toast.error('שגיאה בהעלאה', { id: 'upload' });
    }
  };

  const addPart = () => {
    if (!currentPart.text) return;
    setFormData({
      ...formData,
      parts: [...formData.parts, { ...currentPart }]
    });
    setCurrentPart({ part_id: String.fromCharCode(currentPart.part_id.charCodeAt(0) + 1), text: '', max_score: 0 });
  };

  const addStep = () => {
    if (!currentStep.description) return;
    setSolutionData({
      ...solutionData,
      solution_steps: [...solutionData.solution_steps, { ...currentStep, step: solutionData.solution_steps.length + 1 }]
    });
    setCurrentStep({ step: solutionData.solution_steps.length + 2, description: '', key_formula: '', key_result: '' });
  };

  const addAnswer = () => {
    if (!currentAnswer.value) return;
    setSolutionData({
      ...solutionData,
      final_answers: [...solutionData.final_answers, { ...currentAnswer }]
    });
    setCurrentAnswer({ part_id: '', value: '', unit: '', variants: [] });
  };

  const addRubricRule = () => {
    if (!currentRubricRule.condition) return;
    
    const existingPartIndex = solutionData.rubric.findIndex(r => r.part_id === currentRubricRule.part_id);
    
    if (existingPartIndex >= 0) {
      const updatedRubric = [...solutionData.rubric];
      updatedRubric[existingPartIndex].rules = [
        ...updatedRubric[existingPartIndex].rules,
        { condition: currentRubricRule.condition, score: currentRubricRule.score, percentage: currentRubricRule.percentage }
      ];
      setSolutionData({ ...solutionData, rubric: updatedRubric });
    } else {
      const partMaxScore = formData.parts.find(p => p.part_id === currentRubricRule.part_id)?.max_score || formData.max_score;
      setSolutionData({
        ...solutionData,
        rubric: [...solutionData.rubric, {
          part_id: currentRubricRule.part_id,
          max_score: partMaxScore,
          rules: [{ condition: currentRubricRule.condition, score: currentRubricRule.score, percentage: currentRubricRule.percentage }]
        }]
      });
    }
    
    setCurrentRubricRule({ part_id: 'a', condition: '', score: 0, percentage: 100 });
  };

  const handleSave = async () => {
    try {
      toast.loading('שומר שאלה...', { id: 'save' });

      // שמירת השאלה
      await base44.entities.QuestionBank.create({
        ...formData,
        question_id: formData.question_id
      });

      // שמירת הפתרון
      await base44.entities.SolutionBank.create({
        question_id: formData.question_id,
        ...solutionData
      });

      toast.success('✅ השאלה נשמרה!', { id: 'save' });

      // איפוס טופס
      setFormData({
        question_id: `q_${Date.now()}`,
        subject_id: 'math',
        unit_level: 4,
        origin_type: 'bagrut',
        origin_details: '',
        topic_id: '',
        question_text: '',
        question_image_url: '',
        question_type: 'calculation',
        max_score: 10,
        difficulty_level: 'medium',
        parts: [],
        is_active: true
      });
      setSolutionData({
        solution_text: '',
        solution_steps: [],
        final_answers: [],
        rubric: []
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה בשמירה', { id: 'save' });
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-3xl p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">🎓 מנהל שאלות ופתרונות</h1>
          <p className="text-sm opacity-90">הוספת שאלות חדשות למאגר</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6">
        {/* Question Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">פרטי השאלה</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">מקצוע</label>
              <Select value={formData.subject_id} onValueChange={(v) => setFormData({...formData, subject_id: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="math">מתמטיקה</SelectItem>
                  <SelectItem value="english">אנגלית</SelectItem>
                  <SelectItem value="physics">פיזיקה</SelectItem>
                  <SelectItem value="chemistry">כימיה</SelectItem>
                  <SelectItem value="biology">ביולוגיה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">יחידות</label>
              <Input
                type="number"
                value={formData.unit_level}
                onChange={(e) => setFormData({...formData, unit_level: parseInt(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">סוג מקור</label>
              <Select value={formData.origin_type} onValueChange={(v) => setFormData({...formData, origin_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="bagrut">בגרות</SelectItem>
                  <SelectItem value="practice">תרגול</SelectItem>
                  <SelectItem value="teacher_custom">מורה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">פרטי מקור</label>
              <Input
                placeholder="קיץ 2022, מועד א', שאלון 806"
                value={formData.origin_details}
                onChange={(e) => setFormData({...formData, origin_details: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">נושא</label>
              <Input
                placeholder="math_trig_identities"
                value={formData.topic_id}
                onChange={(e) => setFormData({...formData, topic_id: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">סוג שאלה</label>
              <Select value={formData.question_type} onValueChange={(v) => setFormData({...formData, question_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="calculation">חישוב</SelectItem>
                  <SelectItem value="proof">הוכחה</SelectItem>
                  <SelectItem value="open">פתוחה</SelectItem>
                  <SelectItem value="multi_choice">רב-ברירה</SelectItem>
                  <SelectItem value="writing">✍️ כתיבה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">ניקוד מקסימלי</label>
              <Input
                type="number"
                value={formData.max_score}
                onChange={(e) => setFormData({...formData, max_score: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">רמת קושי</label>
              <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({...formData, difficulty_level: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="easy">קל</SelectItem>
                  <SelectItem value="medium">בינוני</SelectItem>
                  <SelectItem value="hard">קשה</SelectItem>
                  <SelectItem value="expert">מומחה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">טקסט השאלה</label>
            <Textarea
              value={formData.question_text}
              onChange={(e) => setFormData({...formData, question_text: e.target.value})}
              className="min-h-32"
              placeholder="כתוב את השאלה..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">תמונה</label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.question_image_url && (
              <img src={formData.question_image_url} alt="question" className="mt-2 rounded max-w-xs" />
            )}
          </div>

          {/* Parts */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-3">סעיפים (א, ב, ג)</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Input
                placeholder="סעיף (a)"
                value={currentPart.part_id}
                onChange={(e) => setCurrentPart({...currentPart, part_id: e.target.value})}
              />
              <Input
                placeholder="טקסט"
                value={currentPart.text}
                onChange={(e) => setCurrentPart({...currentPart, text: e.target.value})}
              />
              <Input
                type="number"
                placeholder="נקודות"
                value={currentPart.max_score}
                onChange={(e) => setCurrentPart({...currentPart, max_score: parseFloat(e.target.value)})}
              />
            </div>
            <Button size="sm" onClick={addPart} className="mb-2">
              <Plus className="w-4 h-4 mr-1" /> הוסף סעיף
            </Button>

            {formData.parts.map((part, idx) => (
              <div key={idx} className="bg-blue-50 rounded p-2 mb-1 text-sm">
                <strong>סעיף {part.part_id}:</strong> {part.text} ({part.max_score} נק')
              </div>
            ))}
          </div>
        </motion.div>

        {/* Solution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold">הפתרון</h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">פתרון מלא (טקסט)</label>
            <Textarea
              value={solutionData.solution_text}
              onChange={(e) => setSolutionData({...solutionData, solution_text: e.target.value})}
              className="min-h-32"
              placeholder="כתוב את הפתרון המלא..."
            />
          </div>

          {/* Steps */}
          <div className="border-t pt-4 mb-4">
            <h3 className="font-bold mb-3">שלבי פתרון</h3>
            <div className="space-y-2 mb-2">
              <Input
                placeholder="תיאור השלב"
                value={currentStep.description}
                onChange={(e) => setCurrentStep({...currentStep, description: e.target.value})}
              />
              <Input
                placeholder="נוסחה מרכזית"
                value={currentStep.key_formula}
                onChange={(e) => setCurrentStep({...currentStep, key_formula: e.target.value})}
              />
              <Input
                placeholder="תוצאה"
                value={currentStep.key_result}
                onChange={(e) => setCurrentStep({...currentStep, key_result: e.target.value})}
              />
            </div>
            <Button size="sm" onClick={addStep} className="mb-2">
              <Plus className="w-4 h-4 mr-1" /> הוסף שלב
            </Button>

            {solutionData.solution_steps.map((step, idx) => (
              <div key={idx} className="bg-green-50 rounded p-2 mb-1 text-sm">
                <strong>שלב {step.step}:</strong> {step.description}
              </div>
            ))}
          </div>

          {/* Final Answers */}
          <div className="border-t pt-4 mb-4">
            <h3 className="font-bold mb-3">תשובות סופיות</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <Input
                placeholder="סעיף"
                value={currentAnswer.part_id}
                onChange={(e) => setCurrentAnswer({...currentAnswer, part_id: e.target.value})}
              />
              <Input
                placeholder="ערך"
                value={currentAnswer.value}
                onChange={(e) => setCurrentAnswer({...currentAnswer, value: e.target.value})}
              />
              <Input
                placeholder="יחידה"
                value={currentAnswer.unit}
                onChange={(e) => setCurrentAnswer({...currentAnswer, unit: e.target.value})}
              />
              <Input
                placeholder="וריאנטים (,)"
                value={currentAnswer.variants.join(',')}
                onChange={(e) => setCurrentAnswer({...currentAnswer, variants: e.target.value.split(',')})}
              />
            </div>
            <Button size="sm" onClick={addAnswer} className="mb-2">
              <Plus className="w-4 h-4 mr-1" /> הוסף תשובה
            </Button>

            {solutionData.final_answers.map((ans, idx) => (
              <div key={idx} className="bg-purple-50 rounded p-2 mb-1 text-sm">
                <strong>סעיף {ans.part_id}:</strong> {ans.value} {ans.unit}
              </div>
            ))}
          </div>

          {/* Rubric */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-3">📊 Rubric - טבלת ניקוד</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <Input
                placeholder="סעיף"
                value={currentRubricRule.part_id}
                onChange={(e) => setCurrentRubricRule({...currentRubricRule, part_id: e.target.value})}
              />
              <Input
                placeholder="תנאי"
                value={currentRubricRule.condition}
                onChange={(e) => setCurrentRubricRule({...currentRubricRule, condition: e.target.value})}
              />
              <Input
                type="number"
                placeholder="ניקוד"
                value={currentRubricRule.score}
                onChange={(e) => setCurrentRubricRule({...currentRubricRule, score: parseFloat(e.target.value)})}
              />
              <Input
                type="number"
                placeholder="אחוז"
                value={currentRubricRule.percentage}
                onChange={(e) => setCurrentRubricRule({...currentRubricRule, percentage: parseFloat(e.target.value)})}
              />
            </div>
            <Button size="sm" onClick={addRubricRule} className="mb-2">
              <Plus className="w-4 h-4 mr-1" /> הוסף כלל ניקוד
            </Button>

            {solutionData.rubric.map((rubric, idx) => (
              <div key={idx} className="bg-yellow-50 rounded p-3 mb-2 text-sm">
                <strong>סעיף {rubric.part_id} ({rubric.max_score} נק'):</strong>
                <ul className="mr-4 mt-1">
                  {rubric.rules.map((rule, i) => (
                    <li key={i}>• {rule.condition} → {rule.score} נק' ({rule.percentage}%)</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg"
        >
          <Save className="w-6 h-6 mr-2" />
          שמור שאלה + פתרון
        </Button>
      </div>
    </div>
  );
}