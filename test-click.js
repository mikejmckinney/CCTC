import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Disclaimer
  await page.locator('button:has-text("I understand")').click({ timeout: 5000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  
  // Seed IndexedDB
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("cctc-app", 1);
      request.onsuccess = () => {
        const db = request.result;
        const now = Date.now();
        const day = 86400000;
        const entries = [
          {
            id: "seed-0",
            completedAt: new Date(now - 15 * day).toISOString(),
            settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 24, timed: true, timeMinutes: 180, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
            timeUsedSeconds: 5400, itemIds: [], items: [], answers: {}, flaggedForReview: [],
            result: { correct: 15, total: 24, percent: 62, estimatedPass: false, breakdown: [
              { categoryId: "1", categoryLabel: "Education", correct: 5, total: 8 },
              { categoryId: "2", categoryLabel: "Pre-transplant", correct: 5, total: 8 },
              { categoryId: "3", categoryLabel: "Post-op", correct: 5, total: 8 }
            ]}
          }
        ];
        const flags = [
          {
            id: "flag-seed-0", item_id: "cctc-1001", version: 1, status: "reviewed",
            reason: "typo / wording", comment: "Sample flag for visual testing",
            session_id: "seed-0", blueprint: "cctc-from-2026-07", mode: "exam",
            createdAt: new Date(now - 2 * day).toISOString(),
            updatedAt: new Date(now - 2 * day).toISOString()
          }
        ];
        const tx = db.transaction(["history", "flags"], "readwrite");
        const historyStore = tx.objectStore("history");
        const flagsStore = tx.objectStore("flags");
        for (const entry of entries) { historyStore.put(entry); }
        for (const flag of flags) { flagsStore.put(flag); }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error("Failed to seed"));
      };
    });
  });
  
  // Reload
  await page.reload({ waitUntil: "networkidle" });
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Progress
  await page.locator('button:has-text("Progress")').first().click();
  await new Promise(r => setTimeout(r, 1000));
  
  // Print all button texts
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText);
  });
  console.log('Buttons on Progress page:', buttons);
  
  // Check if Manage flags is visible
  const manageBtn = page.locator('button:has-text("Manage flags")').first();
  console.log('Manage flags button visible:', await manageBtn.isVisible());
  
  await browser.close();
}

main().catch(console.error);
