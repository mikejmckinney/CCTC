import { expect, test } from '@playwright/test';
import {
  dismissDisclaimerIfPresent,
  ensureAppReady,
  expectSessionStats,
  MIN_SESSION_QUESTIONS,
  sessionItemHeading,
  startStudySession,
  waitForPersistedSessionState
} from './helpers.mjs';

test.describe('session resume', () => {
  test('reload restores answers, bookmarks, and item order via IndexedDB', async ({ page }) => {
    await page.goto('./');
    const questionCount = await startStudySession(page, MIN_SESSION_QUESTIONS);

    const firstStem = await page.locator('.question-card h3').first().textContent();
    const firstOption = page.getByRole('radio').first();

    await firstOption.click();
    await expect(firstOption).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Bookmark' }).click();
    await expect(page.getByRole('button', { name: 'Unbookmark' })).toBeVisible();
    await waitForPersistedSessionState(page);

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // URL stays at /session after reload; session restores from IndexedDB
    await expect(sessionItemHeading(page, 1, questionCount)).toBeVisible();
    await expect(page.locator('.question-card h3').first()).toHaveText(firstStem ?? '');
    await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: 'Unbookmark' })).toBeVisible();
    await expectSessionStats(page, { answered: 1, bookmarks: 1 });

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(sessionItemHeading(page, 2, questionCount)).toBeVisible();
    // Wait for the updated currentIndex to be persisted to IndexedDB
    await page.waitForFunction(
      async () => {
        const open = indexedDB.open('cctc-app');
        const db = await new Promise((resolve, reject) => {
          open.onerror = () => reject(open.error);
          open.onsuccess = () => resolve(open.result);
        });
        try {
          const tx = db.transaction('kv', 'readonly');
          const session = await new Promise((resolve, reject) => {
            const request = tx.objectStore('kv').get('active-session');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          });
          return session?.currentIndex === 1;
        } finally {
          db.close();
        }
      },
      null,
      { timeout: 10_000 }
    );

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await expect(sessionItemHeading(page, 2, questionCount)).toBeVisible();
  });
});
