import { ScoringRules } from "./types";

/**
 * Deterministic Ruleset for the SymptoSense Risk Scoring Engine
 */
export const SCORING_DATASET: ScoringRules = {
  // Base scores for primary symptoms
  symptoms: {
    // Cardiac / Respiratory
    chest_pain: 40,
    breathlessness: 35,
    shortness_of_breath: 35,
    palpitations: 25,
    // Neurological
    dizziness: 18,
    headache: 12,
    sudden_severe_headache: 40,
    // Infection / Fever
    fever: 18,
    cough: 12,
    // GI
    nausea: 10,
    stomach_pain: 14,
    vomiting: 14,
    // General
    fatigue: 10,
    // Dermatological / Other
    rash: 10,
    piles: 18,          // haemorrhoids — moderate base, severity drives it up
    bleeding: 22,
    pain: 14,
  },

  // Weight for intensity — severe must be able to push unknown symptoms to High
  severity: {
    mild: 0,
    moderate: 18,
    severe: 40,    // was 35 — ensures severe + moderate-base symptom crosses High threshold
    critical: 50,  // new level for "cannot get out of bed"
  },

  // Weight for longevity
  duration: {
    "< 1 day": 0,
    "1-3 days": 10,
    "4-7 days": 18,
    "> 1 week": 25,
    "> 3 days": 20,
    // Normalised aliases
    "<1d": 0,
    "1-3d": 10,
    ">3d": 20,
  },

  // Medical history — comorbidities that increase vulnerability
  medicalHistory: {
    diabetes: 15,
    hypertension: 15,
    heart_disease: 25,
    asthma: 15,
    blood_thinners: 20,  // was missing — blood thinners significantly raise bleeding risk
    blood_thinner: 20,
    cancer: 20,
    immunocompromised: 20,
    kidney_disease: 15,
    liver_disease: 15,
    none: 0,
  },

  // Additional symptoms found during survey
  additionalSymptoms: {
    chills: 10,
    sweating: 8,
    vomiting: 14,
    breathlessness: 22,
    bleeding: 20,
    blood_in_stool: 25,
    rectal_bleeding: 25,
    none: 0,
  },

  /**
   * RED FLAGS — immediate HIGH urgency override
   */
  redFlags: [
    "chest pain",
    "difficulty breathing",
    "unconsciousness",
    "severe bleeding",
    "confusion",
    "shortness of breath",
    "saans",
    "dhakan",
    "chakkar",
    "behosh",
    "सीने में दर्द",
    "सांस लेने में तकलीफ",
    "बेहोश",
  ],

  // Urgency thresholds — adjusted so severe symptoms reach High more naturally
  thresholds: {
    medium: 28,   // was 31 — easier to reach Medium
    high: 55,     // was 61 — severe + moderate-base symptom now reaches High
  },

  recommendations: {
    Low: {
      en: "Monitor your symptoms closely at home. Ensure you are getting plenty of rest and staying hydrated. If symptoms persist or worsen, consult a healthcare professional.",
      hi: "घर पर अपने लक्षणों की बारीकी से निगरानी करें। सुनिश्चित करें कि आप पर्याप्त आराम कर रहे हैं और हाइड्रेटेड रह रहे हैं। यदि लक्षण बने रहते हैं या बिगड़ जाते हैं, तो स्वास्थ्य पेशेवर से परामर्श करें।",
    },
    Medium: {
      en: "It is recommended that you schedule a consultation with a doctor or speak with a healthcare professional soon. Your symptoms require professional evaluation.",
      hi: "यह अनुशंसा की जाती है कि आप जल्द ही किसी डॉक्टर के साथ परामर्श निर्धारित करें या किसी स्वास्थ्य पेशेवर से बात करें। आपके लक्षणों को पेशेवर मूल्यांकन की आवश्यकता है।",
    },
    High: {
      en: "EMERGENCY: Please seek immediate medical attention at the nearest emergency room or call emergency services right away.",
      hi: "आपातकालीन: कृपया निकटतम आपातकालीन कक्ष में तुरंत चिकित्सा सहायता लें या तुरंत आपातकालीन सेवाओं को कॉल करें।",
    },
  },
};
