import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Edit2, Trash2, Save, Settings, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function AdminModulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('אנגלית');
  const [selectedUnits, setSelectedUnits] = useState(3);
  const [editingModule, setEditingModule] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser?.role !== 'admin') {
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: modules } = useQuery({
    queryKey: ['modules', selectedSubject, selectedUnits],
    queryFn: async () => {
      const all = await base44.entities.ModuleDefinition.list();
      const filtered = all.filter(m => m.subject === selectedSubject && m.unit_level === selectedUnits);
      return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ModuleDefinition.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setShowEditDialog(false);
      setEditingModule(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ModuleDefinition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setShowEditDialog(false);
      setEditingModule(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ModuleDefinition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    }
  });

  const handleMoveUp = async (module) => {
    const currentIndex = modules.findIndex(m => m.id === module.id);
    if (currentIndex <= 0) return;

    const prevModule = modules[currentIndex - 1];
    
    await updateMutation.mutateAsync({ id: module.id, data: { ...module, order: currentIndex - 1 } });
    await updateMutation.mutateAsync({ id: prevModule.id, data: { ...prevModule, order: currentIndex } });
  };

  const handleMoveDown = async (module) => {
    const currentIndex = modules.findIndex(m => m.id === module.id);
    if (currentIndex >= modules.length - 1) return;

    const nextModule = modules[currentIndex + 1];
    
    await updateMutation.mutateAsync({ id: module.id, data: { ...module, order: currentIndex + 1 } });
    await updateMutation.mutateAsync({ id: nextModule.id, data: { ...nextModule, order: currentIndex } });
  };

  const handleSave = () => {
    if (!editingModule) return;

    if (editingModule.id) {
      updateMutation.mutate({ id: editingModule.id, data: editingModule });
    } else {
      createMutation.mutate(editingModule);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("AdminExams"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Settings className="w-10 h-10 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">ניהול מודולים</h1>
              <p className="text-white/90">ערוך כותרות, תיאורים ונושאים של מודולי הבגרות</p>
            </div>
          </div>
        </div>

        {/* Subject/Units Selector */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">מקצוע</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                  <SelectItem value="ספרות">ספרות</SelectItem>
                  <SelectItem value="היסטוריה">היסטוריה</SelectItem>
                  <SelectItem value="גאוגרפיה">גאוגרפיה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">יחידות</label>
              <Select value={selectedUnits.toString()} onValueChange={(v) => setSelectedUnits(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 יחידות</SelectItem>
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => {
              setEditingModule({
                subject: selectedSubject,
                unit_level: selectedUnits,
                module_id: "",
                title: "",
                description: "",
                details: "",
                duration: 90,
                color: "from-blue-500 to-blue-600",
                points: "100",
                parts: [],
                entity: "",
                order: modules.length
              });
              setShowEditDialog(true);
            }}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף מודול חדש
          </Button>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          {modules.map((module) => (
            <div key={module.id} className={`bg-gradient-to-r ${module.color} bg-opacity-10 rounded-2xl shadow-md p-6 border-2 border-gray-200`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${module.color} rounded-xl flex items-center justify-center text-white font-bold text-xl`}>
                      {module.module_id}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{module.title}</h3>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-gray-600">משך</div>
                      <div className="font-bold text-gray-900">{module.duration} דקות</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-gray-600">נקודות</div>
                      <div className="font-bold text-gray-900">{module.points}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-gray-600">סדר</div>
                      <div className="font-bold text-gray-900">#{module.order + 1}</div>
                    </div>
                  </div>

                  {module.parts && module.parts.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-gray-700 mb-1">חלקים:</div>
                      <div className="flex flex-wrap gap-2">
                        {module.parts.map((part, idx) => (
                          <span key={idx} className="bg-white px-3 py-1 rounded-full text-xs text-gray-700">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(module)}
                    disabled={modules.findIndex(m => m.id === module.id) === 0}
                  >
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(module)}
                    disabled={modules.findIndex(m => m.id === module.id) === modules.length - 1}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingModule(module);
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit2 className="w-5 h-5 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('למחוק מודול זה?')) {
                        deleteMutation.mutate(module.id);
                      }
                    }}
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {modules.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">טרם הוגדרו מודולים עבור {selectedSubject} - {selectedUnits} יחידות</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingModule?.id ? 'עריכת מודול' : 'מודול חדש'}
            </DialogTitle>
          </DialogHeader>

          {editingModule && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מזהה מודול</label>
                  <Input
                    value={editingModule.module_id}
                    onChange={(e) => setEditingModule({...editingModule, module_id: e.target.value})}
                    placeholder="A, B, C..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Entity</label>
                  <Input
                    value={editingModule.entity}
                    onChange={(e) => setEditingModule({...editingModule, entity: e.target.value})}
                    placeholder="ModuleAExam"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">כותרת</label>
                <Input
                  value={editingModule.title}
                  onChange={(e) => setEditingModule({...editingModule, title: e.target.value})}
                  placeholder="מודול A"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
                <Input
                  value={editingModule.description}
                  onChange={(e) => setEditingModule({...editingModule, description: e.target.value})}
                  placeholder="הבנת הנקרא + האזנה"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">פרטים</label>
                <Textarea
                  value={editingModule.details}
                  onChange={(e) => setEditingModule({...editingModule, details: e.target.value})}
                  placeholder="70 נק׳ הבנת נקרא + 30 נק׳ האזנה"
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">משך (דקות)</label>
                  <Input
                    type="number"
                    value={editingModule.duration}
                    onChange={(e) => setEditingModule({...editingModule, duration: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">נקודות</label>
                  <Input
                    value={editingModule.points}
                    onChange={(e) => setEditingModule({...editingModule, points: e.target.value})}
                    placeholder="70 + 30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">סדר</label>
                  <Input
                    type="number"
                    value={editingModule.order}
                    onChange={(e) => setEditingModule({...editingModule, order: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">צבע (Tailwind Gradient)</label>
                <Input
                  value={editingModule.color}
                  onChange={(e) => setEditingModule({...editingModule, color: e.target.value})}
                  placeholder="from-blue-500 to-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">חלקים (JSON Array)</label>
                <Textarea
                  value={JSON.stringify(editingModule.parts || [], null, 2)}
                  onChange={(e) => {
                    try {
                      setEditingModule({...editingModule, parts: JSON.parse(e.target.value)});
                    } catch (err) {}
                  }}
                  placeholder='["Reading Comprehension", "Listening"]'
                  className="h-24 font-mono text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}