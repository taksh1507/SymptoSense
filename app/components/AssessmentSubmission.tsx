'use client';
import { Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, Notice, Section } from '@/components/ui/primitives';
import ResultsPage from './ResultsPage';
export default function AssessmentSubmission({onRestart}:{onRestart:()=>void}) {
  const app=useApp();
  if(app.saveStatus==='saved') return <ResultsPage onRestart={onRestart}/>;
  return <div className="page"><div className="question-flow">{app.riskLevel==='High' && <Notice tone="danger" role="alert"><h2>Seek immediate medical attention</h2><p>Your answers contain high urgency findings. Do not wait for this report to save before seeking help.</p><a href="tel:108" className="btn btn-danger">Call emergency services (108)</a></Notice>}<Section title={app.saveStatus==='failed'?'Your assessment could not be saved':'Preparing your assessment'}>{app.saveStatus==='failed'?<><Notice tone="warning" role="alert">{app.saveError}</Notice><p>Your answers are retained in this session. Retry when the service is available.</p><Button onClick={app.retrySave}>Retry submission</Button></>:<><Loader2 className="animate-spin"/><p role="status">Checking your answers and saving your report. Please keep this page open.</p></>}</Section></div></div>;
}
