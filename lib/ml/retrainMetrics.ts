/** Support current reviewed classifiers and older saved regression reports. */
export interface RetrainMetrics { brier?: number | null; logLoss?: number | null; r2?: number | null; mae?: number | null }
export function retrainMetricCards(metrics: RetrainMetrics, label: string) {
  const names: Record<string, string> = { brier: 'Brier', logLoss: 'Log loss', r2: 'R²', mae: 'MAE' };
  return Object.entries(metrics).filter(([key, value]) => key in names && typeof value === 'number' && Number.isFinite(value)).map(([key, value]) => ({ title: label + ' ' + names[key], value: (value as number).toFixed(4) }));
}
