const { chromium } = require('playwright');

const APP_URL = 'https://hebrew-math-adventures-2025.web.app';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const viewport = { width: 390, height: 844 }; // iPhone 14
  await page.setViewportSize(viewport);

  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (text.includes('DC DEBUG')) console.log('BROWSER:', text);
  });

  console.log('Navigating to', APP_URL);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Clear localStorage to start fresh
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'debug-01-profile-select.png', fullPage: true });
  console.log('Saved debug-01-profile-select.png');

  // Create a new player profile
  console.log('Creating new player...');
  const newPlayerBtn = page.locator('button').filter({ hasText: /New Player/i }).first();
  if (await newPlayerBtn.count() > 0) {
    await newPlayerBtn.click();
    await page.waitForTimeout(1000);
  }

  // Maybe need to enter a name
  const nameInput = page.locator('input').first();
  if (await nameInput.count() > 0) {
    console.log('Found name input, typing name...');
    await nameInput.fill('TestPlayer');
    await page.waitForTimeout(500);
  }

  // Look for a confirm/save button
  const saveBtn = page.locator('button').filter({ hasText: /save|ok|confirm|start|שמור|אישור|התחל/i }).first();
  if (await saveBtn.count() > 0) {
    console.log('Clicking save button:', await saveBtn.textContent());
    await saveBtn.click();
    await page.waitForTimeout(2000);
  }

  // Maybe there's a "Tap to start" or similar
  const startBtn = page.locator('button').filter({ hasText: /start|tap|play|התחל/i }).first();
  if (await startBtn.count() > 0) {
    console.log('Clicking start button:', await startBtn.textContent());
    await startBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'debug-02-after-profile.png', fullPage: true });
  console.log('Saved debug-02-after-profile.png');

  const bodyText = await page.textContent('body');
  console.log('Page text (first 1500):', bodyText?.slice(0, 1500));

  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons.slice(0, 30));

  // Look for the daily challenge button
  const challengeBtn = page.locator('button').filter({ hasText: /challenge|אתגר|Start/i }).first();
  if (await challengeBtn.count() > 0) {
    console.log('Found challenge button:', await challengeBtn.textContent());
    await challengeBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('No challenge button found. Looking for level buttons...');
    const levelBtn = page.locator('button, [role="button"]').filter({ hasText: /1|Level|Bubble/i }).first();
    if (await levelBtn.count() > 0) {
      console.log('Found level button:', await levelBtn.textContent());
      await levelBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  await page.screenshot({ path: 'debug-03-after-challenge.png', fullPage: true });
  console.log('Saved debug-03-after-challenge.png');

  // Check if mode selector appeared
  const zenBtn = page.locator('button').filter({ hasText: /Zen/i }).first();
  if (await zenBtn.count() > 0) {
    console.log('Found Zen button, clicking...');
    await zenBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'debug-04-in-practice.png', fullPage: true });
  console.log('Saved debug-04-in-practice.png');

  // Now answer questions
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(500);

    const text = await page.textContent('body') || '';

    // Check for summary/complete screen first
    if (text.match(/summary|סיכום|complete|Play Again|שחק שוב|Well done|כל הכבוד/i)) {
      console.log(`Q${i+1}: Summary screen detected!`);

      const ls = await page.evaluate(() => {
        const out = {};
        for (const k of Object.keys(localStorage)) {
          try { out[k] = JSON.parse(localStorage.getItem(k) || ''); } catch { out[k] = localStorage.getItem(k); }
        }
        return out;
      });
      console.log('localStorage:', JSON.stringify(ls, null, 2));

      const playAgain = page.locator('button').filter({ hasText: /again|שוב|play/i }).first();
      if (await playAgain.count() > 0) {
        console.log('Clicking Play Again...');
        await playAgain.click();
        await page.waitForTimeout(2000);
        continue;
      }
    }

    const match = text.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)/);
    if (!match) {
      console.log(`Q${i+1}: No equation found. Text:`, text.slice(0, 300));
      continue;
    }

    const num1 = parseInt(match[1]);
    const op = match[2];
    const num2 = parseInt(match[3]);
    let answer;
    switch (op) {
      case '+': answer = num1 + num2; break;
      case '-':
      case '−': answer = num1 - num2; break;
      case '*':
      case '×': answer = num1 * num2; break;
      case '÷': answer = num1 / num2; break;
      default: answer = num1 + num2;
    }
    console.log(`Q${i+1}: ${num1} ${op} ${num2} = ${answer}`);

    const input = page.locator('input').first();
    if (await input.count() > 0) {
      await input.fill(String(answer));
    } else {
      const ansBtn = page.locator(`button:has-text("${answer}")`).first();
      if (await ansBtn.count() > 0) {
        await ansBtn.click();
      } else {
        await page.keyboard.type(String(answer));
      }
    }

    const checkBtn = page.locator('button').filter({ hasText: /check|בדוק/i }).first();
    if (await checkBtn.count() > 0) {
      await checkBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: 'debug-05-final.png', fullPage: true });

  console.log('\n=== All DC DEBUG logs ===');
  for (const log of logs) {
    if (log.includes('DC DEBUG')) console.log(log);
  }

  console.log('\n=== All console logs (last 50) ===');
  for (const log of logs.slice(-50)) console.log(log);

  const finalLS = await page.evaluate(() => {
    const out = {};
    for (const k of Object.keys(localStorage)) {
      try { out[k] = JSON.parse(localStorage.getItem(k) || ''); } catch { out[k] = localStorage.getItem(k); }
    }
    return out;
  });
  console.log('\n=== Final localStorage ===');
  console.log(JSON.stringify(finalLS, null, 2));

  await browser.close();
}

main().catch(console.error);