import hashlib
import json
import importlib.util
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
import sqlite3
import numpy as np
from fastapi.testclient import TestClient
import inference
import server
import followup_reminders as reminders
import retrain
from storage import ROOT, epoch_ms, database_path

PAYLOAD = dict(age_group=1, severity=2, duration=2, fever=1, cough=1, chest_pain=0, dizziness=0, fatigue=0, diabetes=0, heart_disease=0, rule_score=45, risk_level=1, symptom_intensity_score=2, symptom_consistency_score=1, symptom_progression=1, answer_confidence_proxy=.8, ambiguity_score=0, multi_symptom_density=.25)

class InferenceTests(unittest.TestCase):
    def setUp(self):
        inference.load_model()
        self.client = TestClient(inference.prediction_app())
    def test_real_prediction_and_version(self):
        response = self.client.post('/predict-confidence', json=PAYLOAD)
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertTrue(0 <= data['confidence'] <= 1)
        self.assertEqual(data['modelVersion'], hashlib.sha256(inference.MODEL_PATH.read_bytes()).hexdigest()[:16])
        self.assertEqual(data['scoreKind'], 'synthetic_heuristic')
    def test_serverless_and_local_use_identical_predictions(self):
        spec = importlib.util.spec_from_file_location('serverless_prediction', ROOT / 'api' / 'predict-confidence.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        remote = TestClient(module.app).post('/api/predict-confidence', json=PAYLOAD)
        local = self.client.post('/predict-confidence', json=PAYLOAD)
        self.assertEqual(remote.json(), local.json())
    def test_missing_model_is_503_without_fake_confidence(self):
        with patch('inference.load_model', return_value=None):
            response = self.client.post('/predict-confidence', json=PAYLOAD)
        self.assertEqual(response.status_code, 503); self.assertNotIn('confidence', response.json())
    def test_prediction_failure_is_503(self):
        fake = MagicMock(); fake.predict.side_effect = RuntimeError('failed')
        with patch('inference.load_model', return_value=fake):
            self.assertEqual(self.client.post('/predict-confidence', json=PAYLOAD).status_code, 503)
    def test_feature_validation(self):
        for key, value in [('cough', 2), ('rule_score', -1), ('severity', 5), ('notes', 'private text'), ('cough', True), ('rule_score', '45'), ('rule_score', True)]:
            with self.subTest(key=key, value=value):
                self.assertEqual(self.client.post('/predict-confidence', json={**PAYLOAD, key: value}).status_code, 422)
    def test_all_supported_severity_and_duration_values(self):
        response = self.client.post('/predict-confidence', json={**PAYLOAD, 'severity': 4, 'duration': 4, 'symptom_intensity_score': 4})
        self.assertEqual(response.status_code, 200)
    def test_manifest_mismatch_is_unavailable(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'model.joblib'
            path.write_bytes(inference.MODEL_PATH.read_bytes())
            path.with_suffix('.json').write_text('{"modelVersion":"wrong","scoreKind":"reviewed_appropriateness_probability"}')
            with patch.object(inference, 'MODEL_PATH', path):
                self.assertIsNone(inference.load_model())
    def test_raw_score_one_is_normalized_once(self):
        fake = MagicMock(); fake.predict.return_value = [.7]
        with patch('inference.load_model', return_value=fake):
            self.client.post('/predict-confidence', json={**PAYLOAD, 'rule_score': 1})
        self.assertEqual(fake.predict.call_args.args[0].rule_score.iloc[0], .01)
    def test_administration_requires_configured_token(self):
        client = TestClient(server.app)
        with patch.dict(os.environ, {'RETRAIN_TOKEN': ''}):
            self.assertEqual(client.post('/api/retrain').status_code, 403)
            self.assertEqual(client.get('/api/retrain/report').status_code, 403)
        with patch.dict(os.environ, {'RETRAIN_TOKEN': 'test-token'}):
            self.assertEqual(client.post('/api/retrain', headers={'X-Retrain-Token': 'wrong'}).status_code, 403)
    def test_retrain_rejects_concurrent_job(self):
        client = TestClient(server.app)
        with patch.dict(os.environ, {'RETRAIN_TOKEN': 'test-token'}):
            server._retrain_lock.acquire()
            try:
                self.assertEqual(client.post('/api/retrain', headers={'X-Retrain-Token': 'test-token'}).status_code, 409)
            finally:
                server._retrain_lock.release()

class DatabaseWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / 'fixture.db'
        con = sqlite3.connect(self.db)
        for migration in sorted((ROOT / 'prisma' / 'migrations').glob('*/migration.sql')):
            con.executescript(migration.read_text(encoding='utf-8'))
        self.now = datetime.now(timezone.utc)
        con.execute('INSERT INTO User (id,email,phone,emailReminders,whatsappReminders,updatedAt) VALUES (?,?,?,?,?,?)', ('u', 'fake@example.test', '+910000000000', 1, 1, epoch_ms(self.now)))
        con.execute('INSERT INTO TestSession (id,userId,answers,updatedAt) VALUES (?,?,?,?)', ('s', 'u', '[]', epoch_ms(self.now)))
        con.execute('INSERT INTO FollowUp (id,testSessionId,scheduledAt,updatedAt) VALUES (?,?,?,?)', ('f', 's', epoch_ms(self.now + timedelta(days=3)), epoch_ms(self.now)))
        con.commit(); con.close()
    def tearDown(self):
        self.temp.cleanup()
    def execute(self, sql, args=()):
        con = sqlite3.connect(self.db)
        try:
            con.execute(sql, args); con.commit()
        finally:
            con.close()
    def test_all_migrations_build_current_schema(self):
        con = sqlite3.connect(self.db)
        self.assertIn('assessmentPayload', [r[1] for r in con.execute('PRAGMA table_info(TestSession)')])
        self.assertIn('reviewedCorrect', [r[1] for r in con.execute('PRAGMA table_info(FollowUp)')]); con.close()
    def test_future_followup_is_not_due(self):
        self.assertEqual(reminders.find_due(self.db, self.now), [])
    def test_reminder_opt_in_and_date_roundtrip(self):
        self.execute('UPDATE FollowUp SET scheduledAt = ?', (epoch_ms(self.now - timedelta(days=1)),))
        with patch.object(reminders, '_send_email', return_value=True) as email, patch.object(reminders, '_send_whatsapp', return_value=True) as whatsapp:
            self.assertEqual(reminders.run_reminders(self.db, now=self.now), 1)
            email.assert_called_once(); whatsapp.assert_called_once()
            self.assertEqual(reminders.run_reminders(self.db, now=self.now), 0)
        con = sqlite3.connect(self.db)
        self.assertEqual(con.execute('SELECT typeof(lastRemindedAt),reminderCount FROM FollowUp').fetchone(), ('integer', 1)); con.close()
    def test_disabled_notifications_send_nothing(self):
        self.execute('UPDATE FollowUp SET scheduledAt=0'); self.execute('UPDATE User SET emailReminders=0,whatsappReminders=0')
        with patch.object(reminders, '_send_email') as send:
            self.assertEqual(reminders.run_reminders(self.db, now=self.now), 0); send.assert_not_called()
    def test_reserved_reminder_is_not_delivered_twice(self):
        self.execute('UPDATE FollowUp SET scheduledAt=0,reminderClaimedAt=?', (epoch_ms(self.now),))
        self.assertEqual(reminders.find_due(self.db, self.now), [])
    def test_one_followup_per_assessment(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.execute('INSERT INTO FollowUp (id,testSessionId,scheduledAt,updatedAt) VALUES (?,?,?,?)', ('f2', 's', 0, 0))
    def test_recovery_is_not_a_correctness_label(self):
        self.assertIsNone(retrain.derive_label({'improved': 'recovered', 'resolved': 'yes'}))
        self.assertEqual(retrain.derive_label({'reviewedCorrect': 1}), 1)
        self.assertEqual(retrain.derive_label({'reviewedCorrect': 0}), 0)
    def test_insufficient_reviewed_data_never_promotes(self):
        report = retrain.run_retrain(db_path=self.db)
        self.assertFalse(report['promoted']); self.assertEqual(report['rows_real'], 0)
    def test_reviewed_training_promotes_valid_probabilities_and_rejects_equal_champion(self):
        con = sqlite3.connect(self.db)
        try:
            for i in range(160):
                target = i % 2; patient = f'patient-{i}'; session = f'assessment-{i}'
                features = {**PAYLOAD, 'fever': target, 'cough': target, 'rule_score': 90 if target else 10, 'risk_level': 2 if target else 0, 'severity': 3 if target else 1}
                con.execute('INSERT INTO User(id,updatedAt) VALUES (?,0)', (patient,))
                con.execute('INSERT INTO TestSession(id,userId,answers,assessmentPayload,ruleVersion,modelVersion,score,updatedAt) VALUES (?,?,?, ?,?,?,?,0)', (session, patient, '[]', '{}', 'fixture-rule', 'fixture-model', features['rule_score']))
                con.execute('INSERT INTO FollowUp(id,testSessionId,status,scheduledAt,reviewedCorrect,reviewedAt,updatedAt) VALUES (?,?,?,0,?,1,0)', (f'outcome-{i}', session, 'responded', target))
                con.execute('INSERT INTO PredictionLog(id,testSessionId,userId,features,ruleScore,modelVersion,mlAvailable,createdAt) VALUES (?,?,?,?,?,?,1,1)', (f'prediction-{i}', session, patient, json.dumps(features), features['rule_score'], 'fixture-model'))
            con.commit()
        finally:
            con.close()
        model = Path(self.temp.name) / 'reviewed.joblib'
        report = retrain.run_retrain(db_path=self.db, model_path=model)
        self.assertEqual(report['rows_real'], 160)
        self.assertTrue(report['promoted'], report)
        self.assertEqual(report['rows_train'] + report['rows_holdout'], 160)
        with patch.object(inference, 'MODEL_PATH', model):
            result = TestClient(inference.prediction_app()).post('/predict-confidence', json=PAYLOAD)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()['scoreKind'], 'reviewed_appropriateness_probability')
        second = retrain.run_retrain(db_path=self.db, model_path=model)
        self.assertFalse(second['promoted'])
    def test_holdout_is_stable_per_patient(self):
        self.assertEqual(retrain.fixed_holdout('patient'), retrain.fixed_holdout('patient'))
        self.assertTrue(any(retrain.fixed_holdout(str(i)) for i in range(100)))
    def test_probability_gate_handles_nonfinite_predictions(self):
        failed, metrics = retrain.safety_gate(np.array([0, 1]), np.array([np.nan, .5]))
        self.assertTrue(failed); self.assertIsNone(metrics['brier'])
    def test_probability_gate_checks_prevalence_baseline(self):
        failed, _ = retrain.safety_gate(np.array([0, 1]), np.array([.4, .6]), baseline_brier=.1)
        self.assertTrue(failed)
    def test_probability_gate_rejects_bad_candidates(self):
        failed, _ = retrain.safety_gate(np.array([0, 1]), np.array([1., 0.]))
        self.assertTrue(failed)
    def test_database_path_uses_prisma_relative_base(self):
        with patch.dict(os.environ, {'DATABASE_URL': 'file:./dev.db', 'SYMPTOSENSE_DB': ''}):
            self.assertEqual(database_path(), (ROOT / 'prisma' / 'dev.db').resolve())

if __name__ == '__main__':
    unittest.main()
