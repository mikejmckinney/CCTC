// d2cc custom step: seed IndexedDB with sample history and flags.
// This file is evaluated inside page.evaluate() by d2cc's visual check.
// It must return a Promise that resolves when seeding is complete.
// See https://github.com/mikejmckinney/d2cc#customstepfiles
//
// Matches the prototype's seedHistory() function: 6 exam/study sessions
// with per-domain breakdowns matching the prototype's targets.
(() => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cctc-app", 1);
    request.onerror = () => reject(new Error("Failed to open IndexedDB"));
    request.onsuccess = () => {
      const db = request.result;
      const now = Date.now();
      const day = 86400000;

      // Match prototype's seedHistory: 6 sessions with overalls [62,66,67,71,73,78]
      // Prototype domain targets: Education=78, Pre-transplant=70, Post-op=61
      const entries = [
        {
          id: "seed-0",
          completedAt: new Date(now - 15 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 24, timed: true, timeMinutes: 180, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 5400, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 15, total: 24, percent: 62, estimatedPass: false, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 5, total: 8 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 5, total: 8 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 5, total: 8 }
          ]}
        },
        {
          id: "seed-1",
          completedAt: new Date(now - 12 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 24, timed: true, timeMinutes: 180, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 6000, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 16, total: 24, percent: 66, estimatedPass: false, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 5, total: 8 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 6, total: 8 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 5, total: 8 }
          ]}
        },
        {
          id: "seed-2",
          completedAt: new Date(now - 9 * day).toISOString(),
          settings: { blueprintId: "cctc-thru-2026-06", questionSet: "standard", questionCount: 24, timed: false, timeMinutes: 180, showTimer: true, mode: "study", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: null, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 16, total: 24, percent: 67, estimatedPass: false, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 5, total: 8 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 5, total: 8 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 6, total: 8 }
          ]}
        },
        {
          id: "seed-3",
          completedAt: new Date(now - 6 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 24, timed: true, timeMinutes: 180, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 7200, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 17, total: 24, percent: 71, estimatedPass: true, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 6, total: 8 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 5, total: 8 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 6, total: 8 }
          ]}
        },
        {
          id: "seed-4",
          completedAt: new Date(now - 3 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 24, timed: true, timeMinutes: 180, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 6500, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 18, total: 24, percent: 75, estimatedPass: true, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 6, total: 8 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 6, total: 8 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 6, total: 8 }
          ]}
        },
        {
          id: "seed-5",
          completedAt: new Date(now - 1 * day).toISOString(),
          settings: { blueprintId: "cctc-from-2026-07", questionSet: "standard", questionCount: 24, timed: true, timeMinutes: 180, showTimer: true, mode: "exam", includeDrafts: false, targetThreshold: 70 },
          timeUsedSeconds: 5800, itemIds: [], items: [], answers: {}, flaggedForReview: [],
          result: { correct: 19, total: 24, percent: 79, estimatedPass: true, breakdown: [
            { categoryId: "1", categoryLabel: "Education", correct: 7, total: 8 },
            { categoryId: "2", categoryLabel: "Pre-transplant", correct: 6, total: 8 },
            { categoryId: "3", categoryLabel: "Post-op", correct: 6, total: 8 }
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

      // Also seed the kv store to dismiss the disclaimer modal
      const metaEntry = { disclaimerSeen: true };

      const tx = db.transaction(["history", "flags", "kv"], "readwrite");
      const historyStore = tx.objectStore("history");
      const flagsStore = tx.objectStore("flags");
      const kvStore = tx.objectStore("kv");

      for (const entry of entries) { historyStore.put(entry); }
      for (const flag of flags) { flagsStore.put(flag); }
      kvStore.put(metaEntry, "app-meta");

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to seed IndexedDB"));
    };
  });
})()
