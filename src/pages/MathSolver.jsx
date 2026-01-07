import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Camera, Image as ImageIcon, Send, Calculator, ArrowRight, X, ScanLine, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LatexRenderer from "@/components/exams/LatexRenderer";

export default function MathSolver() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setResult(null);
      
      // 1. Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedImage(file_url);

      // 2. Extract Math Problem using Vision LLM
      const extractionRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract the math or physics problem from this image exactly as it appears. 
        If it's Hebrew, keep the Hebrew text. 
        If it's a formula, write it in standard mathematical notation or LaTeX.
        Return ONLY the problem text.`,
        file_urls: [file_url]
      });

      const extractedText = typeof extractionRes === 'string' ? extractionRes : extractionRes.content;
      setQuery(extractedText);

      // 3. Solve it
      await solveProblem(extractedText);

    } catch (err) {
      console.error(err);
      setError("שגיאה בפיענוח התמונה. נסה תמונה ברורה יותר.");
      setIsAnalyzing(false);
    }
  };

  const solveProblem = async (problemText) => {
    if (!problemText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await base44.functions.invoke('solveWithWolfram', { query: problemText });
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "לא הצלחנו לפתור את הבעיה הזו.");
      }
    } catch (err) {
      console.error(err);
      setError("שגיאה בתקשורת עם השרת.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    solveProblem(query);
  };

  const clearAll = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setUploadedImage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-none">AI Solver</h1>
              <p className="text-xs text-slate-500 font-medium">פתרון בעיות במתמטיקה ופיזיקה</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Input Area */}
        <Card className="border-0 shadow-xl shadow-slate-200/60 overflow-hidden">
          <CardContent className="p-0">
            <form onSubmit={handleTextSubmit} className="relative">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="הקלד שאלה, משוואה, או מושג (למשל: אינטגרל של x^2, חוק שני של ניוטון...)"
                className="min-h-[120px] border-0 resize-none text-lg p-6 pb-16 focus-visible:ring-0 bg-transparent"
              />
              
              {/* Action Bar */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full w-10 h-10 border-slate-200 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                    title="העלה תמונה"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()} // On mobile this triggers camera option usually
                    className="rounded-full w-10 h-10 border-slate-200 hover:bg-slate-100 hover:text-indigo-600 transition-colors md:hidden"
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex gap-2">
                   {(query || result) && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={clearAll}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        נקה
                    </Button>
                   )}
                   <Button 
                    type="submit" 
                    disabled={!query.trim() || isAnalyzing}
                    className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                   >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-2" />}
                    {isAnalyzing ? 'חושב...' : 'פתור'}
                   </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Uploaded Image Preview */}
        <AnimatePresence>
            {uploadedImage && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm inline-block relative group">
                        <img src={uploadedImage} alt="Uploaded problem" className="h-32 rounded-xl object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                            <ScanLine className="text-white w-8 h-8 opacity-80" />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {error && (
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700"
             >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
             </motion.div>
          )}

          {result && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {result.translated_query && result.translated_query !== query && (
                    <div className="text-xs text-slate-400 text-center">
                        זוהה: {result.translated_query}
                    </div>
                )}

                {/* Primary Result Highlight */}
                {result.primary_result && (
                    <Card className="border-2 border-indigo-500 shadow-xl shadow-indigo-200/50 overflow-hidden bg-indigo-50/50">
                        <div className="bg-indigo-500 text-white px-4 py-2 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="font-bold text-lg">{result.primary_result.title}</h3>
                        </div>
                        <CardContent className="p-6 flex justify-center">
                            {result.primary_result.content?.map((sub, i) => (
                                <div key={i} className="overflow-x-auto">
                                    <img src={sub.image} alt="Result" className="max-w-full h-auto mix-blend-multiply scale-110" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Step-by-Step Solution */}
                {result.steps && result.steps.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                            דרך הפתרון
                        </h3>
                        {result.steps.map((step, index) => (
                            <motion.div 
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm p-4"
                            >
                                <div className="font-bold text-indigo-600 mb-1">{step.title}</div>
                                <div className="text-slate-700 mb-2">{step.description}</div>
                                {step.latex && (
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-left" dir="ltr">
                                        <LatexRenderer content={step.latex} />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Other Pods */}
                {result.pods?.filter(p => p.id !== 'Result' && p.id !== 'Solution').map((pod, index) => (
                    <Card key={index} className="border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
                        <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                            <h3 className="font-bold text-slate-700 text-sm">{pod.title}</h3>
                        </div>
                        <CardContent className="p-4">
                            {pod.content?.map((sub, i) => (
                                <div key={i} className="overflow-x-auto">
                                    <img src={sub.image} alt={pod.title} className="max-w-full h-auto mix-blend-multiply" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!result && !isAnalyzing && !query && (
            <div className="text-center py-12 opacity-50">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">מוכן לפתור</h3>
                <p className="text-slate-500">צלם תמונה או הקלד שאלה כדי להתחיל</p>
                
                <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-md mx-auto">
                    {['נגזרת של x^2', 'אינטגרל של sin(x)', 'כוח כבידה', 'פתור x^2+5x+6=0'].map(ex => (
                        <button 
                            key={ex}
                            onClick={() => { setQuery(ex); handleTextSubmit({preventDefault:()=>{}}); solveProblem(ex); }}
                            className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:border-indigo-300 transition-all"
                        >
                            {ex}
                        </button>
                    ))}
                </div>
            </div>
        )}

      </main>
    </div>
  );
}