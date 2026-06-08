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

    const firstStem = await page.locator('.question-card h3').first().textContent();
    const firstOption = page.getByRole('radio').first();

    await firstOption.click();
    await expect(firstOption).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Bookmark item' }).click();
    await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
    await waitForPersistedSessionState(page);

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await expect(page.getByRole('button', { name: 'Resume current session' })).toBeVisible();
    await resumeActiveSession(page);

    await expect(sessionItemHeading(page, 1, questionCount)).toBeVisible();
    await expect(page.locator('.question-card h3').first()).toHaveText(firstStem ?? '');
    await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
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
