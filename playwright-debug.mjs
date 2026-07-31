import { chromium } from 'playwright';

const APP_URL = 'https://hebrew-math-adventures-2025.web.app';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all console logs
  const logs: string[] = [];
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

  // Screenshot initial state
  await page.screenshot({ path: 'debug-01-initial.png', fullPage: true });
  console.log('Saved debug-01-initial.png');

  // Get page text to understand the UI
  const bodyText = await page.textContent('body');
  console.log('Page text (first 1000):', bodyText?.slice(0, 1000));

  // Look for buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons.slice(0, 20));

  // Look for the daily challenge button
  const challengeBtn = page.locator('button').filter({ hasText: /challenge|אתגר|Start/i }).first();
  if (await challengeBtn.count() > 0) {
    console.log('Found challenge button:', await challengeBtn.textContent());
    await challengeBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('No challenge button found. Looking for level buttons...');
    // Try clicking Level 1
    const levelBtn = page.locator('button, [role="button"]').filter({ hasText: /1|Level|Bubble/i }).first();
    if (await levelBtn.count() > 0) {
      console.log('Found level button:', await levelBtn.textContent());
      await levelBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  await page.screenshot({ path: 'debug-02-after-challenge.png', fullPage: true });

  // Check if mode selector appeared
  const zenBtn = page.locator('button').filter({ hasText: /Zen/i }).first();
  if (await zenBtn.count() > 0) {
    console.log('Found Zen button, clicking...');
    await zenBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'debug-03-in-practice.png', fullPage: true });

  // Now answer questions
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(500);

    // Read the problem
    const text = await page.textContent('body') || '';
    
    // Try to find the equation
    const match = text.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)/);
    if (!match) {
      console.log(`Q${i+1}: No equation found. Text:`, text.slice(0, 200));
      
      // Check if summary appeared
      if (text.match(/summary|סיכום|complete|Play Again|שחק שוב/i)) {
        console.log('Summary screen detected!');
        
        // Check localStorage
        const ls = await page.evaluate(() => {
          const out: Record<string, any> = {};
          for (const k of Object.keys(localStorage)) {
            try { out[k] = JSON.parse(localStorage.getItem(k) || ''); } catch { out[k] = localStorage.getItem(k); }
          }
          return out;
        });
        console.log('localStorage:', JSON.stringify(ls, null, 2));
        
        // Click Play Again
        const playAgain = page.locator('button').filter({ hasText: /again|שוב|play/i }).first();
        if (await playAgain.count() > 0) {
          console.log('Clicking Play Again...');
          await playAgain.click();
          await page.waitForTimeout(2000);
          continue;
        }
      }
      continue;
    }

    const num1 = parseInt(match[1]);
    const op = match[2];
    const num2 = parseInt(match[3]);
    let answer: number;
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

    // Find input
    const input = page.locator('input').first();
    if (await input.count() > 0) {
      await input.fill(String(answer));
    } else {
      // Look for number buttons
      const ansBtn = page.locator(`button:has-text("${answer}")`).first();
      if (await ansBtn.count() > 0) {
        await ansBtn.click();
      } else {
        await page.keyboard.type(String(answer));
      }
    }

    // Click Check button
    const checkBtn = page.locator('button').filter({ hasText: /check|בדוק/i }).first();
    if (await checkBtn.count() > 0) {
      await checkBtn.click();
    } else {
      // Maybe Enter works
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(2500);
  }

  // Final state
  await page.screenshot({ path: 'debug-04-final.png', fullPage: true });

  // Print all DC DEBUG logs
  console.log('\n=== All DC DEBUG logs ===');
  for (const log of logs) {
    if (log.includes('DC DEBUG')) console.log(log);
  }

  // Print all console logs
  console.log('\n=== All console logs (last 30) ===');
  for (const log of logs.slice(-30)) console.log(log);

  // Final localStorage
  const finalLS = await page.evaluate(() => {
    const out: Record<string, any> = {};
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