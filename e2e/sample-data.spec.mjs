import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

test.describe('sample data', () => {
  test('Dashboard renders banner and Sample badge on history rows', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // The sample-data banner should be visible on the dashboard
    const banner = page.getByRole('status').filter({ hasText: /sample data/i });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: /remove sample data/i })).toBeVisible();
    await expect(banner.getByRole('button', { name: /dismiss sample-data note/i })).toBeVisible();

    // The History page should have a Sample badge on every row (since all
    // seeded sessions are sample data) and a "Remove sample data" action.
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Use accessible-name match — the badge contains the sparkles icon whose
    // accessible name is empty, but the visible text is "Sample".
    const sampleBadges = page.getByText('Sample', { exact: true });
    const count = await sampleBadges.count();
    expect(count).toBeGreaterThan(0);

    await expect(page.getByRole('button', { name: /remove sample data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /clear all/i })).toBeVisible();
  });

  test('Sample session rows show the original question counts (175/100/50/25), not a flat 50', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // The seeded fixture mixes 175q exam, 100q exam, 50q study, 30q study, 25q study.
    // We assert that the largest (175q) and a smaller (25q) are both present
    // — that proves the count is per-session, not a uniform cap.
    const sessionListText = await page.locator('main').first().innerText();
    expect(sessionListText).toMatch(/175q/);
    expect(sessionListText).toMatch(/25q/);
    // And 50q-cap-everything would have replaced the 100q rows.
    expect(sessionListText).toMatch(/100q/);
  });

  test('Exam date pill is always visible, with placeholder when no date is set', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // The pill should always render in the header. First-time users
    // (no exam date in IndexedDB) see a "Set exam date" placeholder.
    const setButton = page.getByRole('button', { name: /set exam date/i });
    await expect(setButton).toBeVisible();
  });

  test('Dismissing the banner hides it without removing data', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    const banner = page.getByRole('status').filter({ hasText: /sample data/i });
    await expect(banner).toBeVisible();

    await page.getByRole('button', { name: /dismiss sample-data note/i }).click();
    await expect(banner).toBeHidden();

    // After dismiss, the History page should still show sample rows + the
    // "Remove sample data" action — only the banner is gone.
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByRole('button', { name: /remove sample data/i })).toBeVisible();
    expect(await page.getByText('Sample', { exact: true }).count()).toBeGreaterThan(0);
  });

  test('Dismissing the disclaimer does not drop the demoSeeded flag (no re-seed on clear+refresh)', async ({ page }) => {
    // Regression for a bug where the disclaimer "I understand" handler
    // overwrote meta with { disclaimerSeen: true } instead of merging,
    // dropping demoSeeded. The next clear+refresh cycle then re-seeded
    // the sample data because the once-only flag was lost.
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Wait for the bootstrap seed to complete (ensureAppReady only
    // waits for "Loading..." to hide, but the seed's async writes
    // continue after that). Poll IndexedDB until history has 12.
    await expect.poll(async () => {
      return page.evaluate(async () => {
        const open = indexedDB.open('cctc-app');
        const db = await new Promise((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
        const count = await new Promise((resolve, reject) => {
          const r = db.transaction('history', 'readonly').objectStore('history').count();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        db.close();
        return count;
      });
    }, { timeout: 10000 }).toBe(12);

    // Confirm the seed wrote demoSeeded:true alongside disclaimerSeen.
    const metaAfterSeed = await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
      const meta = await new Promise((resolve, reject) => {
        const r = db.transaction('kv', 'readonly').objectStore('kv').get('app-meta');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return meta;
    });
    expect(metaAfterSeed?.demoSeeded).toBe(true);
    expect(metaAfterSeed?.disclaimerSeen).toBe(true);

    // Clear all history, refresh, verify history stays empty (no re-seed).
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();
    await page.getByRole('button', { name: /clear all/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete All' }).click();
    await page.waitForTimeout(500);

    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    // Give the bootstrap time to potentially re-seed (it shouldn't).
    await page.waitForTimeout(1000);

    // After refresh: history should still be empty (no re-seed).
    const historyCount = await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
      const count = await new Promise((resolve, reject) => {
        const r = db.transaction('history', 'readonly').objectStore('history').count();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return count;
    });
    expect(historyCount).toBe(0);

    // demoSeeded should still be set after the reload (preserved).
    const metaAfterRefresh = await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
      const meta = await new Promise((resolve, reject) => {
        const r = db.transaction('kv', 'readonly').objectStore('kv').get('app-meta');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return meta;
    });
    expect(metaAfterRefresh?.demoSeeded).toBe(true);
  });

  test('Remove sample data keeps non-sample entries; deletes sample ones', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // The seeded fixture has 12 sample sessions. Simulate one real user
    // session by injecting a non-sample entry into IndexedDB before
    // triggering the remove action.
    await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => {
        open.onerror = () => reject(open.error);
        open.onsuccess = () => resolve(open.result);
      });
      try {
        const tx = db.transaction('history', 'readwrite');
        const realEntry = {
          id: 'user-real-session',
          completedAt: new Date().toISOString(),
          settings: {
            blueprintId: 'cctc-from-2026-07',
            questionSet: 'standard',
            questionCount: 10,
            timed: false,
            timeMinutes: 0,
            showTimer: true,
            mode: 'study',
            includeDrafts: true,
            targetThreshold: 70
          },
          timeUsedSeconds: 600,
          itemIds: [],
          items: [],
          answers: {},
          flaggedForReview: [],
          result: { correct: 7, total: 10, percent: 70, estimatedPass: true, breakdown: [] }
        };
        await new Promise((resolve, reject) => {
          const r = tx.objectStore('history').put(realEntry);
          r.onsuccess = () => resolve(undefined);
          r.onerror = () => reject(r.error);
        });
        await new Promise((resolve) => { tx.oncomplete = () => resolve(undefined); });
      } finally {
        db.close();
      }
    });

    // Reload to re-bootstrap with the new entry
    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Open the remove-sample-data confirm dialog
    await page.getByRole('button', { name: /remove sample data/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Remove Sample Data' })).toBeVisible();

    // The confirm button is inside the dialog; scope the locator to it.
    await dialog.getByRole('button', { name: /remove sample data/i }).click();
    await expect(dialog).toBeHidden();

    // Wait for the React state to settle and re-render before counting.
    await page.waitForTimeout(500);

    // After remove: no Sample badges should remain; the real entry survives.
    const remainingSampleBadges = page.getByText('Sample', { exact: true });
    expect(await remainingSampleBadges.count()).toBe(0);
    // The History page should still show a row (the user-real-session entry).
    const rows = page.locator('button').filter({ hasText: /\d{1,3}%/ });
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
