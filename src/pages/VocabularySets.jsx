import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Loader2, Check, Lock, Plus, Save, Crown, CheckSquare, Square,
  ArrowUp, ArrowDown, Trash2, Edit, GripVertical, AlertTriangle, Upload, FileSpreadsheet,
  PlayCircle, RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function VocabularySetsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [sets, setSets] = useState([]);
  const [progress, setProgress] = useState({});
  
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser?.selected_subject || 'אנגלית';
      const units = currentUser?.selected_units || 3;

      // Load vocabulary words
      const allWords = await base44.entities.VocabularyQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'order', 2000);
      setWords(allWords);

      // Chunk into sets of 10
      const chunkedSets = [];
      for (let i = 0; i < allWords.length; i += 10) {
        chunkedSets.push({
          id: Math.floor(i / 10) + 1,
          words: allWords.slice(i, i + 10),
          startIndex: i,
          endIndex: Math.min(i + 10, allWords.length)
        });
      }
      setSets(chunkedSets);

      // Load user progress
      const userProgress = await base44.entities.VocabularyProgress.filter({
        user_email: currentUser.email,
        subject_id: subject
      }, null, 1000);

      const progressMap = {};
      userProgress.forEach(p => {
        progressMap[p.word_id] = p;
      });
      setProgress(progressMap);

      // Check resume
      if (currentUser?.last_vocabulary_position) {
        setResumeData(currentUser.last_vocabulary_position);
      }

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSetProgress = (set) => {
    if (!set.words.length) return 0;
    const knownWords = set.words.filter(w => progress[w.id]?.is_known).length;
    return Math.round((knownWords / set.words.length) * 100);
  };

  const startFromSet = (setNum) => {
    const set = sets.find(s => s.id === setNum);
    if (!set) {
      navigate(createPageUrl(`VocabularyFlashcards?setId=1&start=0&end=10`));
      return;
    }
    navigate(createPageUrl(`VocabularyFlashcards?setId=${set.id}&start=${set.startIndex}&end=${set.endIndex}`));
  };

  const handleGlobalStart = () => {
    if (resumeData) {
      setShowResumeDialog(true);
    } else {
      startFromSet(1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("VocabularyTraining"))}
            className="text-white p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-white">בחירת סט למידה</h1>
            <p className="text-sm text-white/80">{sets.length} סטים זמינים</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Global Start */}
        <Button 
          onClick={handleGlobalStart}
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-lg flex items-center justify-center gap-3 text-lg font-bold"
        >
          <PlayCircle className="w-6 h-6" />
          {resumeData ? 'המשך מאיפה שעצרת' : 'התחל ללמוד לפי הסדר'}
        </Button>

        {/* Sets List */}
        <div className="space-y-3">
          {sets.map((set, index) => {
            const prog = getSetProgress(set);
            const isLocked = !user?.is_premium && index >= 3;
            const isCompleted = prog === 100;

            return (
              <motion.button
                key={set.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (isLocked) {
                    navigate(createPageUrl("Premium"));
                  } else {
                    navigate(createPageUrl(`VocabularyFlashcards?setId=${set.id}&start=${set.startIndex}&end=${set.endIndex}`));
                  }
                }}
                className={`w-full bg-white rounded-2xl p-4 flex items-center gap-4 border-2 transition-all ${
                  isLocked 
                    ? 'border-gray-200 opacity-70' 
                    : isCompleted 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-400'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isLocked ? 'bg-gray-100' : isCompleted ? 'bg-green-500' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isLocked ? <Lock className="w-5 h-5 text-gray-400" /> : 
                   isCompleted ? <Check className="w-6 h-6 text-white" /> :
                   <span className="text-lg font-bold">{set.id}</span>}
                </div>

                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900 mb-1">סט מילים {set.id}</div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden w-full">
                    <div 
                      className={`h-full rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${prog}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{prog}% הושלם</div>
                </div>

                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-blue-600" />
              המשך למידה
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-gray-700">
            <p className="mb-2">עצרת בסט {resumeData?.set_id}, מילה {resumeData ? resumeData.question_index + 1 : 1}.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => {
              const set = sets.find(s => s.id === resumeData.set_id);
              if(set) {
                navigate(createPageUrl(`VocabularyFlashcards?setId=${set.id}&start=${set.startIndex}&end=${set.endIndex}&resumeIndex=${resumeData.question_index}`));
              }
            }} className="bg-blue-600 hover:bg-blue-700 w-full h-12">
              המשך מאותה נקודה
            </Button>
            <Button onClick={() => startFromSet(1)} variant="outline" className="w-full">
              התחל הכל מההתחלה
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}