import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, ExternalLink, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function AdminBagrutImport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeImport, setActiveImport] = useState(null);

  const [foundExams, setFoundExams] = useState([]);
  const [viewMode, setViewMode] = useState('table');

  const [isScanning, setIsScanning] = useState(false);
  const [selectedModule, setSelectedModule] = useState("801");

  const modulesList = React.useMemo(() => {
    const set = new Set(foundExams.map(e => String(e.module)));
    return Array.from(set).sort();
  }, [foundExams]);

  const sessionRows = React.useMemo(() => {
    const map = new Map();
    foundExams.forEach(e => {
      const key = `${e.year}-${e.season}-${e.term}`;
      if (!map.has(key)) map.set(key, { year: e.year, season: e.season, term: e.term, items: {} });
      map.get(key).items[String(e.module)] = e;
    });
    const seasonOrder = { winter: 0, summer: 1 };
    const termOrder = { a: 0, b: 1 };
    return Array.from(map.values()).sort((a,b)=> (b.year - a.year) || (seasonOrder[a.season]-seasonOrder[b.season]) || (termOrder[a.term]-termOrder[b.term]));
  }, [foundExams]);

  const modules = [
    { id: "471", label: "471 - תוכנית חדשה 4 יח\"ל" },
    { id: "472", label: "472 - תוכנית חדשה 4 יח\"ל" },
    { id: "571", label: "571 - תוכנית חדשה 5 יח\"ל" },
    { id: "572", label: "572 - תוכנית חדשה 5 יח\"ל" },
    { id: "581", label: "581 (806) - 5 יח\"ל ישנה" },
    { id: "582", label: "582 (807) - 5 יח\"ל ישנה" },
    { id: "481", label: "481 (804) - 4 יח\"ל ישנה" },
    { id: "482", label: "482 (805) - 4 יח\"ל ישנה" },
    { id: "381", label: "381 (802) - 3 יח\"ל ישנה" },
    { id: "382", label: "382 (803) - 3 יח\"ל ישנה" },
    { id: "801", label: "801 - תכנית ישנה 3 יח\"ל" },
    { id: "802", label: "802 - תכנית ישנה 3 יח\"ל" },
    { id: "803", label: "803 - תכנית ישנה 3 יח\"ל" },
    { id: "804", label: "804 - תכנית ישנה 4 יח\"ל" },
    { id: "805", label: "805 - תכנית ישנה 4 יח\"ל" },
    { id: "806", label: "806 - תכנית ישנה 5 יח\"ל" },
    { id: "807", label: "807 - תכנית ישנה 5 יח\"ל" }
  ];

  const handleScanWebsite = async () => {
    setIsScanning(true);
    setFoundExams([]);
    try {
      const res = await base44.functions.invoke('scanBagrutOnline', {
        page_url: 'https://www.bagrutonline.co.il/page/108/%D7%91%D7%92%D7%A8%D7%95%D7%AA-%D7%91%D7%9E%D7%AA%D7%9E%D7%98%D7%99%D7%A7%D7%94-%D7%9B%D7%9C-%D7%94%D7%A9%D7%90%D7%9C%D7%95%D7%A0%D7%99%D7%9D-%D7%95%D7%9B%D7%9C-%D7%94%D7%A4%D7%AA%D7%A8%D7%95%D7%A0%D7%95%D7%AA-%D7%9E%D7%9B%D7%9C-%D7%94%D7%A9%D7%A0%D7%99%D7%9D---%D7%91%D7%92%D7%A8%D7%95%D7%AA-%D7%90%D7%95%D7%A0%D7%9C%D7%99%D7%99.aspx',
        start_year: 2010,
        start_season: 'winter',
        start_term: 'a',
        end_year: new Date().getFullYear(),
        end_season: 'summer',
        end_term: 'b'
      });
      if (res.data.success && res.data.exams) {
        setFoundExams(res.data.exams);
        alert(`נסרקו ${res.data.exams.length} פריטים מטבלת האתר (כל המודולים והיחידות הזמינים).`);
      } else {
        alert('לא נמצאו בגרויות בסריקה או שאירעה שגיאה.');
      }
    } catch (e) {
      console.error('Scan error:', e);
      alert('שגיאה בסריקת האתר: ' + e.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async (exam) => {
    if (!exam.examUrl) {
      alert("נא להזין קישור לשאלון");
      return;
    }

    setActiveImport(exam.id);
    setLoading(true);

    try {
      // Determine module_symbol if not present (from scan or user input)
      // Usually scan provides it as 'module'
      const moduleSymbol = exam.module || selectedModule;

      const response = await base44.functions.invoke('processRealBagrut', {
        exam_pdf_url: exam.examUrl,
        solution_pdf_url: exam.solutionUrl,
        solution_part_urls: exam.solutionParts || [],
        subject: "מתמטיקה",
        unit: moduleSymbol.startsWith("5") ? 5 : (moduleSymbol.startsWith("4") ? 4 : 3),
        year: exam.year,
        season: exam.season,
        term: exam.term || 'a',
        module_symbol: moduleSymbol
      });

      if (response.data.success) {
        setFoundExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: 'done' } : e));
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Import error:", error);
      setFoundExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: 'error', error: error.message } : e));
      alert(`שגיאה בייבוא ${exam.title}: ` + error.message);
    } finally {
      setLoading(false);
      setActiveImport(null);
    }
  };

  const updateUrl = (id, field, value) => {
    setFoundExams(prev => prev.map(e => e.id === id ? { ...e, [field]: value, status: 'ready' } : e));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ייבוא בגרויות מ-BagrutOnline</h1>
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminExams'))}>
            חזרה לניהול בגרויות
          </Button>
        </div>

        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">ייבוא אוטומטי מ-BagrutOnline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>בחר שאלון לסריקה:</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <Button 
                onClick={handleScanWebsite} 
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Download className="w-4 h-4 ml-2" />}
                סרוק ומצא בגרויות
              </Button>
            </div>
            
            <p className="text-blue-900 mt-4 text-sm">
              המערכת תסרוק את אתר BagrutOnline, תנתח את טבלת הבגרויות, ותאתר קישורי PDF לשאלון ולפתרונות (כולל איחוד פתרונות המופיעים בחלקים).
            </p>
          </CardContent>
        </Card>

        {foundExams.length > 0 && (
          <div className="flex items-center justify-end mb-4 gap-2">
            <Button variant={viewMode==='table'?'default':'outline'} onClick={()=>setViewMode('table')}>תצוגת טבלה</Button>
            <Button variant={viewMode==='list'?'default':'outline'} onClick={()=>setViewMode('list')}>תצוגת כרטיסים</Button>
          </div>
        )}

        {viewMode === 'table' && foundExams.length > 0 ? (
          <div className="overflow-auto bg-white rounded-xl border">
            <table className="min-w-full text-right">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-3 py-2 text-sm font-bold text-blue-900 sticky right-0 bg-blue-50">מועד/שנה</th>
                  {modulesList.map(m => (
                    <th key={m} className="px-3 py-2 text-sm font-bold text-blue-900">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessionRows.map(row => (
                  <tr key={`${row.year}-${row.season}-${row.term}`} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap sticky right-0 bg-white">
                      {row.season==='winter'?'חורף':'קיץ'}{row.season==='summer' ? (row.term==='b'?' (ב)':' (א)') : ''} {row.year}
                    </td>
                    {modulesList.map(m => {
                      const e = row.items[m];
                      return (
                        <td key={m} className="px-3 py-2 align-top">
                          {e ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                {e.examUrl ? <a href={e.examUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">שאלון</a> : <span className="text-gray-400">אין שאלון</span>}
                                {Array.isArray(e.solutionParts) && e.solutionParts.length>0 && (
                                  <span className="text-gray-600">• פתרון {e.solutionParts.length} חלקים</span>
                                )}
                              </div>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={!e.examUrl} onClick={()=>handleImport(e)}>ייבא</Button>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
          {foundExams.map((exam) => (
            <Card key={exam.id} className={`border-2 ${exam.status === 'done' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${exam.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {exam.status === 'done' ? <CheckCircle className="w-6 h-6" /> : <Download className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500">שנה: {exam.year} • עונה: {exam.season === 'winter' ? 'חורף' : 'קיץ'} • שאלון: {exam.module}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>קישור לשאלון (PDF)</Label>
                        <Input 
                          dir="ltr"
                          value={exam.examUrl} 
                          onChange={(e) => updateUrl(exam.id, 'examUrl', e.target.value)}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>קישור לפתרון (PDF)</Label>
                        <Input 
                          dir="ltr"
                          value={exam.solutionUrl}
                          onChange={(e) => updateUrl(exam.id, 'solutionUrl', e.target.value)}
                          placeholder="https://... (אפשר להשאיר ריק אם יש solutionParts)"
                          className="mt-1"
                        />
                        {Array.isArray(exam.solutionParts) && exam.solutionParts.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            נמצאו {exam.solutionParts.length} חלקי פתרון מהאתר. יאוחדו אוטומטית בעת העיבוד.
                          </div>
                        )}
                      </div>
                    </div>

                    {exam.status === 'error' && (
                      <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
                        שגיאה: {exam.error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center">
                    {exam.status === 'done' ? (
                      <Button disabled className="bg-green-600 text-white">
                        יובא בהצלחה
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleImport(exam)} 
                        disabled={loading || activeImport === exam.id || !exam.examUrl}
                        className="bg-blue-600 hover:bg-blue-700 w-32"
                      >
                        {activeImport === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "ייבא למערכת"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
          )}
          </div>
    </div>
  );
}