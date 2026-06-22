import { expect } from '@playwright/test';

/** Matches `QUESTION_MIN` in `src/app/App.tsx`. */
export const MIN_SESSION_QUESTIONS = 10;

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

export function sessionItemHeading(page, itemNumber, total) {
  return page.getByText(new RegExp(`Item ${itemNumber} of ${total}`, 'i'));
}

export async function readSessionItemTotal(page) {
  const heading = page.getByText(/Item \d+ of \d+/i).first();
  await expect(heading).toBeVisible();
  const text = await heading.textContent();
  const match = text?.match(/Item \d+ of (\d+)/i);
  if (!match) {
    throw new Error(`Could not parse session item total from heading: ${text}`);
  }
  return Number(match[1]);
}

export async function startStudySession(page, questionCount = MIN_SESSION_QUESTIONS) {
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);
  await page.getByRole('tab', { name: 'Setup' }).click();
  await expect(page.getByRole('heading', { name: /customize/i })).toBeVisible();

  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await page.getByLabel('Question count').fill(String(questionCount));
  await page.getByRole('button', { name: new RegExp(`Start study · ${questionCount} items`, 'i') }).click();

  await expect(page.getByText(/Item 1 of \d+/i)).toBeVisible();
  return readSessionItemTotal(page);
}

export async function resumeActiveSession(page) {
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByText(/Item \d+ of \d+/i)).toBeVisible();
}

export async function waitForPersistedSessionState(page) {
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

export async function expectSessionBookmarked(page) {
  await expect(page.getByRole('button', { name: 'Bookmarked' })).toBeVisible();
}

export async function expectSessionStats(page, { answered, bookmarks }) {
  if (bookmarks > 0) {
    await expectSessionBookmarked(page);
  }
  if (answered > 0) {
    await expect(page.getByRole('radio', { checked: true }).first()).toBeVisible();
  }
}
