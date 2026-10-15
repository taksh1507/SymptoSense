"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button, Field, Notice } from "./primitives";
import { AppLogo, AuthPanel } from "./brand";
import { useUiText } from "./use-ui-text";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const t = useUiText();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    void getProviders()
      .then((p) => setGoogle(!!p?.google))
      .catch(() => {});
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (signup && password !== confirm) {
      setError(
        t(
          "Passwords do not match.",
          "पासवर्ड मेल नहीं खाते।",
          "पासवर्ड जुळत नाहीत.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not create account.");
      }
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!result?.ok)
        throw new Error(
          signup
            ? "Account created. Please try signing in."
            : "Could not sign in. Check your email and password.",
        );
      router.push("/dashboard");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="auth-page">
      <Link href="/" className="auth-back">
        <ArrowLeft />
        Back to home
      </Link>
      <div className="auth-card">
        <div className="auth-form-panel">
          <AppLogo />
          <nav className="auth-tabs" aria-label="Account access">
            <Link
              href="/auth/login"
              aria-current={!signup ? "page" : undefined}
            >
              {t("Login", "लॉग इन", "लॉग इन")}
            </Link>
            <Link
              href="/auth/signup"
              aria-current={signup ? "page" : undefined}
            >
              {t("Sign Up", "खाता बनाएँ", "खाते तयार करा")}
            </Link>
          </nav>
          <div className="stack">
            <h1>
              {signup
                ? t(
                    "Create your account",
                    "अपना खाता बनाएँ",
                    "तुमचे खाते तयार करा",
                  )
                : t("Welcome Back", "वापस स्वागत है", "पुन्हा स्वागत आहे")}
            </h1>
            <p className="muted">
              {signup
                ? t(
                    "Start your health journey with SymptoSense.",
                    "SymptoSense के साथ शुरुआत करें।",
                    "SymptoSense सह सुरुवात करा.",
                  )
                : t(
                    "Login to continue your health journey",
                    "अपनी स्वास्थ्य यात्रा जारी रखने के लिए लॉग इन करें",
                    "तुमचा आरोग्य प्रवास सुरू ठेवण्यासाठी लॉग इन करा",
                  )}
            </p>
          </div>
          <form className="stack" onSubmit={submit}>
            {signup && (
              <Field
                id="signup-name"
                label={t("Full name", "पूरा नाम", "पूर्ण नाव")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            )}
            <Field
              id="login-email"
              label={t("Email address", "ईमेल पता", "ईमेल पत्ता")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              maxLength={254}
            />
            <Field
              id="login-password"
              label={t("Password", "पासवर्ड", "पासवर्ड")}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                signup ? "At least 8 characters" : "Enter your password"
              }
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 8 : undefined}
              suffixAction={
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff /> : <Eye />}
                </button>
              }
            />
            {signup && (
              <Field
                id="signup-confirm"
                label={t(
                  "Confirm password",
                  "पासवर्ड दोहराएँ",
                  "पासवर्ड पुन्हा लिहा",
                )}
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                error={
                  confirm && confirm !== password
                    ? t(
                        "Passwords do not match",
                        "पासवर्ड मेल नहीं खाते",
                        "पासवर्ड जुळत नाहीत",
                      )
                    : undefined
                }
              />
            )}
            {error && (
              <Notice tone="warning" role="alert">
                {error}
              </Notice>
            )}
            <Button type="submit" loading={busy}>
              {busy
                ? t("Please wait…", "कृपया प्रतीक्षा करें…", "कृपया थांबा…")
                : signup
                  ? t("Create Account", "खाता बनाएँ", "खाते तयार करा")
                  : t("Login", "लॉग इन", "लॉग इन")}
            </Button>
          </form>
          {google && (
            <>
              <div className="auth-divider">OR</div>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void signIn("google", { callbackUrl: "/dashboard" }).catch(
                    () => {
                      setError("Could not connect to Google.");
                      setBusy(false);
                    },
                  );
                }}
              >
                Continue with Google
              </Button>
            </>
          )}
          <p className="auth-switch">
            {signup ? "Already have an account?" : "Don’t have an account?"}{" "}
            <Link href={signup ? "/auth/login" : "/auth/signup"}>
              {signup ? "Login" : "Sign up"}
            </Link>
          </p>
          <p className="auth-legal">
            By continuing, review our <Link href="/terms">terms</Link> and{" "}
            <Link href="/privacy">privacy information</Link>.
          </p>
        </div>
        <AuthPanel />
      </div>
    </main>
  );
}
