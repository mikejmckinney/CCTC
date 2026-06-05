import { expect, test } from '@playwright/test';
import {
  dismissDisclaimerIfPresent,
  ensureAppReady,
  expectSessionStats,
  resumeActiveSession,
  startStudySession,
  waitForPersistedSessionState
} from './helpers.mjs';

test.describe('session resume', () => {
  test('reload restores answers, bookmarks, and item order via IndexedDB', async ({ page }) => {
    await page.goto('./');
    await startStudySession(page, 2);

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

    await expect(page.getByRole('heading', { name: /Item 1 of 2/i })).toBeVisible();
    await expect(page.locator('.question-card h3').first()).toHaveText(firstStem ?? '');
    await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
    await expectSessionStats(page, { answered: 1, bookmarks: 1 });

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: /Item 2 of 2/i })).toBeVisible();

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await resumeActiveSession(page);
    await expect(page.getByRole('heading', { name: /Item 2 of 2/i })).toBeVisible();
  });
});
