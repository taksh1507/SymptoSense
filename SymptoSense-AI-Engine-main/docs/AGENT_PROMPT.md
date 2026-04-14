# 🤖 SymptoSense Agent Integration Prompt

**Objective**: Integrate the `AIQuestionEngine` into any frontend health application.

---

### 🎯 PURPOSE
Collect high-context health data from users via a voice-first, multilingual, AI-enhanced survey.

---

### 🔌 USAGE
```tsx
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";

<AIQuestionEngine
  initialSymptom="fever"
  defaultLanguage="en"
  onComplete={(data) => handleAssessmentData(data)}
/>
```

---

### 📤 OUTPUT
Returns a structured JSON object. Trigger a POST request to `/api/analyze` with this data to get risk scores and urgency recommendations.

---

### 🎙️ FEATURES
- **Conversational Voice**: Full TTS/STT loop in English/Hindi.
- **Dynamic Questions**: Gemini-driven follow-ups.
- **Resilient**: Works even if AI APIs fail (Hybrid Fallback).

---

### ⚠️ RULES for AGENTS
- **Isolation**: Only interact via Props (`initialSymptom`, `onComplete`).
- **Separation**: Do NOT modify internal scoring or question logic inside the component.
- **Safe Mode**: AI only handles data collection; deterministic rules handle diagnosis.

---

### 🔁 EXTENSION
- To customize the UI: Visit `AIQuestionEngine.tsx`.
- To modify flow: Update `services/questionService.ts`.
- To extend languages: Update `types.ts` and Sarvam hooks.
