# 🤝 SymptoSense Team Integration Guide

This guide ensures any teammate can plug the `AIQuestionEngine` into their part of the app within minutes.

## 🧠 Flow Explanation
The system follows a context-aware hybrid flow:
**User Input** → **Language Selection** → **AI/Fallback Questions** → **Voice Feedback (TTS)** → **Structured JSON** → **Risk Engine (/api/analyze)** → **Urgency & Recommendation UI**

---

## 🔌 Integration Steps (Very Simple)

### Step 1: Import Component
```tsx
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";
```

### Step 2: Use in your Page
```tsx
<AIQuestionEngine
  initialSymptom="fever"
  defaultLanguage="en"
  onComplete={(data) => {
    // Pass output to the scoring engine
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => console.log("Risk Analysis:", result));
  }}
/>
```

---

## 📤 Output Format
The `onComplete` callback returns a canonical JSON object:
```json
{
  "symptom": "fever",
  "severity": "severe",
  "duration": "3 days",
  "additionalSymptoms": ["chills"],
  "language": "en"
}
```

---

## 🎙️ Voice Flow
1. **TTS Automation**: The AI automatically speaks the question + all options when a step loads.
2. **User Response**: The user can **click** a tile or **speak** their answer.
3. **STT Matching**: Spoken input is cleaned, translated (if Hindi), and matched to the closest option.
4. **Retry Loop**: If voice recognition fails or doesn't match, the AI speaks a helpful retry prompt.

---

## 🌐 Language Support
- **Full Support**: English, Hindi, and Hinglish.
- **Dynamic Switch**: Users can switch languages mid-flow; TTS and STT will adjust instantly.
- **Normalizer**: Hindi inputs are normalized to English keys before being sent to the scoring engine.

---

## 🔁 Fallback Logic
The system is built to be resilient (Offline-Ready):
- **Questions**: If `/api/question-gen` fails, it falls back to the deterministic tree in `questionFlow.ts`.
- **Speech (TTS/STT)**: If the Sarvam API is unavailable, the system automatically falls back to browser-native Web Speech APIs.

---

## ⚠️ Rules
- **No Diagnosis**: AI only controls question generation. It does **NOT** decide urgency or score.
- **Logic Separation**: Component = Interaction only. Keeping scoring deterministic ensures medical safety.

---

## 🧪 Testing
Use the dedicated audit page: `/test-integration`
- **Verify Voice**: Ensure TTS is audible and STT matches "Number 1" or labels.
- **Verify Hindi**: Toggle to Hindi and confirm questions are translated.
- **Verify JSON**: Confirm the final console output matches the contract.
