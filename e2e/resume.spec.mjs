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

    // The question stem is in an h2 inside the session Card
    const firstStem = await page.locator('h2').filter({ hasText: /demo question|cctc/i }).first().textContent();
    const firstOption = page.getByRole('radio').first();

    await firstOption.click();
    await expect(firstOption).toHaveAttribute('aria-checked', 'true');

    // Bookmark button uses icon — find by aria-label or the bookmark icon button
    const bookmarkBtn = page.locator('button').filter({ has: page.locator('svg.lucide-bookmark') }).first();
    await bookmarkBtn.click();
    await waitForPersistedSessionState(page);

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Resume appears in the nav bar when a session is active
    await resumeActiveSession(page);

    await expect(sessionItemHeading(page, 1, questionCount)).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: /demo question|cctc/i }).first()).toHaveText(firstStem ?? '');
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
