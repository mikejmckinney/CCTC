import { expect } from '@playwright/test';

export async function ensureAppReady(page) {
  await page.getByText('Loading local study data').waitFor({ state: 'hidden', timeout: 30_000 });
}

export async function dismissDisclaimerIfPresent(page) {
  const modal = page.getByLabel('Study aid disclaimer');

  try {
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return;
  }

  await page.getByRole('button', { name: 'I understand' }).click();
  await expect(modal).toBeHidden();
}

export async function startStudySession(page, questionCount = 2) {
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);
  await expect(page.getByRole('heading', { name: /build a practice session/i })).toBeVisible();

  await page.locator('.settings-grid select').nth(1).selectOption('study');
  await page.locator('.settings-grid input[type="number"]').first().fill(String(questionCount));
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Item 1 of ${questionCount}`, 'i') })).toBeVisible();
}

export async function resumeActiveSession(page) {
  await page.getByRole('button', { name: 'Resume current session' }).click();
  await expect(page.getByRole('heading', { name: /Item \d+ of \d+/i })).toBeVisible();
}

export async function waitForPersistedSessionState(page) {
  await page.waitForFunction(
    async () => {
      const open = indexedDB.open('ccte-app');
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

        return (
          Array.isArray(session?.flaggedForReview) &&
          session.flaggedForReview.length > 0 &&
          Object.values(session?.answers ?? {}).some(Boolean)
        );
      } finally {
        db.close();
      }
    },
    null,
    { timeout: 15_000 }
  );
}

export async function expectSessionStats(page, { answered, bookmarks }) {
  const stats = page.locator('.session-stats');
  await expect(stats.getByText(`Answered ${answered}`, { exact: true })).toBeVisible();
  await expect(stats.getByText(`Bookmarks ${bookmarks}`, { exact: true })).toBeVisible();
}
