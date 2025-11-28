import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QUESTION_TYPES = [
  'fill_blank',
  'multiple_choice',
  'definition_to_word',
  'word_to_definition',
  'synonym'
];

function generateQuestion(word, allWords, type) {
  const otherWords = allWords.filter(w => w.id !== word.id);
  const distractors = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);

  switch (type) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        question: `מה התרגום של "${word.english_answer}"?`,
        correctAnswer: word.hebrew_word,
        options: [word.hebrew_word, ...distractors.map(d => d.hebrew_word)].sort(() => Math.random() - 0.5),
        word
      };
    case 'definition_to_word':
      return {
        type: 'multiple_choice',
        question: `איזו מילה מתאימה ל: "${word.hebrew_word}"?`,
        correctAnswer: word.english_answer,
        options: [word.english_answer, ...distractors.map(d => d.english_answer)].sort(() => Math.random() - 0.5),
        word
      };
    case 'word_to_definition':
      return {
        type: 'multiple_choice',
        question: `מה המשמעות של "${word.english_answer}"?`,
        correctAnswer: word.hebrew_word,
        options: [word.hebrew_word, ...distractors.map(d => d.hebrew_word)].sort(() => Math.random() - 0.5),
        word
      };
    case 'fill_blank':
      if (word.example_sentence) {
        const blankedSentence = word.example_sentence.replace(
          new RegExp(word.english_answer, 'gi'),
          '_____'
        );
        return {
          type: 'fill_blank',
          question: `השלם את המשפט:\n${blankedSentence}`,
          correctAnswer: word.english_answer.toLowerCase(),
          word
        };
      }
      // Fallback to multiple choice
      return generateQuestion(word, allWords, 'multiple_choice');
    default:
      return generateQuestion(word, allWords, 'multiple_choice');
  }
}

export default function QuickPractice({ words, questionsCount = 10, onComplete, onUpdateWord }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (words && words.length > 0) {
      const selectedWords = words.sort(() => Math.random() - 0.5).slice(0, questionsCount);
      const generatedQuestions = selectedWords.map((word, idx) => {
        const type = QUESTION_TYPES[idx % QUESTION_TYPES.length];
        return generateQuestion(word, words, type);
      });
      setQuestions(generatedQuestions);
    }
  }, [words, questionsCount]);

  if (questions.length === 0) {
    return <div className="text-center py-12 text-gray-600">טוען שאלות...</div>;
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const checkAnswer = () => {
    let correct = false;
    if (currentQuestion.type === 'fill_blank') {
      correct = userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase();
    } else {
      correct = selectedOption === currentQuestion.correctAnswer;
    }

    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => [...prev, { 
      word: currentQuestion.word, 
      correct,
      question: currentQuestion.question
    }]);

    onUpdateWord?.(currentQuestion.word.id, {
      times_correct: correct ? 1 : 0,
      times_incorrect: correct ? 0 : 1,
      is_weak: !correct
    });
  };

  const goToNext = () => {
    setShowResult(false);
    setUserAnswer('');
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const correctCount = results.filter(r => r.correct).length + (isCorrect ? 1 : 0);
      const weakWords = results.filter(r => !r.correct).map(r => r.word);
      onComplete?.({
        total: questions.length,
        correct: correctCount,
        incorrect: questions.length - correctCount,
        accuracy: Math.round((correctCount / questions.length) * 100),
        weakWords
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>שאלה {currentIndex + 1} / {questions.length}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-lg font-medium text-gray-900 mb-6 whitespace-pre-wrap">
          {currentQuestion.question}
        </div>

        {currentQuestion.type === 'fill_blank' ? (
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="הקלד את התשובה..."
            className="text-lg h-12"
            disabled={showResult}
            onKeyPress={(e) => e.key === 'Enter' && !showResult && checkAnswer()}
          />
        ) : (
          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => !showResult && setSelectedOption(option)}
                disabled={showResult}
                className={`w-full p-4 text-right rounded-lg border-2 transition-colors ${
                  showResult
                    ? option === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : option === selectedOption
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200'
                    : selectedOption === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Result Feedback */}
        {showResult && (
          <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isCorrect ? 'נכון!' : 'לא נכון'}
              </span>
            </div>
            {!isCorrect && (
              <div className="text-sm text-gray-700">
                התשובה הנכונה: <strong>{currentQuestion.correctAnswer}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!showResult ? (
        <Button
          onClick={checkAnswer}
          disabled={currentQuestion.type === 'fill_blank' ? !userAnswer.trim() : !selectedOption}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
        >
          בדוק תשובה
        </Button>
      ) : (
        <Button
          onClick={goToNext}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {currentIndex < questions.length - 1 ? 'הבא' : 'סיים'}
          <ChevronLeft className="w-5 h-5 mr-2" />
        </Button>
      )}
    </div>
  );
}