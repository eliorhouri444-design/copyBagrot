import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BookOpen, FileCheck, User, TrendingUp, Settings } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const isActiveExamSession = [
    'ExamMath', 
    'ExamPhysics', 
    'ExamLiterature', 
    'ExamGeneric',
    'ExamModuleA', 
    'ExamModuleB', 
    'ExamModuleC',
    'TopicPracticeNew',
    'ExtendedReading',
    'Onboarding',
    'SubjectSelection',
    'CustomWeakExam',
    'VocabularyFlashcards',
    'VocabularyQuickPractice',
    'VocabularyTraining',
    'VocabularyStrengthen'
  ].includes(currentPageName);
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
        setUser(null);
      }
    };
    loadUser();
  }, []);
  
  const navItems = [
    { name: "StudyPlan", icon: TrendingUp, path: createPageUrl("StudyPlan"), label: "התוכנית", color: "#EC4899" },
    { name: "Practice", icon: BookOpen, path: createPageUrl("Practice"), label: "תרגול", color: "#8B5CF6" },
    { name: "Home", icon: Home, path: createPageUrl("Home"), label: "בית", color: "#3B82F6" },
    { name: "Exams", icon: FileCheck, path: createPageUrl("Exams"), label: "בגרויות", color: "#10B981" },
    { name: "Profile", icon: User, path: createPageUrl("Profile"), label: "פרופיל", color: "#F59E0B" }
  ];

  const adminNavItems = user?.role === 'admin' ? [] : [];

  const allNavItems = [...navItems, ...adminNavItems];

  return (
    <div dir="rtl" className="min-h-screen bg-blue-100">
      <style>
        {`
          :root {
            --primary-blue: #3B82F6;
            --primary-blue-light: #60A5FA;
            --accent-blue: #93C5FD;
            --primary-purple: #8B5CF6;
            --primary-green: #10B981;
            --primary-orange: #F59E0B;
            --primary-yellow: #FACC15;
            --text-dark: #1F2937;
            --text-light: #6B7280;
            --bg-light: #F9FAFB;
            --border-light: #E5E7EB;
          }

          * {
            font-family: 'Segoe UI', 'Heebo', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* New Animation Classes */
          .animate-hover-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .animate-hover-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(59, 130, 246, 0.15);
          }

          @keyframes task-bounce {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.05); }
            50% { transform: scale(0.95); }
            75% { transform: scale(1.02); }
          }

          .animate-task-bounce {
            animation: task-bounce 0.6s ease-in-out;
          }

          @keyframes background-flow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .animate-background-flow {
            background-size: 200% 200%;
            animation: background-flow 15s ease infinite;
          }
          
          .base44-auth-container {
            direction: rtl !important;
          }
          
          .base44-auth-container * {
            direction: rtl !important;
            text-align: right !important;
          }
          
          .base44-auth-header h1,
          .base44-auth-header p,
          .base44-auth-social-button,
          .base44-auth-form label,
          .base44-auth-form button[type="submit"],
          .base44-auth-link,
          .base44-auth-divider {
            font-size: 0 !important;
            line-height: 0 !important;
          }
          
          .base44-auth-header h1::before {
            content: "ברוכים הבאים לבגרות פלוס" !important;
            font-size: 2rem !important;
            line-height: 1.2 !important;
            font-weight: 700 !important;
            background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            display: block !important;
          }
          
          .base44-auth-container[data-page="signup"] .base44-auth-header h1::before {
            content: "הצטרפו לבגרות פלוס" !important;
          }
          
          .base44-auth-container[data-page="forgot-password"] .base44-auth-header h1::before {
            content: "שחזור סיסמה" !important;
          }
          
          .base44-auth-header p::before {
            content: "המשך כדי להתחבר" !important;
            font-size: 0.95rem !important;
            color: #6B7280 !important;
            display: block !important;
          }
          
          .base44-auth-container[data-page="signup"] .base44-auth-header p::before {
            content: "צור חשבון חדש" !important;
          }
          
          .base44-auth-container[data-page="forgot-password"] .base44-auth-header p::before {
            content: "הזן את הדואר האלקטרוני שלך" !important;
          }
          
          .base44-auth-social-button {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.5rem !important;
          }
          
          .base44-auth-social-button span,
          .base44-auth-social-button::after {
            font-size: 0.95rem !important;
            font-weight: 500 !important;
            display: inline !important;
          }
          
          .base44-auth-social-button[data-provider="google"]::after {
            content: "המשך עם Google" !important;
          }
          
          .base44-auth-social-button[data-provider="facebook"]::after {
            content: "המשך עם Facebook" !important;
          }
          
          .base44-auth-form label::before {
            font-size: 0.875rem !important;
            font-weight: 500 !important;
            color: #374151 !important;
            display: block !important;
            margin-bottom: 0.5rem !important;
          }
          
          .base44-auth-form label[for="email"]::before {
            content: "דואר אלקטרוני" !important;
          }
          
          .base44-auth-form label[for="password"]::before {
            content: "סיסמה" !important;
          }
          
          .base44-auth-form label[for="full_name"]::before {
            content: "שם מלא" !important;
          }
          
          .base44-auth-form button[type="submit"] {
            background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%) !important;
            font-weight: 600 !important;
            height: 48px !important;
          }
          
          .base44-auth-container[data-page="login"] button[type="submit"]::after {
            content: "התחבר" !important;
          }
          
          .base44-auth-container[data-page="signup"] button[type="submit"]::after {
            content: "הרשמה" !important;
          }
          
          .base44-auth-container[data-page="forgot-password"] button[type="submit"]::after {
            content: "שלח קישור לשחזור" !important;
          }
          
          .base44-auth-link::after {
            font-size: 0.875rem !important;
            color: #3B82F6 !important;
            display: inline !important;
          }
          
          .base44-auth-container[data-page="login"] .base44-auth-link[href*="signup"]::after {
            content: "אין לך חשבון? הירשם כאן" !important;
          }
          
          .base44-auth-container[data-page="signup"] .base44-auth-link[href*="login"]::after {
            content: "יש לך חשבון? התחבר כאן" !important;
          }
          
          .base44-auth-container[data-page="login"] .base44-auth-link[href*="forgot"]::after {
            content: "שכחת סיסמה?" !important;
          }
          
          .base44-auth-container[data-page="forgot-password"] .base44-auth-link[href*="login"]::after {
            content: "חזרה להתחברות" !important;
          }
          
          .base44-auth-divider::before {
            content: "או" !important;
            font-size: 0.875rem !important;
            color: #9CA3AF !important;
            display: inline !important;
          }
        `}
      </style>
      
      <main className="min-h-screen">
        {children}
      </main>

      {!isActiveExamSession && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50 h-16">
          <div className="flex justify-around items-center h-full max-w-screen-xl mx-auto px-4">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                    isActive 
                      ? 'text-[#3B82F6]' 
                      : 'text-gray-500 hover:text-[#3B82F6]'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div 
                      className="absolute bottom-0 w-8 h-1 rounded-t-full bg-[#3B82F6]"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </ThemeProvider>
  );
}