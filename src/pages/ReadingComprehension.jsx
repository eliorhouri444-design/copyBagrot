import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, BookOpen, ChevronLeft, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ReadingComprehensionPage() {
  const navigate = useNavigate();
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        const subject = user?.selected_subject || 'אנגלית';
        const units = user?.selected_units || 3;

        const allTexts = await base44.entities.ReadingComprehensionText.filter({
          unit_level: units,
          is_active: true
        });

        // In a real scenario, we would also fetch progress to show which texts are done
        // For now, simple list
        setTexts(allTexts);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-green-50 p-6">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("Practice"))}>
          <ChevronLeft />
        </Button>
        <h1 className="text-xl font-bold text-green-900">הבנת הנקרא</h1>
        <FileText className="text-green-600" />
      </div>

      <div className="grid gap-4">
        {texts.map((text, i) => (
          <div 
            key={text.id || i}
            onClick={() => navigate(`${createPageUrl("ReadingPractice")}?textId=${text.id}`)}
            className="bg-white p-5 rounded-xl shadow-sm border border-green-100 cursor-pointer hover:border-green-300 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{text.title}</h3>
                <p className="text-sm text-gray-500">{text.test_module ? `שאלון ${text.test_module}` : ''}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        ))}
        {texts.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            לא נמצאו קטעי קריאה לרמה זו.
          </div>
        )}
      </div>
    </div>
  );
}