import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

test.describe('view transitions', () => {
  test('navigating to History applies a direction class to <main>', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // The <main> starts with the base class and no view-transition-class
    // set (which would propagate to the snapshot pseudo-element).
    const before = await page.locator('main').evaluate((el) => ({
      class: el.className,
      viewTransitionClass: el.style.viewTransitionClass,
    }));
    expect(before.class).toContain('vt-page-anim');
    expect(before.viewTransitionClass).toBe('');

    // Click Progress (in the desktop nav). The navigate() helper sets
    // the direction synchronously inside startViewTransition, so by
    // the time the click resolves, view-transition-class is already
    // set (the property propagates to the snapshot pseudo-element).
    await page.getByRole('button', { name: 'Progress' }).click();

    const after = await page.locator('main').evaluate((el) => ({
      class: el.className,
      viewTransitionClass: el.style.viewTransitionClass,
    }));
    // The view-transition-class must be one of the four directions.
    expect(after.viewTransitionClass).toMatch(/^vt-(slide-forward|slide-back|descend|ascend)$/);

    // The class is cleared after the transition completes (the helper
    // resets it in the .finally() block). Wait for the animation
    // duration plus a small buffer.
    await page.waitForTimeout(700);
    const settled = await page.locator('main').evaluate((el) => ({
      class: el.className,
      viewTransitionClass: el.style.viewTransitionClass,
    }));
    expect(settled.viewTransitionClass).toBe('');
  });

  test('opening a modal applies the enter class', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Navigate to Progress where the Clear All button + dialog live.
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Open the confirm dialog.
    await page.getByRole('button', { name: /clear all/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // The dialog content has vt-modal-enter (not vt-modal-exit) while open.
    // The Modal renders two child divs: the backdrop, then the content
    // panel (with the rounded/shadow classes).
    const contentPanel = dialog.locator('> div').nth(1);
    const enterClass = await contentPanel.getAttribute('class');
    expect(enterClass).toContain('vt-modal-enter');
    expect(enterClass).not.toContain('vt-modal-exit');

    // Cancel — the exit class is applied for the duration of the
    // animation, then the dialog unmounts.
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // Brief window where exit class is applied (120ms in CSS).
    // We use a short wait to catch the exit class before unmount.
    await page.waitForTimeout(40);
    const exitVisible = await dialog.isVisible().catch(() => false);
    if (exitVisible) {
      const exitClass = await dialog.locator('> div').nth(1).getAttribute('class');
      expect(exitClass).toContain('vt-modal-exit');
    }

    // After the exit animation completes, the dialog is gone.
    await expect(dialog).toBeHidden();
  });

  test('theme toggle suppresses the named page snapshot during the circular wipe', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await page.getByRole('button', { name: /switch to (dark|light) mode/i }).click();

    await expect(page.locator('html')).toHaveClass(/theme-transition/);
    await expect(page.locator('main')).toHaveCSS('view-transition-name', 'none');
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/, { timeout: 2_000 });
  });
});
