import { expect, test } from '@playwright/test';
import {
  dismissDisclaimerIfPresent,
  ensureAppReady,
  expectSessionStats,
  MIN_SESSION_QUESTIONS,
  resumeActiveSession,
  sessionItemHeading,
  startStudySession,
  waitForPersistedSessionState
} from './helpers.mjs';

test.describe('session resume', () => {
  test('reload restores answers, bookmarks, and item order via IndexedDB', async ({ page }) => {
    await page.goto('./');
    const questionCount = await startStudySession(page, MIN_SESSION_QUESTIONS);

    // The session view has one h2: the current question stem. Do not
    // filter by vocabulary because a valid generated stem may not contain
    // words such as "transplant", "recipient", or "donor".
    const questionStem = page.locator('main h2').first();
    const firstStem = await questionStem.textContent();
    const firstOption = page.getByRole('radio').first();

    await firstOption.click();
    await expect(firstOption).toHaveAttribute('aria-checked', 'true');

    // Bookmark — the button contains a Bookmark icon (lucide-bookmark)
    const bookmarkBtn = page.getByRole('button').filter({ has: page.locator('[class*="lucide-bookmark"]') }).first();
    await bookmarkBtn.click();
    await waitForPersistedSessionState(page);

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Wait for IndexedDB session to load (demo data seeding can delay)
    await page.waitForTimeout(1000);
    await resumeActiveSession(page);
    await expect(sessionItemHeading(page, 1, questionCount)).toBeVisible({ timeout: 10000 });
    // Verify the question stem is preserved
    await expect(page.locator('main h2').first()).toHaveText(firstStem ?? '');
    await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
    await expectSessionStats(page, { answered: 1, bookmarks: 1 });

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(sessionItemHeading(page, 2, questionCount)).toBeVisible();

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await resumeActiveSession(page);
    await expect(sessionItemHeading(page, 2, questionCount)).toBeVisible();
  });
});
