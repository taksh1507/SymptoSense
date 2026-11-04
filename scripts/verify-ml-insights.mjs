// UI fixtures use real repository reports; no accounts or patient records are created.
// Run with: node --import ./scripts/register-typescript.mjs scripts/verify-ml-insights.mjs <playwright module> [base URL]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] ?? 'http://127.0.0.1:3000';
const output = 'outputs/ml-insights-verification';
await fs.mkdir(output, { recursive: true });
const ddx = JSON.parse(await fs.readFile('ml-service/reports/ml_report.json', 'utf8'));
const vocabulary = JSON.parse(await fs.readFile('ml-service/artifacts/symptom_list.json', 'utf8'));
ddx.feature_labels = Object.fromEntries(vocabulary.map(row => [row.code, row.display_name]));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { name: 'UI Review', email: 'ui-review@example.test' }, expires: '2099-01-01T00:00:00Z' } }));
  let mode = 'ready';
  await page.route('**/api/ml/*', async route => {
    if (mode === 'error') return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    return route.fulfill({ json: ddx });
  });
  await page.goto(`${base}/dashboard/ml-insights`);
  await page.getByRole('heading', { name: ddx.training.winner, exact: true }).waitFor();
  assert.equal(await page.getByRole('tab').count(), 4);
  assert.equal(await page.locator('.insights-kpi strong').first().innerText(), '95.6%');
  await page.screenshot({ path: `${output}/desktop-overview.png`, fullPage: true });
  for (const tab of ['Overview', 'Model Performance', 'Explainability', 'Dataset Insights']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    assert.equal(await page.getByRole('tabpanel').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${tab}: desktop overflow`);
  }
  await page.getByRole('tab', { name: 'Model Performance', exact: true }).click();
  await page.getByLabel('Actual disease').selectOption('1');
  await page.getByLabel('Find a disease').fill('no-matching-disease');
  await page.getByText('No matching disease classes.').waitFor();
  await page.getByLabel('Find a disease').fill('');
  await page.screenshot({ path: `${output}/desktop-performance.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Explainability', exact: true }).click();
  await page.screenshot({ path: `${output}/desktop-explainability.png`, fullPage: true });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ['Overview', 'Model Performance', 'Explainability', 'Dataset Insights']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${width}px ${tab}: page overflow`);
    }
    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    await page.screenshot({ path: `${output}/overview-${width}.png`, fullPage: true });
  }
  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Model Performance', exact: true }).getAttribute('aria-selected'), 'true');
  mode = 'error';
  await page.reload();
  await page.getByRole('heading', { name: 'Not evaluated', exact: true }).waitFor();
  await page.locator('.insights-notice[role="alert"]').waitFor();
  mode = 'ready';
  await page.getByRole('button', { name: 'Retry loading' }).click();
  await page.getByRole('heading', { name: ddx.training.winner, exact: true }).waitFor();
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS: DDXPlus Symptoms Dataset benchmark and 95.6% accuracy headline, four tabs, responsive widths, filters, keyboard tabs, unavailable and retry states; no page overflow or runtime errors.');
  console.log(`Screenshots: ${output}. UI data and session were intercepted test fixtures; report values are genuine repository artifacts.`);
} finally {
  await browser.close();
}
