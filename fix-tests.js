import fs from 'fs';
import path from 'path';

const files = [
  'e2e/helpers.ts',
  'e2e/arcade-game-over.spec.ts',
  'e2e/profile-switching.spec.ts',
  'e2e/profile-creation-smoke.spec.ts',
  'e2e/saga-node-completion.spec.ts',
  'e2e/daily-challenge.spec.ts',
  'e2e/language-toggle.spec.ts',
  'e2e/unit-progression.spec.ts',
  'e2e/lesson-node-completion.spec.ts',
];

for (const file of files) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // In helpers.ts, selectArcadeMode and toggleLanguage need special care
  if (file === 'e2e/helpers.ts') {
    // Replace arcade-button checks with menu-toggle for saga map verification
    content = content.replace(/const arcadeBtn = page\.locator\('\[data-testid="arcade-button"\]'\)\.first\(\);\s*await expect\(arcadeBtn\)\.toBeVisible\({ timeout: 15000 }\);/g, 
      `const menuToggle = page.locator('[data-testid="menu-toggle"]').first();\n  await expect(menuToggle).toBeVisible({ timeout: 15000 });`);
      
    content = content.replace(/const arcadeBtn = page\.locator\('\[data-testid="arcade-button"\]'\)\.first\(\);\s*if \(await arcadeBtn\.count\(\) > 0\) return;/g,
      `const menuToggle = page.locator('[data-testid="menu-toggle"]').first();\n  if (await menuToggle.count() > 0) return;`);

    // Fix selectArcadeMode
    content = content.replace(/export async function selectArcadeMode[\s\S]*?const arcadeBtn = page\.locator\('\[data-testid="arcade-button"\]'\)\.first\(\);/,
`export async function selectArcadeMode(page: Page, mode: 'zen' | 'classic' | 'blitz' | 'survival') {
  const menuToggle = page.locator('[data-testid="menu-toggle"]').first();
  await expect(menuToggle).toBeVisible({ timeout: 5000 });
  await menuToggle.click();
  await page.waitForTimeout(500);

  const arcadeBtn = page.locator('[data-testid="arcade-button"]').first();`);

    // Fix toggleLanguage
    content = content.replace(/export async function toggleLanguage[\s\S]*?const toggleBtn = page\.locator\('\[data-testid="language-toggle"\]'\)\.first\(\);/,
`export async function toggleLanguage(page: Page): Promise<void> {
  const menuToggle = page.locator('[data-testid="menu-toggle"]').first();
  if (await menuToggle.count() > 0 && await menuToggle.isVisible()) {
    await menuToggle.click();
    await page.waitForTimeout(500);
  }
  const toggleBtn = page.locator('[data-testid="language-toggle"]').first();`);

  } else {
    // In spec files, replace checking arcade-button visibility with menu-toggle visibility
    content = content.replace(/'\[data-testid="arcade-button"\]'/g, `'[data-testid="menu-toggle"]'`);
  }

  fs.writeFileSync(fullPath, content, 'utf8');
}
console.log('Fixed tests');
