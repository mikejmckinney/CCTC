// d2cc custom step: seed IndexedDB with sample history and flags.
// This file is evaluated inside page.evaluate() by d2cc's visual check.
// It must return a Promise that resolves when seeding is complete.
// See https://github.com/mikejmckinney/d2cc#customstepfiles
(() => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cctc-app", 1);
    request.onerror = () => reject(new Error("Failed to open IndexedDB"));
    request.onsuccess = () => {
      const db = request.result;
      const now = Date.now();
      const day = 86400000;

      const entries = [
        {
          id: "seed-0",
          completedAt: new Date(now - 18 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 10, timed: true, timeMinutes: 30, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 1800, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 7, total: 10, percent: 70, estimatedPass: true, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 2, total: 3 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 3, total: 4 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 2, total: 3 }
          ]}
        },
        {
          id: "seed-1",
          completedAt: new Date(now - 9 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 10, timed: true, timeMinutes: 30, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 2400, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 8, total: 10, percent: 80, estimatedPass: true, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 3, total: 3 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 3, total: 4 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 2, total: 3 }
          ]}
        }
      ];

      const flags = [
        {
          id: "flag-seed-0", item_id: "cctc-1001", version: 1, status: "reviewed",
          reason: "typo / wording", comment: "Sample flag for visual testing",
          session_id: "seed-0", blueprint: "cctc-from-2026-07", mode: "exam",
          createdAt: new Date(now - 2 * day).toISOString(),
          updatedAt: new Date(now - 2 * day).toISOString()
        }
      ];

      const tx = db.transaction(["history", "flags"], "readwrite");
      const historyStore = tx.objectStore("history");
      const flagsStore = tx.objectStore("flags");

      for (const entry of entries) { historyStore.put(entry); }
      for (const flag of flags) { flagsStore.put(flag); }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to seed IndexedDB"));
    };
  });
})()
