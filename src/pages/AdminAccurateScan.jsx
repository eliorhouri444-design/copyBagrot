import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Play, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminAccurateScan() {
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState(5);
  const [year, setYear] = useState(2025);
  const [season, setSeason] = useState("summer");
  const [moduleSymbol, setModuleSymbol] = useState("");

  const [examFileUrl, setExamFileUrl] = useState("");
  const [solutionFileUrl, setSolutionFileUrl] = useState("");
  const [imageUrls, setImageUrls] = useState([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleUpload = async (file, setter) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setter(file_url);
  };

  const handleImagesUpload = async (files) => {
    const urls = [];
    for (const f of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      urls.push(file_url);
    }
    setImageUrls(urls);
  };

  const runScan = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        subject: subject.trim(),
        unit: Number(unit),
        year: Number(year) || undefined,
        season,
        module_symbol: moduleSymbol || undefined,
        exam_pdf_url: examFileUrl || undefined,
        solution_pdf_url: solutionFileUrl || undefined,
        image_urls: imageUrls?.length ? imageUrls : undefined
      };

      const { data } = await base44.functions.invoke("slowAccurateExamScan", payload);
      setResult(data);
      if (!data?.success) {
        setError(data?.error || "שגיאה כללית")
      }
    } catch (e) {
      setError(e?.message || "שגיאה לא צפויה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 sm:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">סורק חדש – איטי ומדויק</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">מקצוע</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="לדוגמה: מתמטיקה" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">רמת יחידות</label>
              <Select value={String(unit)} onValueChange={(v) => setUnit(Number(v))}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">שנה (אופציונלי)</label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">מועד</label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="winter">חורף</SelectItem>
                  <SelectItem value="summer">קיץ</SelectItem>
                  <SelectItem value="special">מיוחד</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סמל שאלון (אופציונלי)</label>
              <Input value={moduleSymbol} onChange={(e) => setModuleSymbol(e.target.value)} placeholder="581 / E / G" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">קובץ בחינה (PDF)</label>
              <div className="flex items-center gap-2">
                <input type="file" accept="application/pdf" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleUpload(f, setExamFileUrl); }} />
                {examFileUrl && <a className="text-blue-600 underline" href={examFileUrl} target="_blank" rel="noreferrer">צפה</a>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">קובץ פתרון (PDF, אופציונלי)</label>
              <div className="flex items-center gap-2">
                <input type="file" accept="application/pdf" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleUpload(f, setSolutionFileUrl); }} />
                {solutionFileUrl && <a className="text-green-600 underline" href={solutionFileUrl} target="_blank" rel="noreferrer">צפה</a>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">או העלאת תמונות (ריבוי תמונות נתמך)</label>
            <input type="file" accept="image/*" multiple onChange={async (e) => { const files = Array.from(e.target.files || []); if (files.length) await handleImagesUpload(files); }} />
            {imageUrls?.length ? (
              <Textarea readOnly className="mt-2 h-24 text-xs" value={imageUrls.join("\n")} />
            ) : null}
          </div>

          <div className="flex gap-3">
            <Button onClick={runScan} disabled={busy || !subject || !unit || (!examFileUrl && imageUrls.length === 0)} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              הרץ סריקה מדויקת
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">תוצאה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.success ? (
              <div className="flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 className="w-4 h-4" />הסריקה הצליחה</div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />נכשלה: {result.error}</div>
            )}

            {Array.isArray(result.stages) && (
              <div>
                <div className="text-sm font-medium mb-1">שלבים:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.stages.map((s, idx) => (
                    <div key={idx} className="text-xs border rounded p-2">
                      <div><strong>שלב:</strong> {s.stage}</div>
                      {s.status && <div><strong>מצב:</strong> {s.status}</div>}
                      {s.count != null && <div><strong>נמצא:</strong> {s.count}</div>}
                      {s.exam_id && <div><strong>Exam ID:</strong> {s.exam_id}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.exam && (
              <div className="text-sm">
                <div className="mb-1"><strong>כותרת:</strong> {result.exam.title}</div>
                <div className="mb-1"><strong>כמות שאלות:</strong> {result.exam.questions?.length || 0}</div>
                <div className="flex gap-2 mt-2">
                  {result.exam.exam_file_url && <a className="text-blue-600 underline" href={result.exam.exam_file_url} target="_blank" rel="noreferrer">בחינה</a>}
                  {result.exam.solution_file_url && <a className="text-green-600 underline" href={result.exam.solution_file_url} target="_blank" rel="noreferrer">פתרון</a>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}