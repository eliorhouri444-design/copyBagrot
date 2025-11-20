
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, ChevronLeft, Trash2, Eye, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminCurriculumPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);

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
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: curriculums = [], isLoading } = useQuery({
    queryKey: ['curriculums'],
    queryFn: () => base44.entities.Curriculum.list("-created_date", 50),
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Curriculum.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['curriculums']);
      setSelectedCurriculum(null);
    }
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminContentGenerator"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">תוכניות לימודים</h1>
          <p className="text-white/90">{curriculums.length} תוכניות במערכת</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-4">
        {curriculums.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-600 mb-4">אין תוכניות לימודים במערכת</div>
            <Button
              onClick={() => navigate(createPageUrl("AdminContentGenerator"))}
              className="bg-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              טען תוכנית חדשה
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {curriculums.map((curriculumItem, curriculumIndex) => (
              <motion.div
                key={curriculumItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: curriculumIndex * 0.05 }}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-1">
                        {curriculumItem.subject} - כיתה {curriculumItem.grade_level} ({curriculumItem.unit_level} יח')
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {curriculumItem.main_topics?.length || 0} נושאים ראשיים
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {curriculumItem.main_topics?.slice(0, 3).map((topicItem, topicIndex) => (
                          <span key={topicIndex} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                            {topicItem.topic_name}
                          </span>
                        ))}
                        {curriculumItem.main_topics?.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            +{curriculumItem.main_topics.length - 3} נוספים
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCurriculum(curriculumItem)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("למחוק תוכנית זו?")) {
                            deleteMutation.mutate(curriculumItem.id);
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* דיאלוג צפייה בתוכנית */}
      <Dialog open={!!selectedCurriculum} onOpenChange={() => setSelectedCurriculum(null)}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCurriculum?.subject} - כיתה {selectedCurriculum?.grade_level}
            </DialogTitle>
          </DialogHeader>

          {selectedCurriculum && (
            <div className="space-y-4 py-4">
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="text-sm font-bold text-indigo-900 mb-2">מידע כללי:</div>
                <div className="text-sm text-gray-800 space-y-1">
                  <div>📚 יחידות: {selectedCurriculum.unit_level}</div>
                  <div>🎯 יעדי למידה: {selectedCurriculum.learning_objectives?.length || 0}</div>
                  <div>📅 עדכון אחרון: {selectedCurriculum.updated_by_ministry || 'לא ידוע'}</div>
                </div>
              </div>

              {selectedCurriculum.main_topics?.map((topicItem, topicIndex) => (
                <div key={topicIndex} className="bg-white rounded-xl border-2 border-purple-200 p-4">
                  <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    {topicItem.topic_name}
                  </div>
                  <div className="text-sm text-gray-700 mb-3">
                    {topicItem.topic_description}
                  </div>
                  
                  <div className="space-y-2">
                    {topicItem.subtopics?.map((subtopicItem, subtopicIndex) => (
                      <div key={subtopicIndex} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="text-sm font-bold text-purple-900">{subtopicItem.name}</div>
                        <div className="text-xs text-gray-700 mt-1">{subtopicItem.description}</div>
                        {subtopicItem.key_concepts && subtopicItem.key_concepts.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {subtopicItem.key_concepts.map((conceptItem, conceptIndex) => (
                              <span key={conceptIndex} className="text-xs bg-white px-2 py-0.5 rounded border border-purple-200">
                                {conceptItem}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
