import { chromium } from 'file:///C:/Users/dell/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out='outputs/report-images';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1.5});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message)); page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url(),r.failure()?.errorText)); const base='http://localhost:3000';
page.setDefaultTimeout(60000);
await page.request.post(base+'/api/auth/register',{data:{name:'Report Demonstration',email:'report-capture@example.test',password:'ReportCapture-2026!'}});
await page.goto(base+'/auth/login');
await page.locator('#login-email').fill('report-capture@example.test');
await page.locator('#login-password').fill('ReportCapture-2026!');
await page.locator('button[type=submit]').click();
await page.waitForURL('**/dashboard');
await page.evaluate(()=>localStorage.setItem('symptosense_muted','true'));
for(const [route,name] of [['/','landing'],['/dashboard','dashboard'],['/dashboard/assessment','assessment'],['/dashboard/reports','reports'],['/dashboard/model-health','model-health']]){
 await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 if(name==='model-health') await page.getByText('Predictions',{exact:true}).waitFor(); await page.screenshot({path:`${out}/${name}.png`});console.log('Captured',name);
}
await page.goto(base+'/dashboard/ml-insights',{waitUntil:'networkidle'});
await page.getByRole('tab',{name:'Training',exact:true}).click();
await page.getByRole('heading',{name:'Learning curve',exact:true}).waitFor();
await page.screenshot({path:`${out}/ml-report.png`});
for(const [tab,title,name] of [['Training','Learning curve','learning-curve'],['Evaluation','Confidence calibration','calibration']]){
 await page.getByRole('tab',{name:tab,exact:true}).click();
 const section=page.locator('section').filter({has:page.getByRole('heading',{name:title,exact:true})}).last();
 await section.scrollIntoViewIfNeeded();await section.locator('svg.recharts-surface').last().waitFor();
 await section.screenshot({path:`${out}/${name}.png`});console.log('Captured',name);
}
await browser.close();





