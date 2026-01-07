import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
    Calculator, ScanLine, CheckCircle2, ArrowRight, AlertTriangle, 
    Lightbulb, HelpCircle, GraduationCap, ChevronDown, ChevronUp,
    ThumbsUp, ThumbsDown, Send, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import LatexRenderer from "@/components/exams/LatexRenderer";
import GeoGebraEmbed from "@/components/exams/GeoGebraEmbed";

export default function SolutionViewer({ result, onFeedback }) {
    const [feedbackState, setFeedbackState] = useState('none');
    const [correction, setCorrection] = useState('');
    const [activeHint, setActiveHint] = useState(null);
    const [showRubric, setShowRubric] = useState(false);

    const submitFeedback = (isCorrect) => {
        if (isCorrect) {
            setFeedbackState('helpful');
            onFeedback(true, null);
        } else {
            setFeedbackState('unhelpful');
        }
    };

    const submitCorrection = () => {
        onFeedback(false, correction);
        setFeedbackState('submitted');
    };

    if (!result) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* 1. Classification & Status */}
            {result.classification && (
                <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="bg-slate-50 gap-1">
                        <ScanLine className="w-3 h-3" />
                        {result.classification.domain} • {result.classification.topic}
                    </Badge>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 gap-1">
                        <Calculator className="w-3 h-3" />
                        אסטרטגיה: {result.classification.strategy}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {result.classification.unit_level} יח״ל
                    </Badge>
                    <Badge variant="outline" className={result.verification === "Verified" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}>
                        {result.verification === "Verified" ? "מאומת ✓" : "אימות חלקי ⚠"}
                    </Badge>
                </div>
            )}

            {/* 2. Common Mistakes Alert */}
            {result.common_mistakes && result.common_mistakes.length > 0 && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
                    <CardContent className="p-4">
                        <h4 className="flex items-center gap-2 font-bold text-amber-800 text-sm mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            שים לב! טעויות נפוצות בנושא זה:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-amber-900/80 space-y-1">
                            {result.common_mistakes.map((mistake, idx) => (
                                <li key={idx}>{mistake}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* 3. Action Plan */}
            {result.action_plan && result.action_plan.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-indigo-500" />
                        תוכנית פתרון (Action Plan)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {result.action_plan.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
                                    {idx + 1}. {step}
                                </div>
                                {idx < result.action_plan.length - 1 && (
                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Hints System */}
            {result.hints && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['hint1', 'hint2', 'skeleton', 'full'].map((type) => {
                        const labels = {
                            hint1: "רמז 1",
                            hint2: "רמז 2",
                            skeleton: "שלד פתרון",
                            full: "פתרון מלא"
                        };
                        const icons = {
                            hint1: Lightbulb,
                            hint2: HelpCircle,
                            skeleton: ScanLine,
                            full: CheckCircle2
                        };
                        const Icon = icons[type];
                        const content = result.hints[type];
                        
                        if (!content || content.length === 0) return null;

                        return (
                            <Collapsible key={type} open={activeHint === type} onOpenChange={() => setActiveHint(activeHint === type ? null : type)} className="w-full">
                                <CollapsibleTrigger asChild>
                                    <Button variant={activeHint === type ? "default" : "outline"} className="w-full justify-between group">
                                        <span className="flex items-center gap-2">
                                            <Icon className="w-4 h-4" />
                                            {labels[type]}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${activeHint === type ? 'rotate-180' : ''}`} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                    <div className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-200 shadow-inner">
                                        {content.map((line, i) => (
                                            <div key={i} className="mb-1 last:mb-0">
                                                <LatexRenderer content={line} />
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </div>
            )}

            {/* 5. Primary Result Highlight */}
            {result.primary_result && (
                <Card className="border-2 border-indigo-500 shadow-xl shadow-indigo-200/50 overflow-hidden bg-indigo-50/50">
                    <div className="bg-indigo-500 text-white px-4 py-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <h3 className="font-bold text-lg">{result.primary_result.title}</h3>
                    </div>
                    <CardContent className="p-6 flex justify-center text-center">
                        <div className="text-xl font-bold text-indigo-900">
                             {result.primary_result.content?.map((sub, i) => (
                                <div key={i} className="my-1">
                                    {sub.plaintext && <LatexRenderer content={sub.plaintext} />}
                                </div>
                             ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 6. GeoGebra */}
            {result.geogebra_commands && result.geogebra_commands.length > 0 && (
                <Card className="border-2 border-purple-500 shadow-xl overflow-hidden bg-white">
                    <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ScanLine className="w-5 h-5" />
                            <h3 className="font-bold text-lg">ויזואליזציה אינטראקטיבית (GeoGebra)</h3>
                        </div>
                    </div>
                    <CardContent className="p-0">
                         <GeoGebraEmbed commands={result.geogebra_commands} height={500} />
                         <div className="p-4 bg-purple-50 border-t border-purple-100">
                            <p className="text-sm text-purple-800 flex items-center gap-2">
                                <ScanLine className="w-4 h-4" />
                                <span>ניתן להזיז נקודות ולחקור את השרטוט האינטראקטיבי.</span>
                            </p>
                         </div>
                    </CardContent>
                </Card>
            )}

            {/* 7. Step-by-Step Solution */}
            {result.steps && result.steps.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                            דרך הפתרון
                        </h3>
                        {result.grading_rubric && (
                            <Button variant="ghost" size="sm" onClick={() => setShowRubric(!showRubric)} className="text-slate-500 hover:text-indigo-600">
                                <GraduationCap className="w-4 h-4 mr-2" />
                                {showRubric ? "הסתר מחוון" : "הצג מחוון ניקוד"}
                            </Button>
                        )}
                    </div>

                    {showRubric && result.grading_rubric && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
                            <Card className="bg-slate-50 border-slate-200">
                                <CardContent className="p-4">
                                    <h5 className="font-bold text-sm mb-2 text-slate-700">מחוון ניקוד לבגרות:</h5>
                                    <div className="space-y-2">
                                        {result.grading_rubric.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-slate-200 pb-1 last:border-0">
                                                <span>{item.for}</span>
                                                <Badge variant="secondary">{item.points} נק׳</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {result.steps.map((step, index) => (
                        <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="font-bold text-indigo-600 mb-1 flex justify-between">
                                <span>{step.title}</span>
                                <span className="text-xs text-slate-300 font-normal">#{index+1}</span>
                            </div>
                            <div className="text-slate-700 mb-2">{step.description}</div>
                            {step.latex && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-left overflow-x-auto" dir="ltr">
                                    <LatexRenderer content={step.latex} />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* 8. Feedback Section */}
            <div className="mt-8 pt-6 border-t border-slate-200">
                {feedbackState === 'none' && (
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="text-sm font-medium text-slate-600">האם הפתרון עזר לך?</span>
                        <div className="flex gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => submitFeedback(true)}
                                className="text-slate-500 hover:text-green-600 hover:bg-green-50"
                            >
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                כן
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => submitFeedback(false)}
                                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <ThumbsDown className="w-4 h-4 mr-1" />
                                לא
                            </Button>
                        </div>
                    </div>
                )}

                {feedbackState === 'helpful' && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center text-sm font-medium flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        תודה על המשוב! שמחנו לעזור.
                    </div>
                )}

                {feedbackState === 'unhelpful' && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
                    >
                        <div className="text-sm font-medium text-slate-700">עזור לנו להשתפר! מהי התשובה הנכונה?</div>
                        <Textarea 
                            value={correction}
                            onChange={(e) => setCorrection(e.target.value)}
                            placeholder="הסבר בקצרה מה הייתה הטעות או כתוב את התשובה הנכונה..."
                            className="bg-white min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setFeedbackState('none')}>ביטול</Button>
                            <Button size="sm" onClick={submitCorrection} className="bg-indigo-600 text-white">
                                <Send className="w-3 h-3 mr-2" />
                                שלח תיקון
                            </Button>
                        </div>
                    </motion.div>
                )}

                {feedbackState === 'submitted' && (
                    <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-center text-sm font-medium">
                        תודה! המשוב שלך יעזור לנו לשפר את המודל. 🚀
                    </div>
                )}
            </div>
        </motion.div>
    );
}