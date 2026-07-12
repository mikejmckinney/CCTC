import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady, startStudySession } from './helpers.mjs';

test('answers and navigates an active session from the keyboard', async ({ page }) => {
  await page.goto('./');
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);
  await startStudySession(page, 5);

  await expect(page.getByRole('progressbar', { name: 'Session position: item 1 of 5' })).toHaveAttribute('aria-valuenow', '20');

  await page.keyboard.press('b');
  await expect(page.getByRole('radio').nth(1)).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Item 2 of 5')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Session position: item 2 of 5' })).toHaveAttribute('aria-valuenow', '40');
});
