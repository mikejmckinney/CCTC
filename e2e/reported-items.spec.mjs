import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

test.describe('reported items', () => {
  test('demo data seeds flags and Reported Items page is reachable', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Demo data seeds 3 flags on first load
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Navigate to Reported Items via the link on the History page
    await page.getByRole('button', { name: /reported items/i }).click();
    await expect(page.getByRole('heading', { name: 'Reported Items' })).toBeVisible();

    // Export and Clear All should be enabled with seeded flags
    await expect(page.getByRole('button', { name: /export/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /clear all/i })).toBeEnabled();

    // At least one report row should be visible
    const deleteButtons = await page.getByRole('button', { name: 'Delete report' }).count();
    expect(deleteButtons).toBeGreaterThan(0);
  });
});
