import type { MLFeatures } from './featureMapper';
export interface Prediction { confidence: number | null; confidenceLevel: string; modelVersion?: string; }
export function mlBaseUrl(): string {
  const raw = process.env.ML_SERVICE_URL || process.env.ML_SERVER_URL || 'http://localhost:8000';
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/(?:api\/)?predict-confidence\/?$/, '').replace(/\/$/, '');
  return url.toString().replace(/\/$/, '');
}
export async function predict(features: MLFeatures): Promise<Prediction> {
  const endpoint = process.env.ML_SERVER_URL || (process.env.VERCEL_URL && !process.env.ML_SERVICE_URL ? 'https://' + process.env.VERCEL_URL + '/api/predict-confidence' : mlBaseUrl() + '/predict-confidence');
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(features), signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('ML unavailable');
    const data = await res.json();
    if (typeof data.confidence !== 'number' || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1) throw new Error('Invalid prediction');
    return { confidence: data.confidence, confidenceLevel: data.confidence >= 0.8 ? 'High' : data.confidence >= 0.55 ? 'Medium' : 'Low', modelVersion: typeof data.modelVersion === 'string' ? data.modelVersion.slice(0, 100) : undefined };
  } catch { return { confidence: null, confidenceLevel: 'unavailable' }; }
}
