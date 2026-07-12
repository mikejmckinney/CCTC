import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady, MIN_SESSION_QUESTIONS, startStudySession } from './helpers.mjs';

test.describe('useConfirm dialog', () => {
  test('submit session triggers confirm modal with Submit label', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await page.getByRole('button', { name: /customize settings/i }).click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('exam');
    await page.locator('input[type="number"]').first().fill(String(MIN_SESSION_QUESTIONS));
    await page.getByRole('button', { name: /start with custom settings/i }).click();
    await expect(page.getByText(/Item 1 of \d+/i)).toBeVisible();

    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Submit Exam' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Submit Exam' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Submit' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Cancel keeps the session active
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/Item 1 of \d+/i)).toBeVisible();
  });

  test('delete-all-history shows destructive confirm and Cancel preserves data', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Demo data seeds 12 sessions on first load
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Click "Clear all" trigger
    const clearAll = page.getByRole('button', { name: /clear all/i }).first();
    if (await clearAll.isVisible().catch(() => false)) {
      await clearAll.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: /delete all history/i })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Delete All' })).toBeVisible();

      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();

      // History should still have entries — each row has a delete-session icon button
      const deleteButtons = await page.getByRole('button', { name: 'Delete session' }).count();
      expect(deleteButtons).toBeGreaterThan(0);
    }
  });
});
