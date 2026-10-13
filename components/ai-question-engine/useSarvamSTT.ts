'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from './types';
interface Recognition { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; }
export function useSarvamSTT() {
  const [isRecording, setIsRecording] = useState(false); const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null); const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const recorder = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<Recognition | null>(null); const chunks = useRef<Blob[]>([]); const language = useRef<Language>('en');
  const lastFailure = useRef(0); const recordingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null); const mounted = useRef(true); const generation = useRef(0);
  const release = useCallback(() => { if (recordingTimeout.current) clearTimeout(recordingTimeout.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }, []);
  const cancelRecording = useCallback(() => {
    generation.current++; request.current?.abort();
    if (recorder.current && recorder.current.state !== 'inactive') { recorder.current.onstop = null; recorder.current.stop(); }
    recognition.current?.abort(); recognition.current = null; release(); chunks.current = [];
    if (mounted.current) { setIsRecording(false); setTranscript(''); }
  }, [release]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancelRecording(); }; }, [cancelRecording]);
  const startBrowser = useCallback((lang: Language): Promise<string | null> => new Promise(resolve => {
    const Constructor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Constructor) { setError('Browser speech recognition is unavailable. Please select an option.'); resolve(null); return; }
    const instance: Recognition = new Constructor(); recognition.current = instance;
    instance.lang = lang === 'en' ? 'en-IN' : lang + '-IN'; instance.interimResults = false; instance.continuous = false;
    const id = generation.current; let result: string | null = null; let done = false;
    const finish = () => { if (done) return; done = true; if (recognition.current === instance) { release(); recognition.current = null; } if (mounted.current && id === generation.current) { setIsRecording(false); if (result) setTranscript(result); } resolve(id === generation.current ? result : null); };
    instance.onresult = e => { result = e.results[0]?.[0]?.transcript ?? null; finish(); };
    instance.onerror = () => { if (mounted.current && id === generation.current) setError('Could not recognize speech. Please select an option.'); finish(); };
    instance.onend = finish;
    setIsRecording(true); recordingTimeout.current = setTimeout(() => { instance.abort(); finish(); }, 20000);
    try { instance.start(); } catch { finish(); }
  }), [release]);
  const startRecording = useCallback(async (lang: Language): Promise<string | null> => {
    cancelRecording(); setError(null); language.current = lang;
    if (Date.now() - lastFailure.current < 30000) return startBrowser(lang);
    const id = generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || id !== generation.current) { media.getTracks().forEach(t => t.stop()); return null; }
      stream.current = media; setHasMicPermission(true);
      const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t));
      const instance = new MediaRecorder(media, mime ? { mimeType: mime } : undefined); recorder.current = instance; chunks.current = [];
      instance.ondataavailable = e => { if (id === generation.current && e.data.size) chunks.current.push(e.data); };
      instance.start(); setIsRecording(true);
      recordingTimeout.current = setTimeout(() => { cancelRecording(); setError('Recording timed out. Please try again.'); }, 20000);
      return null;
    } catch (e) { release(); if (mounted.current && id === generation.current) { if ((e as Error).name === 'NotAllowedError') setHasMicPermission(false); return startBrowser(lang); } return null; }
  }, [cancelRecording, startBrowser, release]);
  const stopRecording = useCallback(async (): Promise<string> => {
    if (recognition.current) { recognition.current.stop(); return ''; } // startRecording resolves the browser transcript.
    const instance = recorder.current; if (!instance || instance.state === 'inactive') return '';
    const id = generation.current;
    return new Promise(resolve => {
      instance.onstop = async () => {
        if (!mounted.current || id !== generation.current) { resolve(''); return; }
        release(); if (mounted.current) setIsRecording(false);
        const audio = new Blob(chunks.current, { type: instance.mimeType }); chunks.current = [];
        const form = new FormData(); form.append('file', audio, audio.type.includes('mp4') ? 'recording.m4a' : audio.type.includes('ogg') ? 'recording.ogg' : 'recording.webm'); form.append('language', language.current + '-IN');
        const ctrl = new AbortController(); request.current = ctrl; const timeout = setTimeout(() => ctrl.abort(), 12000);
        try {
          const response = await fetch('/api/sarvam/stt', { method: 'POST', body: form, signal: ctrl.signal }); if (!response.ok) throw new Error('Unavailable');
          const data = await response.json(); const result = typeof data.transcript === 'string' ? data.transcript : '';
          if (mounted.current && id === generation.current) { setTranscript(result); resolve(result); } else resolve('');
        } catch { lastFailure.current = Date.now(); if (mounted.current && id === generation.current) setError('Transcription unavailable. Retry to use browser speech recognition, or select an option.'); resolve(''); }
        finally { clearTimeout(timeout); }
      };
      instance.stop();
    });
  }, [release]);
  return { startRecording, stopRecording, cancelRecording, isRecording, transcript, error, hasMicPermission };
}
