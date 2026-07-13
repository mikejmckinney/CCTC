import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

test('uses prototype light surfaces and full-width mobile domain bars', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);

  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(244, 239, 230)');
  await expect.poll(() => page.getByRole('button', { name: /Full Exam/ }).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(250, 245, 236)');

  await page.getByRole('button', { name: 'Progress' }).last().click();
  const firstRecord = page.locator('[data-session-record]').first();
  await expect(firstRecord).toBeVisible();
  const firstDomainBar = firstRecord.getByRole('progressbar').first();
  const layout = await firstDomainBar.evaluate((bar) => {
    const record = bar.closest('[data-session-record]');
    const chevron = record?.querySelector('[data-record-chevron]');
    return {
      widthRatio: record ? bar.getBoundingClientRect().width / record.getBoundingClientRect().width : 0,
      chevronDisplay: chevron ? getComputedStyle(chevron).display : null,
    };
  });

  expect(layout.widthRatio).toBeGreaterThan(0.85);
  expect(layout.chevronDisplay).toBe('none');
});

test('uses prototype solid greens for dark-mode dashboard fills', async ({ page }) => {
  await page.goto('./');
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);
  const darkModeToggle = page.getByRole('button', { name: 'Switch to dark mode' }).first();
  if (await darkModeToggle.isVisible()) await darkModeToggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const colors = await page.locator('html').evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      primarySolid: styles.getPropertyValue('--primary-solid').trim(),
      successSolid: styles.getPropertyValue('--success-solid').trim(),
    };
  });

  expect(colors).toEqual({ primarySolid: '#1d544f', successSolid: '#3f9d72' });
  await expect(page.locator('[data-quick-start-icon]').first()).toHaveCSS('background-color', 'rgb(29, 84, 79)');
});
