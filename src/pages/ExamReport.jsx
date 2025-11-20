import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowRight, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExamReportCard from "@/components/exams/ExamReportCard";

export default function ExamReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const reportId = params.get('reportId');
        
        if (reportId) {
          const reportData = await base44.entities.ExamReport.get(reportId);
          setReport(reportData);
        } else {
          // If no reportId, maybe get the latest
          const reports = await base44.entities.ExamReport.list("-created_date", 1);
          if (reports.length > 0) {
            setReport(reports[0]);
          }
        }
      } catch (error) {
        console.error("Error loading report:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [location]);

  const handleStartPractice = (topics) => {
    // Navigate to practice with specific topics
    const topicsQuery = topics.join(',');
    navigate(createPageUrl("WeakTopics") + `?topics=${topicsQuery}`);
  };

  const handleViewDetails = () => {
    // Navigate to detailed view
    navigate(createPageUrl("Statistics"));
  };

  const handleDownloadReport = () => {
    // Generate PDF or share report
    alert("הורדת דוח - בקרוב!");
  };

  const handleShareReport = () => {
    // Share report via social media or email
    alert("שיתוף דוח - בקרוב!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען דוח...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">אין דוח זמין</h2>
          <p className="text-gray-600 mb-6">לא נמצא דוח עבור המבחן הזה</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))}>
            חזרה למבחנים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-white">דוח מבחן</h1>
            <p className="text-sm text-white/90">{report.subject} • {report.unit_level} יחידות</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadReport}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleShareReport}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Report Card */}
      <div className="px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ExamReportCard
            report={report}
            onStartPractice={handleStartPractice}
            onViewDetails={handleViewDetails}
          />
        </motion.div>
      </div>
    </div>
  );
}