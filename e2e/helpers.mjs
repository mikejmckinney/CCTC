import { expect } from '@playwright/test';

export async function ensureAppReady(page) {
  await page.getByText('Loading local study data').waitFor({ state: 'hidden', timeout: 30_000 });
}

export async function dismissDisclaimerIfPresent(page) {
  const modal = page.getByLabel('Study aid disclaimer');

  try {
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return;
  }

  await page.getByRole('button', { name: 'I understand' }).click();
  await expect(modal).toBeHidden();
}

export async function startStudySession(page, questionCount = 2) {
  await ensureAppReady(page);
  await dismissDisclaimerIfPresent(page);
  await expect(page.getByRole('heading', { name: /build a practice session/i })).toBeVisible();

  await page.locator('.settings-grid select').nth(1).selectOption('study');
  await page.locator('.settings-grid input[type="number"]').first().fill(String(questionCount));
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Item 1 of ${questionCount}`, 'i') })).toBeVisible();
}

export async function resumeActiveSession(page) {
  await page.getByRole('button', { name: 'Resume current session' }).click();
  await expect(page.getByRole('heading', { name: /Item \d+ of \d+/i })).toBeVisible();
}
