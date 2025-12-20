import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BagrutCarousel({ exams, onProcess, processingId }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? exams.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === exams.length - 1 ? 0 : prev + 1));
  };

  if (!exams || exams.length === 0) {
    return null;
  }

  const currentExam = exams[currentIndex];

  return (
    <div className="relative w-full py-4">
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="w-full px-10"
      >
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">{currentExam.title}</h3>
            <div className="text-sm text-gray-500">
              {currentExam.year}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {currentExam.subject_id} - {currentExam.unit_level} יח"ל - שאלון {currentExam.module_symbol}
          </p>
          <div className="flex gap-2">
            <a href={currentExam.exam_file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full">צפה בבחינה</Button>
            </a>
            {currentExam.solution_file_url && (
              <a href={currentExam.solution_file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full">צפה בפתרון</Button>
              </a>
            )}
          </div>
          {onProcess && (
            <Button
              onClick={() => onProcess(currentExam)}
              disabled={processingId === currentExam.id}
              className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {processingId === currentExam.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BookCheck className="w-4 h-4 mr-2" />
              )}
              {processingId === currentExam.id ? 'מעבד...' : 'עבד ופרסם'}
            </Button>
          )}
        </div>
      </motion.div>

      {exams.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute top-1/2 -translate-y-1/2 left-0 z-10 rounded-full bg-white/50 hover:bg-white"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute top-1/2 -translate-y-1/2 right-0 z-10 rounded-full bg-white/50 hover:bg-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </>
      )}
    </div>
  );
}