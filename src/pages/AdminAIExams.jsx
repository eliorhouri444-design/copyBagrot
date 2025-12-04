import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, FileText, ArrowRight, Trash2, Upload, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminAIExams() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedExam, setSelectedExam] = useState(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [publishData, setPublishData] = useState({
    title: "",
    module_id: "",
    subject: "",
    unit_level: "",
    description: "",
    duration_minutes: 90,
  });

  // Fetch generated exams
  const { data: generatedExams, isLoading } = useQuery({
    queryKey: ["generated-exams"],
    queryFn: async () => {
      const data = await base44.entities.GeneratedExam.list();
      return data.sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GeneratedExam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["generated-exams"]);
    },
  });

  // Publish mutation (Create GenericExam)
  const publishMutation = useMutation({
    mutationFn: async (data) => {
      // Convert GeneratedExam JSON to GenericExam format
      const examJson = selectedExam.exam_json;
      
      const questions = (examJson.questions || []).map((q, idx) => ({
        question_number: idx + 1,
        question_text: q.question_text,
        question_type: q.sub_questions?.length > 0 ? 'Open-ended' : 'Multiple Choice', // Basic heuristic
        options: [], // AI JSON might need to be adapted for options if multiple choice
        correct_answer: q.final_answer || q.solution_steps,
        explanation: q.solution_steps,
        points: Math.floor(100 / (examJson.questions.length || 1)),
        topic: q.topic || 'General',
      }));

      const genericExamData = {
        title: data.title,
        subject: data.subject,
        unit_level: parseInt(data.unit_level),
        module_id: data.module_id,
        description: data.description,
        duration_minutes: parseInt(data.duration_minutes),
        total_points: 100,
        passing_grade: 56,
        questions: questions,
        is_generated: true,
        is_copyright_free: true,
        generated_from_id: selectedExam.id
      };

      return await base44.entities.GenericExam.create(genericExamData);
    },
    onSuccess: () => {
      setPublishDialogOpen(false);
      alert("המבחן פורסם בהצלחה! הוא יופיע כעת באפליקציה.");
      // Optionally delete the draft or mark as published
    },
    onError: (err) => {
      alert("שגיאה בפרסום המבחן: " + err.message);
    },
  });

  const handlePublishClick = (exam) => {
    setSelectedExam(exam);
    setPublishData({
      title: `מבחן תרגול - ${exam.subject} ${exam.unit} יח"ל`,
      subject: exam.subject,
      unit_level: exam.unit?.toString(),
      module_id: "",
      description: "מבחן שנוצר ע\"י AI",
      duration_minutes: 90
    });
    setPublishDialogOpen(true);
  };

  const handleViewClick = (exam) => {
    setSelectedExam(exam);
    setViewDialogOpen(true);
  };

  const handlePublishSubmit = () => {
    if (!publishData.module_id || !publishData.title) {
      alert("אנא מלא את כל שדות החובה");
      return;
    }
    publishMutation.mutate(publishData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              ניהול מבחנים שנוצרו (AI)
            </h1>
            <p className="text-gray-500 mt-1">
              כאן ניתן לצפות במבחנים שנוצרו ע"י המערכת, ולשייך אותם לקרוסלות המתאימות באפליקציה.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminBagrutManager'))}>
            <Upload className="w-4 h-4 ml-2" />
            העלאת בגרות חדשה
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>מבחנים ממתינים לפרסום</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : generatedExams?.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                לא נמצאו מבחנים שנוצרו. העלה בגרות וצור מבחן AI כדי לראות אותו כאן.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">תאריך יצירה</TableHead>
                    <TableHead className="text-right">מקצוע</TableHead>
                    <TableHead className="text-right">יחידות</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">שאלות</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        {new Date(exam.created_at || exam.created_date).toLocaleDateString('he-IL')}
                        <br />
                        <span className="text-xs text-gray-400">
                          {new Date(exam.created_at || exam.created_date).toLocaleTimeString('he-IL')}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{exam.subject}</TableCell>
                      <TableCell>{exam.unit}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          exam.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          exam.status === 'failed' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exam.status === 'completed' ? 'מוכן' : 
                           exam.status === 'failed' ? 'נכשל' : 'בעיבוד'}
                        </span>
                      </TableCell>
                      <TableCell>{exam.exam_json?.questions?.length || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleViewClick(exam)}
                            disabled={exam.status !== 'completed'}
                          >
                            <Eye className="w-4 h-4 ml-2" />
                            צפה
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handlePublishClick(exam)}
                            disabled={exam.status !== 'completed'}
                          >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            פרסם
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if(confirm("האם למחוק את המבחן?")) deleteMutation.mutate(exam.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>צפייה במבחן שנוצר</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-full pl-4">
            {selectedExam?.exam_json?.questions ? (
              <div className="space-y-6 py-4">
                <div className="flex gap-4 text-sm text-gray-500 border-b pb-4">
                  <div>מקצוע: <span className="font-bold text-gray-900">{selectedExam.subject}</span></div>
                  <div>יחידות: <span className="font-bold text-gray-900">{selectedExam.unit}</span></div>
                  <div>שאלות: <span className="font-bold text-gray-900">{selectedExam.exam_json.questions.length}</span></div>
                </div>
                
                {selectedExam.exam_json.questions.map((q, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-blue-700">שאלה {idx + 1}</h3>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{q.topic}</span>
                    </div>
                    
                    <div className="mb-4 whitespace-pre-wrap text-gray-800 font-medium">
                      {q.question_text}
                    </div>

                    {q.sub_questions && q.sub_questions.length > 0 && (
                      <div className="mr-4 mb-4 space-y-2 border-r-2 border-gray-200 pr-4">
                        {q.sub_questions.map((sub, sIdx) => (
                          <div key={sIdx} className="text-sm">
                            <span className="font-bold ml-1">({String.fromCharCode(1488 + sIdx)})</span>
                            {sub}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-green-50 p-3 rounded border border-green-100 mt-4">
                      <div className="text-xs font-bold text-green-700 mb-1">פתרון מלא:</div>
                      <div className="whitespace-pre-wrap text-sm text-gray-700">
                        {q.solution_steps}
                      </div>
                      {q.final_answer && (
                        <div className="mt-2 pt-2 border-t border-green-200 font-bold text-green-800 text-sm">
                          תשובה סופית: {q.final_answer}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                <p>טוען תוכן מבחן...</p>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>סגור</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setViewDialogOpen(false);
                handlePublishClick(selectedExam);
              }}
            >
              <CheckCircle className="w-4 h-4 ml-2" />
              עבור לפרסום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרסום מבחן לאפליקציה</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>כותרת המבחן</Label>
              <Input 
                value={publishData.title} 
                onChange={(e) => setPublishData({...publishData, title: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>מקצוע</Label>
                <Input 
                  value={publishData.subject} 
                  onChange={(e) => setPublishData({...publishData, subject: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>יחידות לימוד</Label>
                <Select 
                  value={publishData.unit_level} 
                  onValueChange={(val) => setPublishData({...publishData, unit_level: val})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 יחידות</SelectItem>
                    <SelectItem value="4">4 יחידות</SelectItem>
                    <SelectItem value="5">5 יחידות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>שייך למודול / שאלון</Label>
              <Input 
                placeholder="לדוגמה: A, C, 581, 806"
                value={publishData.module_id} 
                onChange={(e) => setPublishData({...publishData, module_id: e.target.value})}
              />
              <p className="text-xs text-gray-500">
                זה יקבע באיזה קרוסלה המבחן יופיע במסך הבגרויות.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>תיאור (אופציונלי)</Label>
              <Input 
                value={publishData.description} 
                onChange={(e) => setPublishData({...publishData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>ביטול</Button>
            <Button onClick={handlePublishSubmit} disabled={publishMutation.isPending}>
              {publishMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              פרסם ושמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}