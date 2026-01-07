import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Camera, Image as ImageIcon, Send, Calculator, ArrowRight, X, ScanLine, CheckCircle2, AlertCircle, FileText, Code, ThumbsUp, ThumbsDown, MessageSquarePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SolutionViewer from "@/components/exams/SolutionViewer";

export default function MathSolver() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setResult(null);
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (file.type.startsWith('image/')) {
        setUploadedImage(file_url);
      } else {
        setUploadedImage(null);
      }

      await solveProblem(null, file_url);

    } catch (err) {
      console.error(err);
      setError("שגיאה בפיענוח הקובץ. נסה קובץ ברור יותר.");
      setIsAnalyzing(false);
    }
  };

  const solveProblem = async (problemText, fileUrl = null) => {
    if (!problemText && !fileUrl) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const payload = problemText ? { query: problemText } : { file_url: fileUrl };
      const { data } = await base44.functions.invoke('unifiedSolver', payload);

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "לא הצלחנו לפתור את הבעיה הזו.");
      }
    } catch (err) {
      console.error("Solver Error:", err);
      // Improved error handling
      const errorMsg = err.response?.data?.error || err.message || "שגיאה בתקשורת עם השרת.";
      setError(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    solveProblem(query);
  };

  const handleFeedback = async (isCorrect, correctionText) => {
    try {
      await base44.entities.SolverFeedback.create({
        query: query,
        image_url: uploadedImage,
        generated_result: result,
        is_correct: isCorrect,
        user_correction: correctionText
      });
    } catch (err) {
      console.error("Error submitting feedback:", err);
    }
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
                placeholder="הקלד שאלה, משוואה, קוד, או בעיה הנדסית (למשל: אינטגרל של x^2, חישוב עומסים, דיבאג לקוד...)"
                className="min-h-[120px] border-0 resize-none text-lg p-6 pb-16 focus-visible:ring-0 bg-transparent"
              />
              
              {/* Action Bar */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf,text/*,.py,.js,.c,.cpp,.java" 
                    onChange={handleFileUpload} 
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full w-10 h-10 border-slate-200 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                    title="העלה קובץ (תמונה, PDF, קוד)"
                  >
                    <FileText className="w-5 h-5" />
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
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
              <SolutionViewer result={result} onFeedback={handleFeedback} />
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