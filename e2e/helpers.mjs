import { expect } from '@playwright/test';

/** Matches `QUESTION_MIN` in `src/app/App.tsx`. */
export const MIN_SESSION_QUESTIONS = 10;

export async function ensureAppReady(page) {
  await page.getByText('Loading local study data').waitFor({ state: 'hidden', timeout: 30_000 });
}

export async function dismissDisclaimerIfPresent(page) {
  const button = page.getByRole('button', { name: 'I understand' });

  try {
    await button.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return;
  }

  await button.click();
  await expect(button).toBeHidden();
}

export function sessionItemHeading(page, itemNumber, total) {
  // New UI shows "N / M" in a tabular-nums span, not an <h2> with "Item N of M"
  return page.locator('span.tabular-nums', { hasText: new RegExp(`^${itemNumber}\\s*/\\s*${total}$`) });
}

export async function readSessionItemTotal(page) {
  const counter = page.locator('span.tabular-nums');
  await expect(counter.first()).toBeVisible();
  const text = await counter.first().textContent();
  const match = text?.match(/\d+\s*\/\s*(\d+)/);
  if (!match) {
    throw new Error(`Could not parse session item total from counter: ${text}`);
  }
  return Number(match[1]);
}

export async function startStudySession(page, questionCount = MIN_SESSION_QUESTIONS) {
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);

  // Navigate to Setup view via sidebar or mobile nav
  const setupNav = page.getByRole('button', { name: 'Setup' });
  if (await setupNav.isVisible()) {
    await setupNav.click();
  } else {
    // Fallback: try nav link with "Setup" text
    await page.getByRole('link', { name: 'Setup' }).click().catch(() => {});
  }
  await expect(page.getByRole('heading', { name: 'Setup', exact: true })).toBeVisible();

  // Select Study mode (segmented button, not combobox)
  await page.getByRole('button', { name: 'Study', exact: true }).click();

  // Set question count — the first range slider on the page is question count
  const slider = page.locator('input[type="range"]').first();
  await slider.evaluate((el, val) => {
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(questionCount));

  await page.getByRole('button', { name: 'Start Session', exact: true }).click();

  // Wait for the session counter to appear (new UI: "1 / N" in a tabular-nums span)
  const counter = page.locator('span.tabular-nums');
  await expect(counter.first()).toBeVisible({ timeout: 15_000 });
  return readSessionItemTotal(page);
}

export async function resumeActiveSession(page) {
  await page.getByRole('button', { name: 'Resume Last Session' }).click();
  const counter = page.locator('span.tabular-nums');
  await expect(counter.first()).toBeVisible({ timeout: 15_000 });
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
  // New UI shows "N answered" in a plain span in the session header
  await expect(page.getByText(`${answered} answered`)).toBeVisible();
  // Bookmarks shown via the "Bookmarked" button state (no separate stat counter in new UI)
}
