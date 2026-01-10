import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";

export default function AdminKibinimatikaImport() {
  const [url, setUrl] = useState("https://kibinimatika.org/2019/12/12/%D7%A4%D7%AA%D7%A8%D7%95%D7%A0%D7%95%D7%AA-%D7%9E%D7%9C%D7%90%D7%99%D7%9D-%D7%9C%D7%91%D7%97%D7%99%D7%A0%D7%AA-%D7%94%D7%91%D7%92%D7%A8%D7%95%D7%AA-%D7%91%D7%9E%D7%AA%D7%9E%D7%98%D7%99%D7%A7%D7%94/");
  const [startYear, setStartYear] = useState(2025);
  const [endYear, setEndYear] = useState(2018);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState(null);

  const runImport = async () => {
    setRunning(true);
    setLog(null);
    try {
      const { data } = await base44.functions.invoke("importKibinimatika581", {
        url,
        start_year: Number(startYear),
        end_year: Number(endYear),
        dry_run: dryRun,
      });
      setLog(data);
    } catch (e) {
      setLog({ error: e?.message || String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">ייבוא Kibinimatika 581</h1>
        <Card className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">URL מקור</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">שנה התחלה</label>
              <Input type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">שנה סיום</label>
              <Input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="dry" type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            <label htmlFor="dry">הרצת בדיקה (ללא עיבוד)</label>
          </div>
          <Button onClick={runImport} disabled={running} className="bg-blue-600">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            הפעל
          </Button>
        </Card>

        {log && (
          <Card className="p-4">
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log, null, 2)}</pre>
          </Card>
        )}
      </div>
    </div>
  );
}