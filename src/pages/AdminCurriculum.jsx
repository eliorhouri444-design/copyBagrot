import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Edit2, Trash2, Save, ChevronLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminCurriculumPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("אנגלית");
  const [selectedUnits, setSelectedUnits] = useState(3);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, []);
  
  const { data: chapters = [] } = useQuery({
    queryKey: ['curriculum', selectedSubject, selectedUnits],
    queryFn: async () => {
      const all = await base44.entities.Curriculum.filter({
        subject_id: selectedSubject,
        unit_level: parseInt(selectedUnits)
      });
      return all.sort((a, b) => a.order - b.order);
    }
  });
  
  const saveMutation = useMutation({
    mutationFn: async (chapterData) => {
      if (editingChapter?.id) {
        return await base44.entities.Curriculum.update(editingChapter.id, chapterData);
      } else {
        return await base44.entities.Curriculum.create(chapterData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['curriculum']);
      setShowEditDialog(false);
      setEditingChapter(null);
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Curriculum.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['curriculum']);
      setShowEditDialog(false);
      setEditingChapter(null);
    }
  });
  
  const handleSave = () => {
    if (!editingChapter?.chapter_name || !editingChapter?.chapter_number) {
      alert('חובה למלא שם פרק ומספר פרק');
      return;
    }
    
    saveMutation.mutate({
      subject_id: selectedSubject,
      unit_level: parseInt(selectedUnits),
      chapter_number: parseInt(editingChapter.chapter_number),
      chapter_name: editingChapter.chapter_name,
      order: parseInt(editingChapter.order) || 0,
      is_mandatory: editingChapter.is_mandatory !== false,
      difficulty_weight: parseFloat(editingChapter.difficulty_weight) || 1.0,
      exam_weight: parseInt(editingChapter.exam_weight) || 0,
      ministry_reference: editingChapter.ministry_reference || '',
      topics: editingChapter.topics || []
    });
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">ניהול סילבוס משרד החינוך</h1>
            <p className="text-white/90 text-sm">תכנית הלימודים הרשמית</p>
          </div>
        </div>
      </motion.div>
      
      <div className="px-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מקצוע" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="אנגלית">אנגלית</SelectItem>
                <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                <SelectItem value="כימיה">כימיה</SelectItem>
                <SelectItem value="ביולוגיה">ביולוגיה</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedUnits.toString()} onValueChange={(v) => setSelectedUnits(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="יחידות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 יחידות</SelectItem>
                <SelectItem value="4">4 יחידות</SelectItem>
                <SelectItem value="5">5 יחידות</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={() => {
              setEditingChapter({
                chapter_number: chapters.length + 1,
                chapter_name: '',
                order: chapters.length,
                is_mandatory: true,
                difficulty_weight: 1.0,
                exam_weight: 10,
                topics: []
              });
              setShowEditDialog(true);
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף פרק חדש
          </Button>
        </div>
        
        {/* Chapters List */}
        <div className="space-y-3">
          {chapters.map((chapter, idx) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl shadow-lg p-5 animate-hover-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {chapter.chapter_number}
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{chapter.chapter_name}</h4>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {chapter.exam_weight > 0 && (
                      <div>משקל בבגרות: {chapter.exam_weight}%</div>
                    )}
                    {chapter.topics && chapter.topics.length > 0 && (
                      <div>נושאים: {chapter.topics.length}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingChapter(chapter);
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm(`למחוק את ${chapter.chapter_name}?`)) {
                        deleteMutation.mutate(chapter.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {chapters.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              אין פרקים מוגדרים עבור {selectedSubject} {selectedUnits} יחידות
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingChapter?.id ? 'עריכת פרק' : 'הוספת פרק חדש'}
            </DialogTitle>
          </DialogHeader>
          
          {editingChapter && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    מספר פרק *
                  </label>
                  <Input
                    type="number"
                    value={editingChapter.chapter_number}
                    onChange={(e) => setEditingChapter({...editingChapter, chapter_number: parseInt(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    סדר לימוד
                  </label>
                  <Input
                    type="number"
                    value={editingChapter.order}
                    onChange={(e) => setEditingChapter({...editingChapter, order: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם הפרק *
                </label>
                <Input
                  value={editingChapter.chapter_name}
                  onChange={(e) => setEditingChapter({...editingChapter, chapter_name: e.target.value})}
                  placeholder="לדוגמה: Present Simple and Continuous"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    משקל בבגרות (%)
                  </label>
                  <Input
                    type="number"
                    value={editingChapter.exam_weight}
                    onChange={(e) => setEditingChapter({...editingChapter, exam_weight: parseInt(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    משקל קושי
                  </label>
                  <Select
                    value={editingChapter.difficulty_weight?.toString()}
                    onValueChange={(v) => setEditingChapter({...editingChapter, difficulty_weight: parseFloat(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.8">קל (0.8)</SelectItem>
                      <SelectItem value="1.0">רגיל (1.0)</SelectItem>
                      <SelectItem value="1.3">בינוני (1.3)</SelectItem>
                      <SelectItem value="1.5">קשה (1.5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קוד משרד החינוך (אופציונלי)
                </label>
                <Input
                  value={editingChapter.ministry_reference || ''}
                  onChange={(e) => setEditingChapter({...editingChapter, ministry_reference: e.target.value})}
                  placeholder="לדוגמה: ENG-4U-CH3"
                />
              </div>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="text-sm text-gray-700">
                  <strong>💡 טיפ:</strong> הפרקים מוגדרים לפי תכנית הלימודים הרשמית של משרד החינוך. המערכת תשתמש בהם ליצירת תכנית למידה מותאמת אישית לכל תלמיד.
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            {editingChapter?.id && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('למחוק פרק זה?')) {
                    deleteMutation.mutate(editingChapter.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק
              </Button>
            )}
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}