"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { HeartPulse, Check } from "lucide-react";
import { useUiText } from "./use-ui-text";
export function AppLogo() {
  return (
    <Link href="/" className="wordmark" aria-label="SymptoSense home">
      <span className="logo-symbol">
        <HeartPulse aria-hidden="true" />
      </span>
      SymptoSense
    </Link>
  );
}
export function HealthImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={failed ? "/images/medical-professional.webp" : src}
      alt={alt}
      width={1000}
      height={667}
      className={className}
      priority={priority}
      sizes="(max-width: 767px) 100vw, 50vw"
      onError={() => setFailed(true)}
    />
  );
}
export function AuthPanel() {
  const t = useUiText();
  return (
    <aside className="auth-promo">
      <HealthImage
        src="/images/family-health.webp"
        alt="Family spending time together by the sea"
        priority
      />
      <div className="auth-promo-copy">
        <span className="promo-kicker">HEALTH, TOGETHER</span>
        <h2>
          {t(
            "Better Health for You and Your Family",
            "आपके और आपके परिवार के लिए बेहतर स्वास्थ्य",
            "तुमच्या आणि तुमच्या कुटुंबासाठी उत्तम आरोग्य",
          )}
        </h2>
        <ul>
          {[
            t(
              "AI-assisted insights",
              "AI-सहायता प्राप्त जानकारी",
              "AI-सहाय्यित माहिती",
            ),
            t(
              "Family assessments",
              "परिवार के मूल्यांकन",
              "कुटुंबाची मूल्यांकने",
            ),
            t("Multilingual experience", "बहुभाषी अनुभव", "बहुभाषिक अनुभव"),
            t(
              "Privacy-conscious design",
              "गोपनीयता का ध्यान",
              "गोपनीयतेचा विचार",
            ),
          ].map((label) => (
            <li key={label}>
              <Check aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
export function ProgressStepper({ step }: { step: number }) {
  const t = useUiText();
  return (
    <ol
      className="progress-stepper"
      aria-label={t(
        "Assessment progress",
        "मूल्यांकन प्रगति",
        "मूल्यांकन प्रगती",
      )}
    >
      {[
        t("Basic Info", "बुनियादी जानकारी", "मूलभूत माहिती"),
        t("Symptoms", "लक्षण", "लक्षणे"),
        t("Details", "विवरण", "तपशील"),
        t("Review", "समीक्षा", "आढावा"),
      ].map((label, i) => (
        <li
          key={label}
          className={i <= step ? "reached" : ""}
          aria-current={i === step ? "step" : undefined}
        >
          <span>{i < step ? <Check aria-hidden="true" /> : i + 1}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  );
}
