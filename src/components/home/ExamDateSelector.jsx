import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ExamDateSelector({ userSubject, userUnits, onDateSelect }) {
  const [showDialog, setShowDialog] = useState(false);

  const { data: upcomingExams, isLoading } = useQuery({
    queryKey: ['upcoming-exams', userSubject, userUnits],
    queryFn: async () => {
      if (!userSubject || !userUnits) return [];
      
      const allExams = await base44.entities.UpcomingExam.list();
      
      return allExams.filter(exam => 
        exam.subject === userSubject && 
        exam.level === userUnits &&
        new Date(exam.exam_date) > new Date()
      ).sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
    },
    initialData: [],
    enabled: !!userSubject && !!userUnits
  });

  const handleSelectDate = async (examDate) => {
    await onDateSelect(examDate);
    setShowDialog(false);
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>עדכן תאריך בגרות</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              בחר תאריך בגרות
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : upcomingExams.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {upcomingExams.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => handleSelectDate(exam.exam_date)}
                    className="w-full p-4 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors text-right border-2 border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">
                          {exam.subject} - {exam.level} יחידות
                        </div>
                        <div className="text-sm text-gray-600">
                          מועד: {format(new Date(exam.exam_date), "d בMMMM yyyy", { locale: he })}
                        </div>
                      </div>
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  לא נמצאו בגרויות עבור {userSubject} {userUnits} יחידות
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}