# 🩺 SymptoSense AI Engine

### *AI-Powered Multilingual Health Assessment & Risk Scoring*

SymptoSense is a state-of-the-art health triage engine designed to provide immediate, accessible health assessments using a hybrid of **Generative AI** and **Deterministic Clinical Rules**. Built for accessibility, it features a full voice-first interface supporting English, Hindi, and Hinglish.

---

## 🌟 Key Features

### 🧠 1. Dynamic AI Question Engine
- **Context-Aware Follow-ups**: Uses Gemini 1.5 Flash to generate relevant medical follow-up questions tailored to the user's symptoms.
- **Robust Fallback**: Automatically switches to a deterministic clinical tree if AI APIs are unavailable, ensuring the tool is always functional.

### 🎙️ 2. Conversational Voice UX
- **Multilingual Support**: High-fidelity Text-to-Speech (TTS) and Speech-to-Text (STT) for English, Hindi, and Hinglish via Sarvam AI.
- **Natural Pacing**: AI speaks questions and options together with natural pauses for a human-like triage experience.

### 🛡️ 3. Safety-First Risk Scoring
- **Red Flag Detection**: Immediate, high-contrast emergency alerts for critical symptoms (e.g., chest pain, breathing difficulty).
- **Deterministic Scoring**: Clinical urgency is calculated using a rule-based engine, ensuring reliability and medical safety.

### 🎨 4. Premium Plug-and-Play UI
- **Modular Component**: The `AIQuestionEngine` can be integrated into any React/Next.js application as a self-contained module.
- **Glassmorphic Design**: Modern, responsive UI with color-coded severity tiles and smooth animations.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Meetsu369/SymptoSense-AI-Engine.git
cd SymptoSense-AI-Engine
npm install
```

### 2. Configure Environment
Create a `.env.local` file (referencing `.env.example`):
```bash
# Sarvam AI (TTS/STT/Translate)
SARVAM_API_KEY=your_key_here
SARVAM_BASE_URL=https://api.sarvam.ai

# Google Gemini (Question Generation)
GEMINI_API_KEY=your_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to start the assessment.

---

## 🔌 Integration Guide

To use the engine in your own project:

```tsx
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";

<AIQuestionEngine
  initialSymptom="fever"
  defaultLanguage="en"
  onComplete={(data) => {
    // Returns: { symptom, severity, duration, additionalSymptoms, language }
    console.log("Assessment Data:", data);
  }}
/>
```

For more details, see [TEAM_INTEGRATION_GUIDE.md](./docs/TEAM_INTEGRATION_GUIDE.md).

---

## 🛠 Tech Stack
- **Framework**: Next.js (App Router)
- **AI Models**: Google Gemini 1.5 Flash (Question Generation), Sarvam AI (Voice & Translation)
- **Styling**: Vanilla CSS + Utility classes
- **State Management**: Custom Hook based State Machine

---

Developed with ❤️ for Global Health Accessibility.
