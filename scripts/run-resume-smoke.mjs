#!/usr/bin/env node

import { chromium } from 'playwright';
import {
  dismissDisclaimerIfPresent,
  ensureAppReady,
  resumeActiveSession,
  startStudySession
} from '../e2e/helpers.mjs';

const baseURL = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    await page.goto(`${baseURL}/`);
    await startStudySession(page, 2);

    const firstStem = await page.locator('.question-card h3').first().textContent();
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Bookmark item' }).click();
    await page.getByText('Bookmarks 1').waitFor();

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await resumeActiveSession(page);
    await page.getByRole('heading', { name: /Item 1 of 2/i }).waitFor();

    const stemAfterResume = await page.locator('.question-card h3').first().textContent();
    if (stemAfterResume !== firstStem) {
      throw new Error(`Stem changed after resume: ${firstStem} -> ${stemAfterResume}`);
    }

    const checked = await page.getByRole('radio').first().getAttribute('aria-checked');
    if (checked !== 'true') {
      throw new Error(`Expected first answer to remain selected after resume, got aria-checked=${checked}`);
    }

    await page.getByText('Bookmarks 1').waitFor();
    await page.getByText('Answered 1').waitFor();

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('heading', { name: /Item 2 of 2/i }).waitFor();

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await resumeActiveSession(page);
    await page.getByRole('heading', { name: /Item 2 of 2/i }).waitFor();

    console.log('Resume smoke test passed');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
