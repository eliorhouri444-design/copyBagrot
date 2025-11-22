import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Edit2, Trash2, Save, X, ArrowLeft, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function AdminVocabularyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('אנגלית');
  const [selectedUnits, setSelectedUnits] = useState(4);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error loading user:", error);
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: allWords = [] } = useQuery({
    queryKey: ['vocab-admin', selectedSubject, selectedUnits],
    queryFn: async () => {
      const words = await base44.entities.VocabularyQuestion.list();
      return words.filter(w => w.subject_id === selectedSubject && w.unit_level === selectedUnits);
    },
    enabled: !!selectedSubject && selectedUnits > 0
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['topics-vocab', selectedSubject, selectedUnits],
    queryFn: async () => {
      const topics = await base44.entities.TopicNew.list();
      return topics.filter(t => t.subject_id === selectedSubject && t.unit_level === selectedUnits && t.is_active);
    },
    enabled: !!selectedSubject && selectedUnits > 0
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VocabularyQuestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vocab-admin']);
      setShowEditDialog(false);
      setEditingWord(null);
      alert('המילה נוספה בהצלחה! ✅');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VocabularyQuestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vocab-admin']);
      setShowEditDialog(false);
      setEditingWord(null);
      alert('המילה עודכנה בהצלחה! ✅');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VocabularyQuestion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['vocab-admin']);
      alert('המילה נמחקה בהצלחה.');
    }
  });

  const handleAddNew = () => {
    setEditingWord({
      subject_id: selectedSubject,
      unit_level: selectedUnits,
      topic_id: '',
      category: '',
      hebrew_word: '',
      english_answer: '',
      acceptable_answers: [],
      example_sentence: '',
      difficulty: 'medium',
      order: 0,
      is_active: true
    });
    setShowEditDialog(true);
  };

  const handleEdit = (word) => {
    setEditingWord({
      id: word.id,
      subject_id: word.subject_id,
      unit_level: word.unit_level,
      topic_id: word.topic_id || '',
      category: word.category || '',
      hebrew_word: word.hebrew_word,
      english_answer: word.english_answer,
      acceptable_answers: word.acceptable_answers || [],
      example_sentence: word.example_sentence || '',
      difficulty: word.difficulty || 'medium',
      order: word.order || 0,
      is_active: word.is_active ?? true
    });
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!editingWord.hebrew_word || !editingWord.english_answer) {
      alert('חובה למלא מילה בעברית ותשובה באנגלית');
      return;
    }

    const data = {
      subject_id: editingWord.subject_id,
      unit_level: editingWord.unit_level,
      topic_id: editingWord.topic_id || null,
      category: editingWord.category || '',
      hebrew_word: editingWord.hebrew_word,
      english_answer: editingWord.english_answer,
      acceptable_answers: editingWord.acceptable_answers,
      example_sentence: editingWord.example_sentence || '',
      difficulty: editingWord.difficulty,
      order: editingWord.order,
      is_active: editingWord.is_active
    };

    if (editingWord.id) {
      updateMutation.mutate({ id: editingWord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק מילה זו?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredWords = allWords.filter(w => {
    const matchesSearch = w.hebrew_word.includes(searchTerm) || w.english_answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || w.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(allWords.map(w => w.category).filter(Boolean))];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-24">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 shadow-xl mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-white flex-1">ניהול אוצר מילים</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="bg-white/20 border-white/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="אנגלית">אנגלית</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedUnits.toString()} onValueChange={(v) => setSelectedUnits(parseInt(v))}>
            <SelectTrigger className="bg-white/20 border-white/30 text-white">
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

      <div className="px-4 space-y-4">
        <div className="flex gap-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש מילה..."
            className="flex-1"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="קטגוריה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAddNew} className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 text-lg font-bold">
          <Plus className="w-5 h-5 ml-2" />
          הוסף מילה חדשה
        </Button>

        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h3 className="font-bold text-gray-900 mb-3">סה"כ {filteredWords.length} מילים</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredWords.map((word, idx) => {
              const topicName = allTopics.find(t => t.topic_id === word.topic_id)?.name || word.category || 'ללא נושא';
              return (
                <div key={word.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg">{word.hebrew_word}</div>
                      <div className="text-blue-600 font-semibold" dir="ltr">{word.english_answer}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        נושא: {topicName} {word.category && `• ${word.category}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(word)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(word.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {word.example_sentence && (
                    <div className="text-sm text-gray-600 mt-2 p-2 bg-white rounded" dir="ltr">
                      {word.example_sentence}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingWord?.id ? 'עריכת מילה' : 'הוספת מילה חדשה'}
            </DialogTitle>
          </DialogHeader>

          {editingWord && (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  נושא (מהקרוסלה) *
                </label>
                <Select
                  value={editingWord.topic_id}
                  onValueChange={(value) => setEditingWord({...editingWord, topic_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר נושא" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא נושא</SelectItem>
                    {allTopics.map(topic => (
                      <SelectItem key={topic.topic_id} value={topic.topic_id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  קטגוריה (אופציונלי)
                </label>
                <Input
                  value={editingWord.category}
                  onChange={(e) => setEditingWord({...editingWord, category: e.target.value})}
                  placeholder="Basic Verbs, Academic Vocabulary..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    מילה בעברית *
                  </label>
                  <Input
                    value={editingWord.hebrew_word}
                    onChange={(e) => setEditingWord({...editingWord, hebrew_word: e.target.value})}
                    placeholder="להשוות"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    תשובה באנגלית *
                  </label>
                  <Input
                    value={editingWord.english_answer}
                    onChange={(e) => setEditingWord({...editingWord, english_answer: e.target.value})}
                    placeholder="compare"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תשובות מקובלות (מופרדות בפסיק)
                </label>
                <Input
                  value={(editingWord.acceptable_answers || []).join(', ')}
                  onChange={(e) => setEditingWord({
                    ...editingWord, 
                    acceptable_answers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="to compare, make a comparison"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  משפט לדוגמה
                </label>
                <Textarea
                  value={editingWord.example_sentence}
                  onChange={(e) => setEditingWord({...editingWord, example_sentence: e.target.value})}
                  placeholder="We can compare the results of both tests."
                  dir="ltr"
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    רמת קושי
                  </label>
                  <Select
                    value={editingWord.difficulty}
                    onValueChange={(value) => setEditingWord({...editingWord, difficulty: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">קל</SelectItem>
                      <SelectItem value="medium">בינוני</SelectItem>
                      <SelectItem value="hard">קשה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    סדר
                  </label>
                  <Input
                    type="number"
                    value={editingWord.order}
                    onChange={(e) => setEditingWord({...editingWord, order: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}