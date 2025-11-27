import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Layers, Target, Loader2
} from 'lucide-react';
import { motion } from "framer-motion";

export default function VocabularySetModePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const isMultiSet = urlParams.get('multiSet') === 'true';
  const setsParam = urlParams.get('sets');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [selectedSetsData, setSelectedSetsData] = useState([]);

  const displaySubject = user?.selected_subject || 'אנגלית';
  const displayUnits = user?.selected_units || 3;

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
      }, 'order', 500);

      if (isMultiSet) {
        // Get words from multiple sets
        const setsData = JSON.parse(sessionStorage.getItem('vocabSetsData') || '[]');
        setSelectedSetsData(setsData);
        
        let multiSetWords = [];
        setsData.forEach(set => {
          multiSetWords = [...multiSetWords, ...allWords.slice(set.startIndex, set.endIndex)];
        });
        setWords(multiSetWords);
      } else {
        // Get only the words for this set
        setWords(allWords.slice(startIndex, endIndex));
      }

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
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
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("VocabularySets"))}
            className="text-white p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-white">
              {isMultiSet ? `${selectedSetsData.length} סטים` : `סט ${setId}`}
            </h1>
            <p className="text-sm text-white/80">{words.length} מילים</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-4">
        {/* Preview Words */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h3 className="font-bold text-gray-900 mb-3">מילים בסט זה</h3>
          <div className="flex flex-wrap gap-2">
            {words.slice(0, 5).map((word, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {word.hebrew_word}
              </span>
            ))}
            {words.length > 5 && (
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                +{words.length - 5} נוספות
              </span>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 text-lg">בחר סוג תרגול</h3>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => {
              if (isMultiSet) {
                navigate(createPageUrl(`VocabularyFlashcards?multiSet=true&sets=${setsParam}`));
              } else {
                navigate(createPageUrl(`VocabularyFlashcards?setId=${setId}&start=${startIndex}&end=${endIndex}`));
              }
            }}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-right">
              <div className="font-bold text-gray-900 text-lg mb-1">כרטיסיות</div>
              <div className="text-sm text-gray-600">למידת מילים חדשות עם הפיכה</div>
              <div className="text-xs text-blue-600 mt-1">מומלץ להתחלה</div>
            </div>
            <ChevronLeft className="w-6 h-6 text-blue-400" />
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => {
              if (isMultiSet) {
                navigate(createPageUrl(`VocabularyQuickPractice?multiSet=true&sets=${setsParam}`));
              } else {
                navigate(createPageUrl(`VocabularyQuickPractice?setId=${setId}&start=${startIndex}&end=${endIndex}`));
              }
            }}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 border-2 border-green-200 hover:border-green-400 transition-all shadow-sm"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-right">
              <div className="font-bold text-gray-900 text-lg mb-1">תרגול מהיר</div>
              <div className="text-sm text-gray-600">שאלות מגוונות לבדיקת הידע</div>
              <div className="text-xs text-green-600 mt-1">השלמה, בחירה, כתיבה</div>
            </div>
            <ChevronLeft className="w-6 h-6 text-green-400" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}