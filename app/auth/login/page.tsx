'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import PublicNav from '@/app/components/PublicNav';
import PublicFooter from '@/app/components/PublicFooter';
import { Button, Field, Notice, Section } from '@/components/ui/primitives';
import { useUiText } from '@/components/ui/use-ui-text';

export default function LoginPage() {
  const router = useRouter();
  const t = useUiText();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    void getProviders()
      .then(p => setGoogleAvailable(!!p?.google))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result?.ok) setError('Invalid email or password. Try again.');
      else router.push('/dashboard');
    } catch {
      setError('Could not sign in. Please try again.');
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

  return (
    <>
      <PublicNav />
      <main id="main-content" className="editorial auth-layout">
        <div className="stack-lg">
          <p className="eyebrow">SymptoSense</p>
          <h1>{t('Your health record, in one place.', 'आपका स्वास्थ्य रिकॉर्ड, एक जगह।', 'तुमची आरोग्य नोंद, एकाच ठिकाणी.')}</h1>
          <p>
            {t(
              'Sign in to start an assessment or read your saved reports.',
              'मूल्यांकन शुरू करने या सहेजी रिपोर्ट पढ़ने के लिए साइन इन करें।',
              'मूल्यांकन सुरू करण्यासाठी किंवा जतन केलेले अहवाल वाचण्यासाठी साइन इन करा.'
            )}
          </p>
        </div>
        <Section title={t('Sign in', 'साइन इन', 'साइन इन')}>
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
            {t('Continue with Google', 'Google से जारी रखें', 'Google सह पुढे जा')}
          </Button>
          <p className="muted">{t('Or use your email', 'या ईमेल का उपयोग करें', 'किंवा ईमेल वापरा')}</p>
          <form onSubmit={handleLogin} className="stack">
            <Field
              id="login-email"
              label={t('Email address', 'ईमेल पता', 'ईमेल पत्ता')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Field
              id="login-password"
              label={t('Password', 'पासवर्ड', 'पासवर्ड')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              suffixAction={passwordToggle}
              required
              autoComplete="current-password"
            />
            {error && <Notice tone="warning" role="alert">{error}</Notice>}
            <Button type="submit" disabled={loading}>
              {loading ? t('Signing in…', 'साइन इन हो रहा है…', 'साइन इन होत आहे…') : t('Sign in', 'साइन इन', 'साइन इन')}
            </Button>
          </form>
          <div>
            <p>{t('New to SymptoSense?', 'SymptoSense पर नए हैं?', 'SymptoSense वर नवीन आहात?')}</p>
            <Button variant="secondary" onClick={() => router.push('/auth/signup')}>
              {t('Create account', 'खाता बनाएँ', 'खाते तयार करा')}
            </Button>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </>
  );
}
