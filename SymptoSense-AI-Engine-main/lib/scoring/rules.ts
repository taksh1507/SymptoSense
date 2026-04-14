import { ScoringRules } from "./types";

/**
 * Deterministic Ruleset for the SymptoSense Risk Scoring Engine
 */
export const SCORING_DATASET: ScoringRules = {
  // Base scores for primary symptoms
  symptoms: {
    fever: 15,
    headache: 10,
    cough: 12,
    fatigue: 8,
    nausea: 10,
    dizziness: 15,
  },

  // Weight for intensity
  severity: {
    mild: 0,
    moderate: 15,
    severe: 35, // High weight to push towards threshold
  },

  // Weight for longevity
  duration: {
    "< 1 day": 0,
    "1-3 days": 10,
    "> 3 days": 20,
    // Mapping for values from Engine (if normalized)
    "<1d": 0,
    "1-3d": 10,
    ">3d": 20,
  },

  // Medical history multipliers / fixed additions
  medicalHistory: {
    diabetes: 15,
    hypertension: 15,
    heart_disease: 25,
    asthma: 15,
    none: 0,
  },

  // Additional symptoms found during survey
  additionalSymptoms: {
    chills: 10,
    sweating: 8,
    vomiting: 12,
    breathlessness: 20,
    none: 0,
  },

  /**
   * RED FLAGS - Highest Priority
   * If any of these are found in the symptom or additional fields, 
   * urgency is set to HIGH immediately.
   */
  redFlags: [
    "chest pain",
    "difficulty breathing",
    "unconsciousness",
    "severe bleeding",
    "confusion",
    "shortness of breath",
    "saans", // breath (Hinglish)
    "dhakan", // chest (Hinglish)
    "chakkar", // extreme dizziness (Hinglish)
    "behosh", // unconscious (Hinglish)
    "सीने में दर्द", // chest pain (Hindi)
    "सांस लेने में तकलीफ", // breathing difficulty (Hindi)
    "बेहोश", // unconscious (Hindi)
  ],

  // Urgency thresholds
  thresholds: {
    medium: 31,
    high: 61,
  },

  // Standardized recommendations
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
