import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

/**
 * Regression test for a critical bug found by local-consensus review:
 * the timer-expiry auto-submit effect had a tautological guard that
 * compared the session object to itself, preventing the auto-submit
 * from ever firing.
 *
 * Uses real bank question IDs (cctc-1001, cctc-1002, cctc-1003) so
 * the scoring path is exercised too — previous versions used fake
 * demo-q-* IDs which scoreSession would skip.
 *
 * Answers chosen so 2/3 are correct (cctc-1001=B, cctc-1002=A→wrong,
 * cctc-1003=A).
 */
test.describe('auto-submit on timer expiry', () => {
  test('session with remainingSeconds: 0 auto-submits on load with real bank items', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Inject an expired session into IDB, then verify the write is
    // visible before reloading. This avoids the race where
    // page.reload() fires before the IDB transaction fsyncs.
    await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      try {
        const sessionId = `test-timer-expired-${Date.now()}`;
        const session = {
          id: sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            blueprintId: 'cctc-from-2026-07',
            questionSet: 'standard',
            questionCount: 3,
            timed: true,
            timeMinutes: 1,
            showTimer: true,
            mode: 'exam',
            includeDrafts: false,
            targetThreshold: 70,
          },
          shortageNotes: [],
          bankSummary: [],
          items: [
            { itemId: 'cctc-1001', optionOrder: ['A','B','C','D'], categoryId: '1', categoryLabel: 'D1: Education' },
            { itemId: 'cctc-1002', optionOrder: ['A','B','C','D'], categoryId: '1', categoryLabel: 'D1: Education' },
            { itemId: 'cctc-1003', optionOrder: ['A','B','C','D'], categoryId: '1', categoryLabel: 'D1: Education' },
          ],
          answers: { 'cctc-1001': 'B', 'cctc-1002': 'A', 'cctc-1003': 'A' },
          revealed: {},
          flaggedForReview: [],
          currentIndex: 0,
          remainingSeconds: 0,
          timerHidden: false,
        };
        await new Promise((resolve, reject) => {
          const tx = db.transaction('kv', 'readwrite');
          const r = tx.objectStore('kv').put(session, 'active-session');
          r.onsuccess = () => resolve(undefined);
          r.onerror = () => reject(r.error);
          tx.oncomplete = () => resolve(undefined);
        });
        // Verify the write is readable in a separate transaction.
        // This is the belt-and-suspenders check that the IDB fsync
        // happened before page.reload() navigates away.
        for (let i = 0; i < 20; i++) {
          const found = await new Promise((resolve) => {
            const tx = db.transaction('kv', 'readonly');
            const r = tx.objectStore('kv').get('active-session');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => resolve(null);
          });
          if (found && found.id === sessionId) return;
          await new Promise((r) => setTimeout(r, 50));
        }
        throw new Error('active-session write not readable after 20 retries');
      } finally {
        db.close();
      }
    });

    // Reload — the bootstrap picks up the expired session. The
    // auto-submit effect detects remainingSeconds: 0, scores,
    // saves to history, clears active session, navigates to Review.
    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);
    await page.waitForTimeout(8000);

    // Verify the history entry was created with the real bank IDs.
    const historyEntries = await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const all = await new Promise((resolve, reject) => {
        const r = db.transaction('history', 'readonly').objectStore('history').getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return all;
    });

    const ourEntry = historyEntries.find(
      (e) => e.itemIds?.includes('cctc-1001') &&
             e.itemIds?.includes('cctc-1002') &&
             e.itemIds?.includes('cctc-1003') &&
             !e.sample
    );
    expect(ourEntry, 'auto-submit should have created a history entry with the real bank IDs').toBeTruthy();
    expect(ourEntry.result.total).toBe(3);
    expect(ourEntry.result.correct).toBe(2);
    expect(ourEntry.result.percent).toBe(67);
    expect(ourEntry.completedAt, 'history entry should have completedAt set').toBeTruthy();

    // The auto-submit should have navigated to the Review page.
    await expect(page.getByText(/Session Review/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/2\/3 correct/)).toBeVisible();
  });
});
