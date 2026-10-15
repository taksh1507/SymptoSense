"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { User, Users, ArrowRight } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import AssessmentSubmission from "@/app/components/AssessmentSubmission";
import {
  useApp,
  type Gender,
  type Relation,
  type Language,
} from "@/app/context/AppContext";
import { ProgressStepper, HealthImage } from "@/components/ui/brand";
import { Button, Field, Section, Notice } from "@/components/ui/primitives";
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";
import { useUiText } from "@/components/ui/use-ui-text";
export default function AssessmentPage() {
  const app = useApp();
  const { data: session } = useSession();
  const t = useUiText();
  const [started, setStarted] = useState(false);
  const [name, setName] = useState(app.patientName);
  const [relation, setRelation] = useState<Relation>(app.relation || "Parent");
  const [sex, setSex] = useState<Gender>(app.gender || "Prefer not to say");
  const [error, setError] = useState("");
  const begin = (e: React.FormEvent) => {
    e.preventDefault();
    const patient =
      app.personType === "family"
        ? name.trim()
        : session?.user?.name || "Myself";
    if (!patient) {
      setError("Please enter your family member’s name.");
      return;
    }
    app.setPatientInfo(
      patient,
      app.personType === "family" ? relation : null,
      sex,
    );
    app.setTriageScreen("questions");
    setStarted(true);
  };
  return (
    <AppShell>
      {app.triageScreen === "results" && started ? (
        <AssessmentSubmission onRestart={() => { app.cancelTest(); setStarted(false); }} />
      ) : (
        <div className="page">
          <div className="content-wrapper">
            {started ? (
              <AIQuestionEngine
                defaultLanguage={
                  app.language === "Hindi"
                    ? "hi"
                    : app.language === "Marathi"
                      ? "mr"
                      : "en"
                }
                gender={sex}
                onComplete={app.handleAIComplete}
                onCancel={() => {
                  setStarted(false);
                }}
              />
            ) : (
              <>
                <ProgressStepper step={0} />
                <div className="assessment-layout">
                  <Section>
                    <form className="stack" onSubmit={begin}>
                      <h1 className="question-title">
                        {t(
                          "Who is this assessment for?",
                          "यह मूल्यांकन किसके लिए है?",
                          "हे मूल्यांकन कोणासाठी आहे?",
                        )}
                      </h1>
                      <div className="subject-options">
                        <button
                          type="button"
                          className="option"
                          aria-pressed={app.personType !== "family"}
                          onClick={() => app.setPersonType("self")}
                        >
                          <User />
                          {t("Myself", "स्वयं", "स्वतः")}
                        </button>
                        <button
                          type="button"
                          className="option"
                          aria-pressed={app.personType === "family"}
                          onClick={() => app.setPersonType("family")}
                        >
                          <Users />
                          {t(
                            "Family Member",
                            "परिवार का सदस्य",
                            "कुटुंबातील सदस्य",
                          )}
                        </button>
                      </div>
                      {app.personType === "family" && (
                        <>
                          <Field
                            id="patient-name"
                            label={t(
                              "Family member’s name",
                              "सदस्य का नाम",
                              "सदस्याचे नाव",
                            )}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            maxLength={100}
                          />
                          <label className="field">
                            <span>{t("Relationship", "संबंध", "नाते")}</span>
                            <select
                              className="input"
                              value={relation}
                              onChange={(e) =>
                                setRelation(e.target.value as Relation)
                              }
                            >
                              {[
                                "Parent",
                                "Child",
                                "Spouse",
                                "Sibling",
                                "Friend",
                                "Other",
                              ].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                      <label className="field">
                        <span>
                          {t(
                            "Sex (optional)",
                            "लिंग (वैकल्पिक)",
                            "लिंग (ऐच्छिक)",
                          )}
                        </span>
                        <select
                          className="input"
                          value={sex}
                          onChange={(e) => setSex(e.target.value as Gender)}
                        >
                          {["Prefer not to say", "Male", "Female", "Other"].map(
                            (g) => (
                              <option key={g}>{g}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label className="field">
                        <span>
                          {t(
                            "Preferred language",
                            "पसंदीदा भाषा",
                            "पसंतीची भाषा",
                          )}
                        </span>
                        <select
                          className="input"
                          value={app.language || "English"}
                          onChange={(e) =>
                            app.setLanguage(e.target.value as Language)
                          }
                        >
                          <option>English</option>
                          <option value="Hindi">हिन्दी</option>
                          <option value="Marathi">मराठी</option>
                        </select>
                      </label>
                      <p className="muted">
                        {t(
                          "Next, select the age group used by the assessment.",
                          "आगे, मूल्यांकन के लिए आयु वर्ग चुनें।",
                          "पुढे, मूल्यांकनासाठी वयोगट निवडा.",
                        )}
                      </p>
                      {error && <Notice tone="warning">{error}</Notice>}
                      <Button type="submit">
                        {t("Next", "आगे", "पुढे")}
                        <ArrowRight />
                      </Button>
                    </form>
                  </Section>
                  <aside className="assessment-art">
                    <HealthImage
                      src="/images/healthcare-consultation.webp"
                      alt="Medical professional reviewing information"
                    />
                    <h2>
                      {t(
                        "Let’s get started",
                        "आइए शुरू करें",
                        "चला सुरुवात करूया",
                      )}
                    </h2>
                    <p>
                      {t(
                        "Answer a few simple questions to help us understand your symptoms better.",
                        "अपने लक्षण बेहतर समझने के लिए कुछ प्रश्नों के उत्तर दें।",
                        "तुमची लक्षणे समजून घेण्यासाठी काही प्रश्नांची उत्तरे द्या.",
                      )}
                    </p>
                    <p className="muted">
                      Your assessment is informational guidance, not a medical
                      diagnosis.
                    </p>
                  </aside>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
