'use client';

import { useApp } from '../context/AppContext';
import { RiskGauge } from '@/components/results/RiskGauge';
import { ConfidenceMeter } from '@/components/results/ConfidenceMeter';
import { generateRiskExplanation, generateRecommendations } from '@/lib/report/reasoningEngine';
import type { Urgency } from '@/lib/ai-engine/scoring/types';

export default function ResultsPage() {
  const {
    language, riskScore, riskLevel, narrative, setTriageScreen,
    mlScore, mlLevel, mlExplanation, riskReasoning, riskFactors,
    recommendationSteps, primaryAction, keyInsights,
    patientName, relation, personType, assessmentPayload,
  } = useApp();

  const langKey = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
  const displayName = patientName || (personType === 'self' ? 'You' : 'Patient');
  const reportTitle = personType === 'family' && relation
    ? `Health Assessment for ${displayName} (${relation})`
    : `Health Assessment for ${displayName}`;

  // Local engine as fallback when Groq hasn't returned yet
  const localReasoning = assessmentPayload
    ? generateRiskExplanation({ ...assessmentPayload, riskLevel: riskLevel as 'High' | 'Medium' | 'Low', riskScore })
    : null;
  const localRecommendations = assessmentPayload
    ? generateRecommendations({ ...assessmentPayload, riskLevel: riskLevel as 'High' | 'Medium' | 'Low', riskScore })
    : null;

  // Use Groq output if available, fall back to local engine
  const displaySummary   = narrative?.[langKey] || riskReasoning || localReasoning?.summary || '';
  const displayFactors   = riskFactors.length > 0 ? riskFactors : (localReasoning?.factors || []);
  const displayPrimary   = primaryAction || localRecommendations?.primaryAction || '';
  const displaySteps     = recommendationSteps.length > 0 ? recommendationSteps : (localRecommendations?.steps || []);

  const riskColor = riskScore >= 70 ? 'var(--red)' : riskScore >= 35 ? '#B45309' : '#15803D';
  const riskBg   = riskScore >= 70 ? 'var(--red-light)' : riskScore >= 35 ? '#FFFBEB' : '#F0FDF4';

  return (
    <div className="mobile-padding" style={{
      padding: '40px 24px', minHeight: '100%', background: 'var(--bg)',
      fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '28px',
    }}>
      <div style={{ maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Personalized Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-1)', margin: 0, letterSpacing: '-0.6px' }}>
              {reportTitle}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>
              {new Date().toLocaleDateString(
                langKey === 'hi' ? 'hi-IN' : langKey === 'mr' ? 'mr-IN' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setTriageScreen('language')}
            style={{ borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}
          >
            {language === 'Hindi' ? 'पुनः प्रारंभ' : language === 'Marathi' ? 'पुन्हा सुरू करा' : 'Restart'}
          </button>
        </div>

        {/* ── Gauges ── */}
        <div className="card" style={{ padding: '32px', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-1)', margin: '0 0 4px 0' }}>
              {language === 'Hindi' ? 'मूल्यांकन सारांश' : language === 'Marathi' ? 'मूल्यांकन सारांश' : 'Assessment Summary'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Integrated Diagnostic Analysis
            </p>
          </div>

          <div className="mobile-flex-stack" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: '24px' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <RiskGauge
                score={riskScore}
                urgency={(riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase()) as Urgency}
                explanation={riskReasoning}
              />
            </div>
            <div className="mobile-hide" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100px', textAlign: 'center', alignSelf: 'center' }}>
              <div style={{ width: '1px', height: '36px', background: 'var(--border-faint)', marginBottom: '10px' }} />
              <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-4)', lineHeight: '1.4', textTransform: 'uppercase' }}>
                Risk tells <span style={{ color: 'var(--text-1)' }}>WHAT</span> it is
              </p>
              <div style={{ height: '20px' }} />
              <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-4)', lineHeight: '1.4', textTransform: 'uppercase' }}>
                Confidence tells <span style={{ color: 'var(--text-1)' }}>HOW</span> reliable
              </p>
              <div style={{ width: '1px', height: '36px', background: 'var(--border-faint)', marginTop: '10px' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <ConfidenceMeter score={mlScore} level={mlLevel} explanation={mlExplanation} />
            </div>
          </div>
        </div>

        {/* ── Why this risk level? ── */}
        {(displaySummary || displayFactors.length > 0) && (
          <div className="card" style={{ padding: '28px', borderRadius: '20px', borderLeft: '5px solid ' + riskColor }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔍</span>
              {language === 'Hindi' ? 'यह जोखिम स्तर क्यों?' : language === 'Marathi' ? 'हा जोखीम स्तर का?' : 'Why this risk level?'}
            </h3>
            {displaySummary && (
              <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '16px', fontStyle: 'italic' }}>
                {displaySummary}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayFactors.map((factor, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: riskColor, flexShrink: 0, marginTop: '7px' }} />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.5' }}>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Key Insights from Groq ── */}
        {keyInsights.length > 0 && (
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💡</span>
              {language === 'Hindi' ? 'मुख्य निष्कर्ष' : language === 'Marathi' ? 'मुख्य निष्कर्ष' : 'Key Insights'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {keyInsights.map((insight: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '7px' }} />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.5' }}>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── What you should do now ── */}
        {(displayPrimary || displaySteps.length > 0) && (
          <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ background: riskBg, padding: '24px 28px', borderBottom: '1px solid var(--border-faint)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-1)', margin: 0 }}>
                  {language === 'Hindi' ? 'अभी क्या करें?' : language === 'Marathi' ? 'आता काय करावे?' : 'What you should do now'}
                </h3>
                <span style={{ background: riskColor, color: 'white', padding: '3px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800' }}>
                  {riskLevel.toUpperCase()}
                </span>
              </div>
              {displayPrimary && (
                <p style={{ fontSize: '16px', fontWeight: '700', color: riskColor, margin: 0 }}>
                  {displayPrimary}
                </p>
              )}
              {mlScore < 60 && (
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#B45309', fontWeight: '600', padding: '8px 14px', background: '#FEF3C7', borderRadius: '8px', display: 'inline-block' }}>
                  Notice: More precise inputs may refine this recommendation.
                </p>
              )}
            </div>
            {displaySteps.length > 0 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {displaySteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--text-3)', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.55', paddingTop: '2px' }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--border-faint)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', marginBottom: '12px' }}>
            Full analysis saved to your secure patient record.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/reports'}
            className="btn btn-ghost"
            style={{ fontWeight: '700', color: 'var(--primary)' }}
          >
            {language === 'Hindi' ? 'पुरानी रिपोर्ट देखें →' : language === 'Marathi' ? 'जुने अहवाल पहा →' : 'View History →'}
          </button>
        </div>

      </div>
    </div>
  );
}
