import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

/**
 * Regression test for a critical bug found by local-consensus review:
 * the timer-expiry auto-submit effect at App.tsx:381 had a tautological
 * guard that compared the session object to itself, preventing the
 * auto-submit from ever firing. This test verifies the fix.
 *
 * The test injects an in-progress session with remainingSeconds: 0
 * directly into IndexedDB, then reloads. The auto-submit effect should
 * detect the expired timer and submit the session, navigating to the
 * Review page.
 */
test.describe('auto-submit on timer expiry', () => {
  test('session with remainingSeconds: 0 auto-submits on load', async ({ page }) => {
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Inject an in-progress session with remainingSeconds: 0 directly
    // into IndexedDB. This simulates the moment the timer hits zero.
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
            {
              itemId: 'demo-q-1',
              optionOrder: ['A', 'B', 'C', 'D'],
              categoryId: '1',
              categoryLabel: 'D1: Education',
            },
            {
              itemId: 'demo-q-2',
              optionOrder: ['A', 'B', 'C', 'D'],
              categoryId: '2',
              categoryLabel: 'D2: Pre-Transplant',
            },
            {
              itemId: 'demo-q-3',
              optionOrder: ['A', 'B', 'C', 'D'],
              categoryId: '3',
              categoryLabel: 'D3: Post-Op',
            },
          ],
          answers: { 'demo-q-1': 'A', 'demo-q-2': 'B', 'demo-q-3': 'C' },
          revealed: {},
          flaggedForReview: [],
          currentIndex: 0,
          remainingSeconds: 0, // ← timer expired
          timerHidden: false,
        };
        const tx = db.transaction('kv', 'readwrite');
        await new Promise((resolve, reject) => {
          const r = tx.objectStore('kv').put(session, 'active-session');
          r.onsuccess = () => resolve(undefined);
          r.onerror = () => reject(r.error);
        });
        await new Promise((resolve) => { tx.oncomplete = () => resolve(undefined); });
      } finally {
        db.close();
      }
    });

    // Reload — the bootstrap will pick up the expired session, and
    // the auto-submit effect should immediately submit + navigate to
    // Review.
    await page.reload();
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Give the bootstrap + auto-submit + view transition time to run.
    await page.waitForTimeout(3000);

    // Debug: what IDB and page state do we have?
    const debugState = await page.evaluate(async () => {
      const open = indexedDB.open('cctc-app');
      const db = await new Promise((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const history = await new Promise((resolve, reject) => {
        const r = db.transaction('history', 'readonly').objectStore('history').getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return {
        historyCount: history.length,
        historyQuestionCounts: history.map((e) => e.settings.questionCount),
      };
    });
    // (debug logging removed — the regression test is the contract now)
    void debugState;

    // The auto-submit should have written a new history entry. Check
    // the IndexedDB history count before and after.
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

    // Find the auto-submitted entry (by checking for a 3-question
    // result that came from our test session). The test session had
    // questionCount: 3.
    const ourEntry = historyEntries.find((e) => e.settings.questionCount === 3 && !e.sample);
    expect(ourEntry, 'auto-submit should have created a history entry with questionCount=3').toBeTruthy();
    expect(ourEntry.result.total).toBe(3);
    // The auto-submit stamps the session's submittedAt; toHistoryEntry
    // copies it to the history entry's completedAt field.
    expect(ourEntry.completedAt, 'history entry should have completedAt set').toBeTruthy();

    // The auto-submit should also have navigated to the Review page.
    await expect(page.getByText(/Session Review/i)).toBeVisible({ timeout: 10_000 });
  });
});
