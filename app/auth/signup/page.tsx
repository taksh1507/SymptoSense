'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import PublicNav from '@/app/components/PublicNav';
import PublicFooter from '@/app/components/PublicFooter';
import { Button, Field, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';

export default function SignupPage() {
  const router = useRouter();
  const t = useUiText();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    void getProviders()
      .then(p => setGoogleAvailable(!!p?.google))
      .catch(() => {});
  }, []);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) s++;
    return s; // 0-3
  })();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);

    try {
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setError(registerData.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', { email, password, redirect: false });
      setLoading(false);
      if (!result?.ok) {
        setError('Account created! Please sign in.');
        router.push('/auth/login');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Could not complete sign-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordToggle = (
    <button
      type="button"
      className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
      onClick={() => setShowPassword(v => !v)}
      aria-label={showPassword ? t('Hide password', 'पासवर्ड छिपाएँ', 'पासवर्ड लपवा') : t('Show password', 'पासवर्ड दिखाएँ', 'पासवर्ड दाखवा')}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const confirmPasswordToggle = (
    <button
      type="button"
      className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
      onClick={() => setShowConfirmPassword(v => !v)}
      aria-label={showConfirmPassword ? t('Hide password', 'पासवर्ड छिपाएँ', 'पासवर्ड लपवा') : t('Show password', 'पासवर्ड दिखाएँ', 'पासवर्ड दाखवा')}
    >
      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <>
      <PublicNav />
      <main id="main-content" className="editorial auth-layout">
        <div className="stack-lg">
          <p className="eyebrow">SymptoSense</p>
          <h1>{t('Keep a record of how you feel.', 'अपनी तबीयत का रिकॉर्ड रखें।', 'तुमच्या तब्येतीची नोंद ठेवा.')}</h1>
          <p>
            {t(
              'Create an account to save assessments for yourself or someone you are helping.',
              'अपने लिए या जिस व्यक्ति की मदद कर रहे हैं, उसके मूल्यांकन सहेजने के लिए खाता बनाएँ।',
              'स्वतःसाठी किंवा तुम्ही मदत करत असलेल्या व्यक्तीसाठी मूल्यांकने जतन करण्यास खाते तयार करा.'
            )}
          </p>
        </div>
        <Section title={t('Create account', 'खाता बनाएँ', 'खाते तयार करा')}>
          <Button
            type="button"
            variant="secondary"
            disabled={!googleAvailable || loading}
            title={googleAvailable ? undefined : t('Google sign-in unavailable', 'Google साइन इन उपलब्ध नहीं', 'Google साइन इन उपलब्ध नाही')}
            onClick={() => {
              void signIn('google', { callbackUrl: '/dashboard' }).catch(() =>
                setError('Could not sign in. Please try again.')
              );
            }}
          >
            {t('Sign up with Google', 'Google से खाता बनाएँ', 'Google सह खाते तयार करा')}
          </Button>
          <p className="muted">{t('Or sign up with email', 'या ईमेल से खाता बनाएँ', 'किंवा ईमेलसह खाते तयार करा')}</p>
          <form onSubmit={handleSignup} className="stack">
            <Field
              id="signup-name"
              label={t('Full name', 'पूरा नाम', 'पूर्ण नाव')}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
            />
            <Field
              id="signup-email"
              label={t('Email address', 'ईमेल पता', 'ईमेल पत्ता')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
            <Field
              id="signup-password"
              label={t('Password', 'पासवर्ड', 'पासवर्ड')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('At least 8 characters', 'कम से कम 8 अक्षर', 'किमान 8 अक्षरे')}
              suffixAction={passwordToggle}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <div className="stack">
                <progress max={3} value={strength} aria-label={t('Password strength', 'पासवर्ड की मज़बूती', 'पासवर्डची ताकद')} />
                <span className="muted text-xs">
                  {strength <= 1 ? t('Weak', 'कमज़ोर', 'कमकुवत') : strength === 2 ? t('Good', 'अच्छा', 'चांगला') : t('Strong', 'मज़बूत', 'मजबूत')}
                </span>
              </div>
            )}
            <Field
              id="signup-confirm"
              label={t('Confirm password', 'पासवर्ड दोहराएँ', 'पासवर्ड पुन्हा लिहा')}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              suffixAction={confirmPasswordToggle}
              required
              autoComplete="new-password"
            />
            {error && <Notice tone="warning" role="alert">{error}</Notice>}
            <Button type="submit" disabled={loading}>
              {loading ? t('Creating account…', 'खाता बन रहा है…', 'खाते तयार होत आहे…') : t('Create account', 'खाता बनाएँ', 'खाते तयार करा')}
            </Button>
          </form>
          <div>
            <p>{t('Already have an account?', 'पहले से खाता है?', 'आधीपासून खाते आहे?')}</p>
            <Button variant="secondary" onClick={() => router.push('/auth/login')}>
              {t('Sign in', 'साइन इन', 'साइन इन')}
            </Button>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </>
  );
}
