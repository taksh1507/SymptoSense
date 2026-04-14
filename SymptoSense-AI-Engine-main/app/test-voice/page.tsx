"use client";

import { useState, useEffect } from "react";
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";
import type { FinalAssessmentPayload } from "@/components/ai-question-engine/types";

export default function TestVoicePage() {
  const [completeData, setCompleteData] = useState<FinalAssessmentPayload | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("System Initialized");
  const [apiLogs, setApiLogs] = useState<{ type: string; status: string; timestamp: string }[]>([]);

  // Intercept fetch to log API statuses for the debug panel
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0].toString();
      const response = await originalFetch(...args);
      
      if (url.includes("/api/sarvam")) {
        const type = url.split("/").pop() || "unknown";
        setApiLogs(prev => [
          { type, status: response.status.toString(), timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 4)
        ]);
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const handleComplete = (data: FinalAssessmentPayload) => {
    setCompleteData(data);
    setLastEvent("Analysis Complete");
  };

  return (
    <main className="min-h-screen bg-[#030712] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Component Test Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AIQuestionEngine Test Bench
            </h1>
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              Target: Fever
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl p-1 border border-white/10 shadow-2xl">
            <AIQuestionEngine 
              initialSymptom="fever" 
              defaultLanguage="en" 
              onComplete={handleComplete} 
            />
          </div>

          {/* Real-time Event Log */}
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 font-mono text-xs">
            <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
              <span className="text-white/40 uppercase">Event Monitor</span>
              <span className="text-emerald-400 animate-pulse">● Live</span>
            </div>
            <div className="text-indigo-300">{`> ${lastEvent}`}</div>
          </div>
        </div>

        {/* RIGHT: Debug & Inspection Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. API Debugger */}
          <div className="bg-[#0f172a] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Debug Panel</h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase">Sarvam v2.5</span>
            </div>
            <div className="p-4 space-y-4">
              {/* API Status List */}
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 uppercase font-bold">Recent API Responses</p>
                {apiLogs.length === 0 ? (
                  <p className="text-xs text-white/20 italic">No network activity yet...</p>
                ) : (
                  apiLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-xs font-mono uppercase text-white/70">{log.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold ${log.status === '200' ? 'text-emerald-400' : 'text-red-400'}`}>
                          HTTP {log.status}
                        </span>
                        <span className="text-[9px] text-white/30 font-mono">{log.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Fallback Check */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">System Mode</span>
                  {apiLogs.some(l => l.status !== '200') ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      ⚠️ BROWSER FALLBACK
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      ✨ SARVAM ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Structured Output Preview */}
          <div className="bg-[#0f172a] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
             <div className="bg-white/5 px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Engine Output</h2>
            </div>
            <div className="p-4">
              {completeData ? (
                <pre className="bg-black/50 p-4 rounded-xl text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-emerald-500/10">
                  {JSON.stringify(completeData, null, 2)}
                </pre>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 animate-spin" />
                  <p className="text-xs text-white/40">Waiting for survey completion...</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Instructions */}
          <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
            <h3 className="text-xs font-bold text-indigo-300 uppercase mb-2">Test Instructions</h3>
            <ul className="text-[11px] text-white/60 space-y-2">
              <li className="flex gap-2"><span>1.</span><span>Select a language and wait for the AI to speak the question.</span></li>
              <li className="flex gap-2"><span>2.</span><span>Try both mouse clicks and the 🎤 <b>Microphone</b> button.</span></li>
              <li className="flex gap-2"><span>3.</span><span>Deny mic permission to test the <b>Automatic Fallback</b>.</span></li>
            </ul>
          </div>

        </div>
      </div>
    </main>
  );
}
