import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Target, BookOpen, GraduationCap } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PlanSettingsDialog({ open, onOpenChange, userProfile, onSave }) {
  const [formData, setFormData] = useState({
    subject_id: "אנגלית",
    unit_level: "3",
    target_score: 85,
    daily_availability_minutes: 45,
    exam_date: new Date(new Date().setMonth(new Date().getMonth() + 3)) // Default 3 months ahead
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        subject_id: userProfile.subject_id || "אנגלית",
        unit_level: (userProfile.unit_level || 3).toString(),
        target_score: userProfile.target_score || 85,
        daily_availability_minutes: userProfile.daily_availability_minutes || 45,
        exam_date: userProfile.exam_date ? new Date(userProfile.exam_date) : new Date(new Date().setMonth(new Date().getMonth() + 3))
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    // If profile exists, update it. If not, create it.
    try {
        let profileToUpdate = userProfile;
        
        if (!profileToUpdate) {
            // Check if exists first to avoid duplicates if parent didn't pass it
            const currentUser = await base44.auth.me();
            const existing = await base44.entities.UserLearningProfile.filter({ 
                user_email: currentUser.email,
                subject_id: formData.subject_id 
            });
            if (existing.length > 0) profileToUpdate = existing[0];
        }

        const dataToSave = {
            subject_id: formData.subject_id,
            unit_level: parseInt(formData.unit_level),
            target_score: formData.target_score,
            daily_availability_minutes: formData.daily_availability_minutes,
            exam_date: formData.exam_date.toISOString().split('T')[0],
            // Update factors for difficulty
            difficulty_factor: parseInt(formData.unit_level) === 5 ? 1.3 : parseInt(formData.unit_level) === 4 ? 1.15 : 1.0,
            target_score_factor: formData.target_score >= 90 ? 1.35 : formData.target_score >= 80 ? 1.2 : 1.0,
            last_recalculated: new Date().toISOString()
        };

        if (profileToUpdate?.id) {
            await base44.entities.UserLearningProfile.update(profileToUpdate.id, dataToSave);
        } else {
            const currentUser = await base44.auth.me();
            await base44.entities.UserLearningProfile.create({
                user_email: currentUser.email,
                ...dataToSave,
                current_mastery: 0, // Init
                completed_chapters: [],
                weak_topics: []
            });
        }

        // Also update user basic preferences for global app usage
        await base44.auth.updateMe({
            selected_subject: formData.subject_id,
            selected_units: parseInt(formData.unit_level),
            target_score: formData.target_score,
            exam_date: formData.exam_date.toISOString()
        });

        if (onSave) onSave();
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving settings:", error);
        alert("שגיאה בשמירת ההגדרות");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">הגדרת תוכנית למידה</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Subject & Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                מקצוע
              </label>
              <Select 
                value={formData.subject_id} 
                onValueChange={(val) => setFormData({...formData, subject_id: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="לשון">לשון</SelectItem>
                  <SelectItem value="היסטוריה">היסטוריה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-500" />
                יחידות לימוד
              </label>
              <Select 
                value={formData.unit_level} 
                onValueChange={(val) => setFormData({...formData, unit_level: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Score */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                ציון יעד
              </label>
              <span className="text-sm font-bold text-red-600">{formData.target_score}</span>
            </div>
            <Slider
              value={[formData.target_score]}
              onValueChange={(val) => setFormData({...formData, target_score: val[0]})}
              min={55}
              max={100}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>עובר (55)</span>
              <span>מצטיין (100)</span>
            </div>
          </div>

          {/* Daily Time */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                זמן למידה יומי
              </label>
              <span className="text-sm font-bold text-orange-600">{formData.daily_availability_minutes} דקות</span>
            </div>
            <Slider
              value={[formData.daily_availability_minutes]}
              onValueChange={(val) => setFormData({...formData, daily_availability_minutes: val[0]})}
              min={15}
              max={180}
              step={15}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>15 דק'</span>
              <span>3 שעות</span>
            </div>
          </div>

          {/* Exam Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-green-500" />
              תאריך הבגרות
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`w-full justify-start text-left font-normal ${!formData.exam_date && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.exam_date ? format(formData.exam_date, "PPP", { locale: he }) : <span>בחר תאריך</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.exam_date}
                  onSelect={(date) => date && setFormData({...formData, exam_date: date})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
            שמור תוכנית וחשב מסלול מחדש
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}