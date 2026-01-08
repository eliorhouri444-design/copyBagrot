import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, BookCheck, Loader2, Calendar, Sun, Cloud, FileText, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BagrutCarousel({ exams, onProcess, processingId }) {
  const [openYears, setOpenYears] = useState({});

  const toggleYear = (year) => {
    setOpenYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // Grouping logic
  const groupedExams = React.useMemo(() => {
    const groups = {};
    exams.forEach(exam => {
      const year = exam.year || 'אחר';
      if (!groups[year]) groups[year] = { winter: [], summer: [], special: [], other: [] };
      
      const season = exam.season?.toLowerCase();
      if (season === 'winter' || season === 'choref' || season === 'חורף') groups[year].winter.push(exam);
      else if (season === 'summer' || season === 'kayits' || season === 'קיץ') groups[year].summer.push(exam);
      else if (season === 'special' || season === 'special_term') groups[year].special.push(exam);
      else groups[year].other.push(exam);
    });
    
    // Sort years descending (numbers first, then strings)
    return Object.keys(groups).sort((a, b) => {
        if (a === 'אחר') return 1;
        if (b === 'אחר') return -1;
        return b - a;
    }).map(year => ({
      year,
      seasons: groups[year]
    }));
  }, [exams]);

  // Open first year by default
  React.useEffect(() => {
    if (groupedExams.length > 0) {
      setOpenYears(prev => ({ ...prev, [groupedExams[0].year]: true }));
    }
  }, [groupedExams]);

  if (!exams || exams.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      {groupedExams.map(({ year, seasons }) => {
        const totalCount = seasons.winter.length + seasons.summer.length + seasons.special.length + seasons.other.length;
        const isOpen = openYears[year];

        return (
          <div key={year} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button 
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-right"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-lg text-gray-800">{year}</span>
                <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  {totalCount} מבחנים
                </span>
              </div>
              {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronLeft className="w-5 h-5 text-gray-400" />}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 pt-2 space-y-4 border-t border-gray-100">
                    {/* Summer */}
                    {seasons.summer.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-orange-600 font-bold text-sm border-b border-orange-100 pb-1 mt-2">
                          <Sun className="w-4 h-4" />
                          מועד קיץ
                        </div>
                        <div className="grid gap-3">
                          {seasons.summer.map(exam => (
                            <ExamCard key={exam.id} exam={exam} onProcess={onProcess} processingId={processingId} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Winter */}
                    {seasons.winter.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm border-b border-blue-100 pb-1 mt-2">
                          <Cloud className="w-4 h-4" />
                          מועד חורף
                        </div>
                        <div className="grid gap-3">
                          {seasons.winter.map(exam => (
                            <ExamCard key={exam.id} exam={exam} onProcess={onProcess} processingId={processingId} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other/Special */}
                    {(seasons.special.length > 0 || seasons.other.length > 0) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-sm border-b border-purple-100 pb-1 mt-2">
                          <FileText className="w-4 h-4" />
                          מועדים מיוחדים / אחר
                        </div>
                        <div className="grid gap-3">
                          {[...seasons.special, ...seasons.other].map(exam => (
                            <ExamCard key={exam.id} exam={exam} onProcess={onProcess} processingId={processingId} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function ExamCard({ exam, onProcess, processingId }) {
  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="font-semibold text-gray-900">{exam.title}</div>
        <div className="text-xs text-gray-500 flex gap-2 mt-1">
          <span className="bg-gray-100 px-1.5 rounded">שאלון {exam.module_symbol}</span>
          {exam.term && <span className="bg-gray-100 px-1.5 rounded">{exam.term === 'a' ? "מועד א'" : exam.term === 'b' ? "מועד ב'" : exam.term}</span>}
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <a href={exam.exam_file_url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs">טופס</Button>
        </a>
        {exam.solution_file_url && (
          <a href={exam.solution_file_url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">פתרון</Button>
          </a>
        )}
        {onProcess && (
          <Button
            onClick={() => onProcess(exam)}
            disabled={processingId === exam.id}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none h-8 text-xs"
          >
            {processingId === exam.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <BookCheck className="w-3 h-3 mr-1" />
            )}
            {processingId === exam.id ? '...' : 'עבד'}
          </Button>
        )}
      </div>
    </div>
  );
}