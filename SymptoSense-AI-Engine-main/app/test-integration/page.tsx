"use client";

import { useState } from "react";
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";
import { useSarvamTranslate } from "@/components/ai-question-engine/useSarvamTranslate";
import { useSarvamTTS } from "@/components/ai-question-engine/useSarvamTTS";
import type { RiskAnalysis, FinalAssessmentPayload } from "@/components/ai-question-engine/types";

/**
 * PRODUCTION INTEGRATION TEST PAGE
 * Demonstrates the AIQuestionEngine as a plug-and-play module.
 */

export default function IntegrationTestPage() {
  const [activeSymptom, setActiveSymptom] = useState("fever");
  const [result, setResult] = useState<FinalAssessmentPayload | null>(null);
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [key, setKey] = useState(0);

  const { translate } = useSarvamTranslate();
  const { speak } = useSarvamTTS();

  const handleComplete = async (data: FinalAssessmentPayload) => {
    console.log("[IntegrationTest] Survey Complete! Final Data:", data);
    setResult(data);
    
    // Demonstrate connecting to the scoring API
    setIsAnalyzing(true);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!resp.ok) throw new Error("Analysis failed");
      const analysisData: RiskAnalysis = await resp.json();
      
      // Batch translate for Hindi users
      if (data.language === "hi") {
        const combined = [analysisData.narrative?.en || "", ...analysisData.explanation].join(" ||| ");
        const translatedArr = (await translate(combined, "en", "hi")).split(" ||| ");
        
        if (analysisData.narrative) analysisData.narrative.hi = translatedArr[0];
        analysisData.explanation = translatedArr.slice(1);
      }
      
      setAnalysis(analysisData);

      // Final voice summary
      const summaryMsg = `${data.language === 'en' ? 'Analysis complete.' : 'विश्लेषण पूरा हुआ।'} ${analysisData.recommendation[data.language as "en"|"hi"]}`;
      speak(summaryMsg, data.language as "en"|"hi");

    } catch (e) {
      console.error("[IntegrationTest] Scoring Error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetFlow = () => {
    setResult(null);
    setAnalysis(null);
    setKey(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-[#070710] text-gray-100 flex flex-col items-center py-20 px-4 font-sans">
      <div className="text-center mb-12 space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
          Module Integration Audit
        </h1>
        <p className="text-white/40 text-sm font-medium uppercase tracking-[0.2em]">
          Production Environment Test Laboratory
        </p>
      </div>

      {!result && (
        <div className="w-full flex flex-col items-center space-y-8 animate-in fade-in duration-500">
          {/* Symptom Picker for Testing */}
          <div className="flex flex-wrap justify-center gap-3">
            {["fever", "headache", "chest pain", "breathing difficulty", "fatigue"].map(s => (
              <button 
                key={s} 
                onClick={() => setActiveSymptom(s)}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                  activeSymptom === s ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <AIQuestionEngine 
            key={key}
            initialSymptom={activeSymptom} 
            defaultLanguage="en" 
            onComplete={handleComplete} 
          />
        </div>
      )}

      {(result || isAnalyzing) && (
        <div className="w-full max-w-2xl space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          <div className="p-8 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-xl font-black text-white">Integration Output</h2>
              <button onClick={resetFlow} className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300">
                Reset Audit
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/20">Raw Payload</span>
                <pre className="p-4 bg-black/40 rounded-xl border border-white/5 text-[10px] font-mono text-emerald-400 overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-3 py-4 text-indigo-400 font-bold">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" />
                  <span>Invoking Risk Scoring Engine...</span>
                </div>
              )}

              {analysis && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/20">AI Assessment</span>
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                      analysis.urgency === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {analysis.urgency} Urgency
                    </span>
                  </div>
                  <p className="text-white text-lg font-bold italic leading-relaxed">
                    "{analysis.narrative?.[result?.language === 'hi' ? 'hi' : 'en'] || analysis.narrative?.en}"
                  </p>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-white/80 text-sm leading-relaxed">
                      {analysis.recommendation[result?.language === 'hi' ? 'hi' : 'en']}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-20 text-center space-y-2 opacity-20">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">SymptoSense Production Audit v1.0.0</p>
        <p className="text-[9px] font-bold">Modular Question Engine + Gemini AI + Sarvam Voice</p>
      </footer>
    </main>
  );
}
