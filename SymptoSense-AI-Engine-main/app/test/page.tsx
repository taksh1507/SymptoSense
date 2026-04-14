// /test page — independent module testing panel
// Tests each module in isolation without the full engine

"use client";

import { useState } from "react";
import { useSarvamTTS } from "@/components/ai-question-engine/useSarvamTTS";
import { useSarvamSTT } from "@/components/ai-question-engine/useSarvamSTT";
import { useSarvamTranslate } from "@/components/ai-question-engine/useSarvamTranslate";
import { getNextQuestion, getTotalSteps, buildFinalOutput } from "@/components/ai-question-engine/questionFlow";
import { matchVoiceToOption } from "@/utils/matchVoiceInput";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <h2 className="text-white font-bold text-lg">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

export default function TestPage() {
  // ---- TTS test ----
  const { speak, stop, isSpeaking, error: ttsError } = useSarvamTTS();
  const [ttsLang, setTtsLang] = useState<"en" | "hi">("en");
  const ttsText = ttsLang === "en" ? "How severe is your fever right now?" : "अभी आपका बुखार कितना तेज़ है?";

  // ---- STT test ----
  const { startRecording, stopRecording, isRecording, transcript, error: sttError } = useSarvamSTT();

  // ---- Translate test ----
  const { translate, isTranslating, error: translateError } = useSarvamTranslate();
  const [translated, setTranslated] = useState("");

  // ---- Question flow test ----
  const [symptom, setSymptom] = useState("fever");
  const [step, setStep] = useState(0);
  const question = getNextQuestion(step, symptom);
  const total = getTotalSteps(symptom);

  // ---- Voice match test ----
  const [voiceInput, setVoiceInput] = useState("moderate pain");
  const matchResult = question ? matchVoiceToOption(voiceInput, question, "en") : null;

  // ---- Final output test ----
  const sampleAnswers = { severity: "moderate", duration: "1-3 days", additional: "chills", history: "none" };
  const finalOutput = buildFinalOutput(symptom, sampleAnswers, "en");

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12 space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">🧪 Module Test Page</h1>
        <p className="text-white/50 mt-1 text-sm">Each module tested independently — no engine wiring needed</p>
      </div>

      {/* Module 1: Types — static check */}
      <SectionCard title="Module 1 — types.ts">
        <p className="text-white/60 text-sm">Pure TypeScript — verified at compile time. If this page loads without TS errors, types are correct.</p>
        <Badge label="Language union" ok={true} />
        <Badge label="QuestionStep interface" ok={true} />
        <Badge label="EngineProps interface" ok={true} />
        <Badge label="Sarvam payload types" ok={true} />
      </SectionCard>

      {/* Module 2: Question Flow */}
      <SectionCard title="Module 2 — questionFlow.ts">
        <div className="flex gap-2 flex-wrap">
          {["fever", "headache", "cough", "fatigue"].map((s) => (
            <button key={s} id={`test-symptom-${s}`}
              onClick={() => { setSymptom(s); setStep(0); }}
              className={`px-3 py-1 rounded-full text-sm capitalize ${symptom === s ? "bg-indigo-600 text-white" : "bg-white/10 text-white/70"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="text-white/50 text-sm">Step {step + 1} / {total}</div>
        {question && (
          <div className="bg-gray-900 p-4 rounded-xl text-sm">
            <p className="text-white font-medium">{question.question.en}</p>
            <p className="text-indigo-300 mt-1">{question.question.hi}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map(o => (
                <span key={o.value} className="bg-white/10 text-white/70 px-2 py-1 rounded text-xs">{o.value}</span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button id="test-prev-step" onClick={() => setStep(Math.max(0, step - 1))}
            className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20">← Prev</button>
          <button id="test-next-step" onClick={() => setStep(Math.min(total - 1, step + 1))}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500">Next →</button>
        </div>
      </SectionCard>

      {/* Module 3: TTS */}
      <SectionCard title="Module 3 — useSarvamTTS">
        <div className="flex gap-2">
          <button id="test-tts-en" onClick={() => setTtsLang("en")}
            className={`px-3 py-1 rounded-full text-sm ${ttsLang === "en" ? "bg-indigo-600 text-white" : "bg-white/10 text-white/70"}`}>English</button>
          <button id="test-tts-hi" onClick={() => setTtsLang("hi")}
            className={`px-3 py-1 rounded-full text-sm ${ttsLang === "hi" ? "bg-indigo-600 text-white" : "bg-white/10 text-white/70"}`}>Hindi</button>
        </div>
        <p className="text-white/60 text-sm font-mono bg-gray-900 p-3 rounded-lg">{ttsText}</p>
        <div className="flex gap-3">
          <button id="test-tts-speak" onClick={() => speak(ttsText, ttsLang)} disabled={isSpeaking}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-50">
            {isSpeaking ? "🔊 Speaking…" : "🔊 Speak"}
          </button>
          <button id="test-tts-stop" onClick={stop}
            className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20">Stop</button>
        </div>
        {ttsError && <p className="text-amber-400 text-xs">{ttsError}</p>}
      </SectionCard>

      {/* Module 4: STT */}
      <SectionCard title="Module 4 — useSarvamSTT">
        <div className="flex gap-3">
          <button id="test-stt-toggle"
            onClick={async () => {
              if (isRecording) {
                await stopRecording();
              } else {
                await startRecording("en");
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}>
            {isRecording ? "⏹ Stop & Transcribe" : "🎤 Start Recording"}
          </button>
        </div>
        {transcript && (
          <div className="bg-gray-900 p-3 rounded-lg">
            <p className="text-emerald-300 text-sm font-mono">Transcript: "{transcript}"</p>
          </div>
        )}
        {sttError && <p className="text-amber-400 text-xs">{sttError}</p>}
      </SectionCard>

      {/* Module 5: Translate */}
      <SectionCard title="Module 5 — useSarvamTranslate">
        <button id="test-translate"
          onClick={async () => {
            const result = await translate("How severe is your fever?", "en", "hi");
            setTranslated(result);
          }}
          disabled={isTranslating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-50">
          {isTranslating ? "Translating…" : "🌐 Translate EN → HI"}
        </button>
        {translated && (
          <div className="bg-gray-900 p-3 rounded-lg">
            <p className="text-indigo-300 text-sm font-mono">{translated}</p>
          </div>
        )}
        {translateError && <p className="text-amber-400 text-xs">{translateError}</p>}
      </SectionCard>

      {/* Voice match test */}
      <SectionCard title="Voice Match (matchVoiceToOption — utils/matchVoiceInput)">
        <input
          id="test-voice-input"
          value={voiceInput}
          onChange={(e) => setVoiceInput(e.target.value)}
          className="w-full bg-gray-900 text-white border border-white/20 rounded-lg px-4 py-2 text-sm"
          placeholder="Type a voice transcript..."
        />
        <div className="text-sm">
          {matchResult ? (
            <span className="text-emerald-300">✓ Matched: <code className="font-mono">{matchResult}</code></span>
          ) : (
            <span className="text-amber-400">No match found — user would retry</span>
          )}
        </div>
      </SectionCard>

      {/* Final output test */}
      <SectionCard title="buildFinalOutput() — Module 2">
        <pre className="bg-gray-900 text-emerald-300 text-sm font-mono p-4 rounded-xl overflow-auto">
          {JSON.stringify(finalOutput, null, 2)}
        </pre>
      </SectionCard>
    </main>
  );
}
