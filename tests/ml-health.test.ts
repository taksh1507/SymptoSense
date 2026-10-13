import test from 'node:test';
import assert from 'node:assert/strict';
import { retrainMetricCards } from '@/lib/ml/retrainMetrics';
test('model health renders actual reviewed Brier and log loss without assuming regression metrics', () => {
  assert.deepEqual(retrainMetricCards({ brier: .12345, logLoss: .25 }, 'Candidate'), [{ title: 'Candidate Brier', value: '0.1235' }, { title: 'Candidate Log loss', value: '0.2500' }]);
  assert.deepEqual(retrainMetricCards({ brier: null, r2: NaN }, 'Candidate'), []);
});
test('model health keeps historical regression metrics readable', () => {
  assert.deepEqual(retrainMetricCards({ r2: .8, mae: .1 }, 'Champion'), [{ title: 'Champion R²', value: '0.8000' }, { title: 'Champion MAE', value: '0.1000' }]);
});
