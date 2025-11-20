import { Calendar } from "lucide-react";
import { differenceInDays, differenceInHours, differenceInMinutes, format } from "date-fns";
import { he } from "date-fns/locale";

export default function CountdownCard({ examDate, subject, units }) {
  if (!examDate) return null;

  const now = new Date();
  const exam = new Date(examDate);
  
  // בדיקה אם התאריך עבר
  if (exam < now) return null;
  
  const daysLeft = differenceInDays(exam, now);
  const hoursLeft = differenceInHours(exam, now) % 24;
  const minutesLeft = differenceInMinutes(exam, now) % 60;

  return (
    <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-6 shadow-lg text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">הבגרות הבאה</h3>
          {subject && units && (
            <p className="text-red-100 text-sm">{subject} • {units} יחידות</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <div className="text-4xl font-bold">{daysLeft}</div>
          <div className="text-sm text-red-100">ימים</div>
        </div>
        <div className="text-3xl font-light">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold">{hoursLeft}</div>
          <div className="text-sm text-red-100">שעות</div>
        </div>
        <div className="text-3xl font-light">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold">{minutesLeft}</div>
          <div className="text-sm text-red-100">דקות</div>
        </div>
      </div>
      
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
        <p className="text-white font-semibold text-center">
          {format(exam, "EEEE, d בMMMM yyyy", { locale: he })}
        </p>
      </div>
    </div>
  );
}