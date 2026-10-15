/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const base = process.env.UI_URL || 'http://127.0.0.1:3000';
(async () => {
  await fs.mkdir('.local/ui-screenshots', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
  for (const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[360,800]]) {
    await page.setViewportSize({width,height});
    for (const [path,name] of [['/','landing'],['/auth/login','login'],['/auth/signup','signup']]) {
      await page.goto(base+path,{waitUntil:'networkidle'});
      await page.evaluate(async()=>{for(const image of document.images){image.loading='eager';await image.decode().catch(()=>{});}await document.fonts.ready;});
      await page.screenshot({path:`.local/ui-screenshots/${name}-${width}.png`,fullPage:true});
      const layout = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)}));
      if(layout.scroll>width || layout.broken.length) throw new Error(name+' '+JSON.stringify(layout));
      console.log('PASS',name,width,'no overflow or broken images');
    }
  }
  if (process.env.UI_AUTH_CHECK) {
    const assert = require('node:assert/strict');
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base+'/auth/signup');
    await page.locator('#signup-name').fill('UI Test Fixture');
    await page.locator('#login-email').fill('ui-fixture@example.test');
    await page.locator('#login-password').fill('test-password-123');
    await page.locator('#signup-confirm').fill('test-password-123');
    await page.getByRole('button',{name:'Create Account',exact:true}).click();
    await page.waitForURL('**/dashboard');
    await page.getByText('Your health journey starts here').waitFor();
    await page.evaluate(()=>localStorage.setItem('symptosense_muted','true'));
    for (const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[360,800]]) {
      await page.setViewportSize({width,height});
      for (const [route,name] of [['/dashboard','dashboard-empty'],['/dashboard/assessment','basic-info'],['/dashboard/reports','history-empty'],['/dashboard/family','family-empty'],['/dashboard/settings','settings']]) {
        await page.goto(base+route,{waitUntil:'networkidle'});
        await page.evaluate(async()=>{await document.fonts.ready;for(const image of document.images){image.loading='eager';await image.decode().catch(()=>{});}});
        await page.screenshot({path:`.local/ui-screenshots/${name}-${width}.png`,fullPage:true});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow ${width}`);
        console.log('PASS',name,width);
      }
    }
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base+'/dashboard/assessment',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Family Member',exact:true}).click();
    await page.getByLabel('Family member’s name').fill('Family UI Fixture');
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await page.getByRole('button',{name:'Adult (19–50)',exact:true}).click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('Search symptoms').fill('cough');
    await page.getByRole('button',{name:'Cough',exact:true}).click();
    await page.getByRole('button',{name:'Clear search',exact:true}).click();
    await page.screenshot({path:'.local/ui-screenshots/symptoms-1440.png',fullPage:true});
    await page.getByRole('button',{name:'Back',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Adult (19–50)',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    // Returning to symptoms retains the preceding age; choose the symptom again after editing that prior step.
    await page.getByRole('button',{name:'Cough',exact:true}).click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    for(let step=0;step<9;step++) {
      await page.locator('.section .option').first().waitFor();
      await page.locator('.section .option').first().click();
      if(step===0) await page.screenshot({path:'.local/ui-screenshots/details-1440.png',fullPage:true});
      await page.getByRole('button',{name:step===8?'Review answers':'Continue',exact:true}).click();
    }
    await page.getByRole('button',{name:'Submit Assessment',exact:true}).waitFor();
    await page.screenshot({path:'.local/ui-screenshots/review-1440.png',fullPage:true});
    await page.getByRole('button',{name:'Submit Assessment',exact:true}).click();
    await page.getByText('Assessment saved to your account.',{exact:true}).waitFor({timeout:60000});
    await page.waitForFunction(()=>!document.body.innerText.includes('Reviewing symptoms and estimating'),{},{timeout:60000});
    for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[360,800]]) {
      await page.setViewportSize({width,height});
      await page.screenshot({path:`.local/ui-screenshots/results-${width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'results overflow');
    }
    for(const [route,name] of [['/dashboard','dashboard'],['/dashboard/reports','history'],['/dashboard/family','family']]) {
      await page.goto(base+route,{waitUntil:'networkidle'});
      await page.screenshot({path:`.local/ui-screenshots/${name}-360.png`,fullPage:true});
      await page.setViewportSize({width:1440,height:900});
      await page.screenshot({path:`.local/ui-screenshots/${name}-1440.png`,fullPage:true});
    }
    await page.goto(base+'/dashboard/reports',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Family Assessments',exact:true}).click();
    await page.locator('.assessment-row').first().waitFor();
    await page.locator('.assessment-row').first().click();
    await page.getByText('This is historical guidance from the date of your assessment.',{exact:true}).waitFor();
    await page.screenshot({path:'.local/ui-screenshots/saved-report-1440.png',fullPage:true});
    await page.goto(base+'/dashboard/settings',{waitUntil:'networkidle'});
    await page.getByRole('tab',{name:'Language & Accessibility',exact:true}).click();
    await page.getByRole('button',{name:'हिन्दी (Hindi)',exact:true}).click();
    await page.reload({waitUntil:'networkidle'});
    assert.ok(await page.getByRole('heading',{name:'सेटिंग्स',exact:true}).isVisible());
    console.log('PASS real registration/session, family assessment, back navigation, review, model-backed results, saved history, family grouping, language persistence');
  }
  if(errors.length) throw new Error(errors.join('\n'));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
