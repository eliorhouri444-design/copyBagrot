import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Bell, Plus, Save, Trash2, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminNotificationTemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [testUserEmail, setTestUserEmail] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => base44.entities.MessageTemplate.list()
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => base44.entities.NotificationLog.list('-created_date', 50)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['message-templates']);
      setShowEditDialog(false);
      setEditingTemplate(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MessageTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['message-templates']);
      setShowEditDialog(false);
      setEditingTemplate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['message-templates']);
    }
  });

  const testMutation = useMutation({
    mutationFn: async ({ email, templateId }) => {
      const response = await base44.functions.invoke('dailyNotificationCheck', {
        testMode: true,
        testUser: email,
        testTemplate: templateId
      });
      return response.data;
    }
  });

  const handleSave = () => {
    if (!editingTemplate.template_id || !editingTemplate.message_text) {
      alert("אנא מלא את כל השדות החובה");
      return;
    }

    if (editingTemplate.id) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: editingTemplate
      });
    } else {
      createMutation.mutate(editingTemplate);
    }
  };

  const handleTestSend = async (template) => {
    if (!testUserEmail) {
      alert("אנא הזן כתובת אימייל למשתמש בדיקה");
      return;
    }

    try {
      await testMutation.mutateAsync({
        email: testUserEmail,
        templateId: template.template_id
      });
      alert("הודעת בדיקה נשלחה בהצלחה!");
    } catch (error) {
      alert("שגיאה בשליחת הודעת הבדיקה: " + error.message);
    }
  };

  const defaultTemplates = [
    {
      template_id: "not_active_1d",
      title: "לא פעיל יום אחד",
      message_text: "היי 👋 לא למדת היום. רוצה להמשיך מהנקודה שעצרת?",
      send_push: true,
      send_whatsapp: false
    },
    {
      template_id: "not_active_3d",
      title: "לא פעיל 3 ימים",
      message_text: "אנחנו מחכים לך! עברו 3 ימים מאז שלמדת.",
      whatsapp_text: "אנחנו מחכים לך! עברו 3 ימים מאז שלמדת. לפתיחה מחדש: 🔗 [קישור]",
      send_push: false,
      send_whatsapp: true
    },
    {
      template_id: "completed_simulation",
      title: "השלמת סימולציה",
      message_text: "🔥 כל הכבוד! סיימת סימולציה. רוצה לעבור לנושא הבא?",
      send_push: true,
      send_whatsapp: false
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Profile"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-3 text-white">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ניהול תבניות הודעות</h1>
            <p className="text-sm text-white/90">עריכת הודעות אוטומטיות למשתמשים</p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">תבניות הודעות</h2>
          <Button
            onClick={() => {
              setEditingTemplate({
                template_id: "",
                title: "",
                message_text: "",
                whatsapp_text: "",
                send_push: true,
                send_whatsapp: false,
                is_active: true
              });
              setShowEditDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            הוסף תבנית חדשה
          </Button>
        </div>

        {templates.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">אין תבניות עדיין</h3>
            <p className="text-gray-600 mb-4">צור תבניות ברירת מחדל או הוסף תבנית חדשה</p>
            <Button
              onClick={async () => {
                for (const template of defaultTemplates) {
                  await base44.entities.MessageTemplate.create(template);
                }
                queryClient.invalidateQueries(['message-templates']);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              צור תבניות ברירת מחדל
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">{template.title}</h3>
                    {!template.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        לא פעיל
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">מזהה: {template.template_id}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowEditDialog(true);
                    }}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("האם למחוק תבנית זו?")) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-900 mb-1">הודעת Push:</div>
                  <div className="text-sm text-gray-700">{template.message_text}</div>
                </div>

                {template.whatsapp_text && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-900 mb-1">הודעת WhatsApp:</div>
                    <div className="text-sm text-gray-700">{template.whatsapp_text}</div>
                  </div>
                )}

                <div className="flex gap-3 text-xs">
                  <span className={`px-3 py-1 rounded-full ${template.send_push ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {template.send_push ? '✓' : '✗'} Push
                  </span>
                  <span className={`px-3 py-1 rounded-full ${template.send_whatsapp ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {template.send_whatsapp ? '✓' : '✗'} WhatsApp
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="אימייל למשתמש בדיקה"
                    value={testUserEmail}
                    onChange={(e) => setTestUserEmail(e.target.value)}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    onClick={() => handleTestSend(template)}
                    disabled={testMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                  >
                    שלח בדיקה
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            לוג הודעות אחרונות
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{log.user_email}</div>
                  <div className="text-xs text-gray-500">
                    {log.template_id} • {log.message_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    log.status === 'sent' ? 'bg-green-100 text-green-700' : 
                    log.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {log.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_date).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingTemplate?.id ? 'עריכת תבנית' : 'תבנית חדשה'}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  מזהה תבנית *
                </label>
                <Input
                  value={editingTemplate.template_id}
                  onChange={(e) => setEditingTemplate({...editingTemplate, template_id: e.target.value})}
                  placeholder="not_active_1d"
                  disabled={!!editingTemplate.id}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  כותרת *
                </label>
                <Input
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})}
                  placeholder="לא פעיל יום אחד"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תוכן הודעת Push *
                </label>
                <Textarea
                  value={editingTemplate.message_text}
                  onChange={(e) => setEditingTemplate({...editingTemplate, message_text: e.target.value})}
                  placeholder="היי 👋 לא למדת היום..."
                  className="h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תוכן הודעת WhatsApp (אופציונלי)
                </label>
                <Textarea
                  value={editingTemplate.whatsapp_text || ''}
                  onChange={(e) => setEditingTemplate({...editingTemplate, whatsapp_text: e.target.value})}
                  placeholder="הודעה שונה ל-WhatsApp..."
                  className="h-24"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.send_push}
                    onChange={(e) => setEditingTemplate({...editingTemplate, send_push: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">שלח Push</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.send_whatsapp}
                    onChange={(e) => setEditingTemplate({...editingTemplate, send_whatsapp: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">שלח WhatsApp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.is_active}
                    onChange={(e) => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">פעיל</span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}