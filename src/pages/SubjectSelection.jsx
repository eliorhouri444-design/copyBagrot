import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Calculator, FlaskConical, Globe, Languages, History, Check, ChevronDown, Atom, TestTube, Dna, BookMarked, Landmark, MapPin, Scale, ScrollText, Beaker, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const subjects = [
{ name: "אנגלית", icon: Languages, color: "from-blue-500 to-blue-600", units: [3, 4, 5], isLocked: false },
{ name: "מתמטיקה", icon: Calculator, color: "from-purple-500 to-purple-600", units: [3, 4, 5], isLocked: false },
{ name: "פיזיקה", icon: Atom, color: "from-green-500 to-emerald-600", units: [5], isLocked: true },
{ name: "כימיה", icon: FlaskConical, color: "from-orange-500 to-orange-600", units: [5], isLocked: true },
{ name: "ביולוגיה", icon: Dna, color: "from-teal-500 to-teal-600", units: [5], isLocked: true },
{ name: "ספרות", icon: BookMarked, color: "from-pink-500 to-fuchsia-600", units: [2, 5], isLocked: true },
{ name: "היסטוריה", icon: Landmark, color: "from-amber-500 to-yellow-600", units: [2, 5], isLocked: true },
{ name: "גאוגרפיה", icon: MapPin, color: "from-cyan-500 to-sky-600", units: [5], isLocked: true },
{ name: "אזרחות", icon: Scale, color: "from-indigo-500 to-violet-600", units: [2], isLocked: true },
{ name: "תנ\"ך", icon: ScrollText, color: "from-rose-500 to-red-600", units: [2, 5], isLocked: true }];


export default function SubjectSelectionPage() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubjectClick = (subject) => {
    if (subject.isLocked) return;

    if (selectedSubject?.name === subject.name) {
      setSelectedSubject(null);
    } else {
      setSelectedSubject(subject);
    }
  };

  const handleUnitSelect = async (units) => {
    if (!selectedSubject) return;

    setIsLoading(true);
    try {
      await base44.auth.updateMe({
        selected_subject: selectedSubject.name,
        selected_units: units,
        subject_selected: true
      });

      // שמירת הנתונים ב-localStorage
      localStorage.setItem('selected_subject', selectedSubject.name);
      localStorage.setItem('selected_units', units.toString());

      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error saving subject selection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-gray-900 mb-2 text-3xl font-bold">לאיזו בגרות אתה רוצה להתכונן?

          </h1>
          <p className="text-gray-600">בחר מקצוע ומספר יחידות</p>
        </div>

        {/* Subjects List */}
        <div className="space-y-4">
          {subjects.map((subject, index) => {
            const Icon = subject.icon;
            const isOpen = selectedSubject?.name === subject.name;

            return (
              <div key={index} className="bg-white rounded-2xl shadow-md overflow-hidden">
                {/* Subject Button */}
                <motion.button
                  whileTap={subject.isLocked ? {} : { scale: 0.98 }}
                  onClick={() => handleSubjectClick(subject)} className="bg-[#14a5ff] p-6 opacity-100 w-full transition-all from-blue-500 to-blue-600">








                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-[#008ee6] rounded-xl w-14 h-14 flex items-center justify-center from-purple-500 to-purple-600">






                        {subject.isLocked ?
                        <Lock className="w-7 h-7 text-gray-600" /> :

                        <Icon className={`w-7 h-7 ${isOpen ? 'text-white' : 'text-white'}`} />
                        }
                      </div>
                      
                      <div className="text-right">
                        <h3 className="text-[#ffffff] text-xl font-bold">






                          {subject.name}
                        </h3>
                        {subject.isLocked &&
                        <p className="text-sm text-gray-500">בקרוב</p>
                        }
                      </div>
                    </div>
                    
                    {!subject.isLocked &&
                    <ChevronDown
                      className={`w-6 h-6 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-white' : 'text-gray-400'}`
                      } />

                    }
                  </div>
                </motion.button>

                {/* Units Selection (Expandable) */}
                <AnimatePresence>
                  {isOpen &&
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden">

                      <div className="p-6 bg-gray-50 border-t border-gray-100">
                        <p className="text-center text-gray-600 font-medium mb-4">
                          בחר כמה יחידות
                        </p>
                        
                        <div className="space-y-3">
                          {subject.units.map((units) =>
                        <motion.button
                          key={units}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleUnitSelect(units)}
                          disabled={isLoading} className="bg-[#14a5ff] text-white text-lg font-bold rounded-xl w-full h-14 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 from-purple-500 to-purple-600 hover:shadow-lg">


                              {isLoading ?
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> :

                          <>
                                  <Check className="w-5 h-5" />
                                  {units} יחידות
                                </>
                          }
                            </motion.button>
                        )}
                        </div>
                      </div>
                    </motion.div>
                  }
                </AnimatePresence>
              </div>);

          })}
        </div>
      </div>
    </div>);

}