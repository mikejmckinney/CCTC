import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady, startStudySession } from './helpers.mjs';

test.describe('approved prototype adaptations', () => {
  test('uses the adapted disclaimer and complete support footer', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Independent study aid', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
    await dismissDisclaimerIfPresent(page);

    await expect(page.getByRole('contentinfo')).toContainText('not a source of patient-care decisions');
    const support = page.getByRole('link', { name: 'Support this project' });
    await expect(support).toHaveAttribute('href', 'https://donate.stripe.com/dRm9AMcYs0sa2F8dNQ18c00');
    await expect(support).toHaveAttribute('target', '_blank');
    await expect(support.locator('svg')).toHaveCount(1);
  });

  test('shows a page heading and a dashboard resume panel for active work', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await expect(page.getByText('Independent study aid', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Your CCTC study plan', { exact: true })).toHaveCount(0);

    await startStudySession(page, 5);
    await page.getByRole('button', { name: 'Home' }).first().click();

    await expect(page.getByText('Resume your session')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume session' })).toBeVisible();
  });

  test('surfaces readiness context and a desktop recent-sessions table', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await expect(page.getByText(/EMA change/i)).toBeVisible();
    const table = page.getByRole('table', { name: 'Recent sessions' });
    await expect(table).toBeVisible();
    await table.locator('tbody tr').first().click();
    await expect(page.getByText('Session Review')).toBeVisible();
  });
});
