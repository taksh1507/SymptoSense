"use client";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Languages,
  ClipboardList,
  Users,
  FileText,
  MessageSquare,
  Stethoscope,
  CheckCircle2,
  Lock,
} from "lucide-react";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";
import { HealthImage } from "@/components/ui/brand";
import { useUiText } from "@/components/ui/use-ui-text";
export default function LandingPage() {
  const t = useUiText();
  const features = [
    [
      ClipboardList,
      t(
        "AI-assisted symptom assessment",
        "AI-सहायता प्राप्त लक्षण मूल्यांकन",
        "AI-सहाय्यित लक्षण मूल्यांकन",
      ),
      "A guided conversation that starts with how you feel.",
    ],
    [
      Languages,
      t(
        "Your language, your comfort",
        "आपकी भाषा, आपकी सुविधा",
        "तुमची भाषा, तुमची सोय",
      ),
      "English, हिन्दी, मराठी — with text and voice input.",
    ],
    [
      FileText,
      t(
        "Your reports, in one place",
        "आपकी रिपोर्ट, एक जगह",
        "तुमचे अहवाल, एकाच ठिकाणी",
      ),
      "Return to saved assessments and review your next steps.",
    ],
    [
      Users,
      t("Care for your family", "परिवार की देखभाल", "कुटुंबाची काळजी"),
      "Complete an assessment for someone you are helping.",
    ],
    [
      CheckCircle2,
      t("Clear next steps", "स्पष्ट अगले कदम", "स्पष्ट पुढील पावले"),
      "Understand urgency and prepare for a conversation with a doctor.",
    ],
    [
      ShieldCheck,
      t("Privacy-conscious by design", "गोपनीयता का ध्यान", "गोपनीयतेचा विचार"),
      "Your saved reports are accessible through your signed-in account.",
    ],
  ] as const;
  return (
    <>
      <PublicNav activeLink="home" />
      <main id="main-content">
        <div className="landing-top">
          <section className="landing-hero">
            <div className="hero-copy">
              <span className="hero-pill">
                <Sparkles />
                {t(
                  "AI-Powered Symptom Checker",
                  "AI-संचालित लक्षण जाँच",
                  "AI-संचालित लक्षण तपासणी",
                )}
              </span>
              <h1>
                {t(
                  "Understand Your Health",
                  "अपने स्वास्थ्य के",
                  "तुमच्या आरोग्याची",
                )}{" "}
                <span>{t("Symptoms", "लक्षणों को", "लक्षणे")}</span>{" "}
                {t(
                  "with Confidence",
                  "आत्मविश्वास से समझें",
                  "आत्मविश्वासाने समजून घ्या",
                )}
              </h1>
              <p>
                {t(
                  "Get AI-powered insights, possible conditions, and clear next steps based on your symptoms. Fast, private, and easy to use.",
                  "अपने लक्षणों के आधार पर AI-सहायता प्राप्त जानकारी, संभावित स्थितियाँ और स्पष्ट अगले कदम जानें।",
                  "तुमच्या लक्षणांवर आधारित AI-सहाय्यित माहिती, संभाव्य स्थिती आणि स्पष्ट पुढील पावले जाणून घ्या.",
                )}
              </p>
              <div className="row hero-actions">
                <Link href="/dashboard/assessment" className="btn btn-primary">
                  {t(
                    "Start Symptom Check",
                    "लक्षण जाँच शुरू करें",
                    "लक्षण तपासणी सुरू करा",
                  )}
                  <ArrowRight />
                </Link>
                <Link href="#how-it-works" className="btn btn-secondary">
                  {t("How It Works", "कैसे काम करता है", "कसे कार्य करते")}
                </Link>
              </div>
              <div className="trust-row">
                <span>
                  <Sparkles />
                  AI-Powered Analysis
                </span>
                <span>
                  <Languages />
                  Multilingual Support
                </span>
                <span>
                  <Lock />
                  Account-protected reports
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-photo">
                <HealthImage
                  src="/images/doctor-hero.webp"
                  alt="Medical professional in a white coat"
                  priority
                />
              </div>
              <div className="floating-feature feature-one">
                <span>
                  <MessageSquare />
                </span>
                Describe your symptoms
              </div>
              <div className="floating-feature feature-two">
                <span>
                  <Stethoscope />
                </span>
                Get AI insights
              </div>
              <div className="floating-feature feature-three">
                <span>
                  <ClipboardList />
                </span>
                Understand next steps
              </div>
            </div>
          </section>
        <div className="capability-grid">
            {[
              [
                ClipboardList,
                "Symptom assessment",
                "AI-guided questions for clarity",
              ],
              [
                Stethoscope,
                "Personalized guidance",
                "Understand your next steps",
              ],
              [Languages, "Multilingual experience", "English, हिन्दी & मराठी"],
              [ShieldCheck, "Privacy & security", "Account-protected history"],
            ].map(([Icon, title, desc]) => {
              const Glyph = Icon as typeof ClipboardList;
              return (
                <div className="capability-card" key={String(title)}>
                  <span className="icon-tile">
                    <Glyph />
                  </span>
                  <div>
                    <strong>{String(title)}</strong>
                    <p>{String(desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        <section id="features" className="editorial">
          <div className="section-intro">
            <span className="eyebrow">DESIGNED AROUND YOU</span>
            <h2>Clarity for every step of your health journey</h2>
            <p>Thoughtful tools to help you understand what you’re feeling.</p>
          </div>
          <div className="feature-grid">
            {features.map(([Icon, title, desc]) => (
              <article className="feature-card" key={title}>
                <span className="icon-tile">
                  <Icon />
                </span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="editorial how-section">
          <HealthImage
            src="/images/healthcare-consultation.webp"
            alt="Healthcare professional using a mobile device"
          />
          <div className="stack-lg">
            <div className="stack">
              <span className="eyebrow">SIMPLE, FROM THE START</span>
              <h2>
                A little information.
                <br />A clearer next step.
              </h2>
            </div>
            <ol className="how-steps">
              {[
                [
                  "Describe your symptoms",
                  "Select what you’re experiencing or describe it in your own words.",
                ],
                [
                  "Complete the guided assessment",
                  "Answer relevant follow-up questions at your own pace.",
                ],
                [
                  "Review your results and next steps",
                  "Explore your assessment and know when to seek professional care.",
                ],
              ].map(([title, desc], i) => (
                <li key={title}>
                  <span>{i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href="/dashboard/assessment"
              className="btn btn-primary self-start"
            >
              Start your assessment
              <ArrowRight />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
