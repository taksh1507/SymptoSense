# AIQuestionEngine Developer Guide

A production-ready, plug-and-play AI-powered health assessment component. 

This component uses a hybrid approach:
- **Dynamic AI Follow-ups**: Powered by Gemini 1.5 Flash.
- **Deterministic Logic**: Base scoring, urgency, and clinical rules are handled by the local risk scoring engine (maintained by the host app).
- **Multilingual Voice**: Full STT/TTS support in English and Hindi via Sarvam AI.

---

## 🛠 Features

- **Voice-First Design**: Speak both questions and options. Supports voice selection by number or choice.
- **Dynamic Reasoning**: Questions adapt based on user symptoms and history.
- **Robust Fallback**: Automatically switches to a static deterministic flow if the AI API fails.
- **Persistable UX**: Global mute state persists across sessions.
- **Multilingual**: Native Hindi and Hinglish support with fuzzy matching and synonyms.

---

## 🚀 Setup Instructions

### 1. Environment Variables
Add the following to your `.env.local`:

```bash
# Sarvam AI (Voice & Translation)
SARVAM_API_KEY=your_sarvam_key_here
SARVAM_BASE_URL=https://api.sarvam.ai

# Google Gemini (Dynamic Question Generation)
GEMINI_API_KEY=your_gemini_key_here
```

### 2. Integration Example

Import the component and pass an `initialSymptom`. The engine will handle the full survey flow and return the result via `onComplete`.

```tsx
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";

export default function MyPage() {
  const handleComplete = (data) => {
    console.log("Structured Survey Data:", data);
    // Send to your backend risk engine here
  };

  return (
    <AIQuestionEngine
      initialSymptom="fever"
      defaultLanguage="en"
      onComplete={handleComplete}
    />
  );
}
```

---

## 🔌 API Contracts

### Props
| Prop | Type | Description |
| :--- | :--- | :--- |
| `initialSymptom` | `string` | **Required**. The symptom to start the assessment with. |
| `defaultLanguage`| `"en" \| "hi"` | Optional. Defaults to `"en"`. |
| `onComplete` | `(data) => void` | **Required**. Called with the final structured JSON. |

### Output JSON (onComplete)
```json
{
  "symptom": "fever",
  "severity": "severe",
  "duration": "> 3 days",
  "additional": "chills",
  "history": "heart_disease"
}
```

---

## 🎙️ Voice System Details

- **TTS Pacing**: Strips emojis and numbering from labels to ensure clinical sounding voice prompts. Use the `speech` field in `QuestionOption` for custom overrides.
- **STT Matching**:
    - **Exact Match**: 100% confidence.
    - **Partial/Numeric Match**: Matches "Number 1" or "Ek" (Hindi) to the first option.
    - **Fuzzy Match**: Basic word overlap and similarity scoring (60% threshold).
    - **Rejection Flow**: If confidence is too low, the AI triggers a verbal retry prompt.

---

## 🔀 Fallback Behavior

1. **AI Failure**: The `QuestionService` monitors the `/api/question-gen` endpoint. If it times out (>3s) or fails, it switches to the static local survey tree in `questionFlow.ts`.
2. **Sarvam Failure**: TTS and STT have built-in Web Speech API fallbacks (standard browser voice) to ensure the system is never non-functional.

---

## 🧪 Testing Locally

To test the full integration:
1. Navigate to `/test-integration`.
2. Open the console to view the final output JSON.
3. Test the **Mute** and **Language** toggles during the flow.
4. Test **Voice Input** by speaking "Number one" or "Severe".
