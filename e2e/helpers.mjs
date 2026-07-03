import { expect } from '@playwright/test';

/** Matches `QUESTION_MIN` in the session assembly. */
export const MIN_SESSION_QUESTIONS = 10;

export async function ensureAppReady(page) {
  // New app shows "Loading..." while bootstrapping IndexedDB
  try {
    await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30_000 });
  } catch {
    // If "Loading..." never appears, app may already be ready
  }
}

export async function dismissDisclaimerIfPresent(page) {
  const modal = page.getByRole('dialog');

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
  const heading = page.getByText(/Item \d+ of \d+/i);
  await expect(heading).toBeVisible();
  const text = await heading.textContent();
  const match = text?.match(/Item \d+ of (\d+)/i);
  if (!match) {
    throw new Error(`Could not parse session item total from text: ${text}`);
  }
  return Number(match[1]);
}

export async function startStudySession(page, questionCount = MIN_SESSION_QUESTIONS) {
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);

  // Navigate to Setup from the desktop nav
  await page.getByRole('button', { name: 'Setup' }).first().click();

  // Wait for the Setup page to render
  await expect(page.getByRole('heading', { name: /session setup/i })).toBeVisible();

  // Select study mode
  await page.locator('select').first().selectOption('study');

  // Set question count
  await page.getByLabel('Question Count').fill(String(questionCount));

  // Start the session
  await page.getByRole('button', { name: /start session/i }).click();

  await expect(page.getByText(/Item 1 of \d+/i)).toBeVisible();
  return readSessionItemTotal(page);
}

export async function resumeActiveSession(page) {
  // "Resume" appears in the nav bar when a session is active
  await page.getByRole('button', { name: 'Resume' }).first().click();
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

export async function expectSessionStats(page, { answered, bookmarks }) {
  // Stats are rendered as "{N} answered" and "{N} bookmarked" in Badge components
  await expect(page.getByText(`${answered} answered`)).toBeVisible();
  if (bookmarks > 0) {
    await expect(page.getByText(`${bookmarks} bookmarked`)).toBeVisible();
  }
}
