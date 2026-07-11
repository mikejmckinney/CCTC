import { expect, test } from '@playwright/test';
import { dismissDisclaimerIfPresent, ensureAppReady } from './helpers.mjs';

test.describe('auto-sync connected card', () => {
  test('connected card shows the auto-sync blurb and folder name', async ({ page }) => {
    // The File System Access API requires a user gesture, so we can't
    // auto-invoke showDirectoryPicker from a test. Inject a mock that
    // returns a writable in-memory directory with the surface
    // syncWithFolder needs. Initial sample sessions are written into it.
    await page.addInitScript(() => {
      const makeFakeHandle = (name) => {
        const files = new Map();
        const fileHandle = (fileName) => ({
          kind: 'file',
          name: fileName,
          async getFile() {
            const contents = files.get(fileName) ?? '';
            return { text: async () => contents };
          },
          async createWritable() {
            return {
              async write(contents) { files.set(fileName, String(contents)); },
              async close() {},
            };
          },
        });
        return {
          kind: 'directory',
          name,
          async queryPermission() { return 'granted'; },
          async requestPermission() { return 'granted'; },
          async *entries() {
            for (const fileName of files.keys()) yield [fileName, fileHandle(fileName)];
          },
          async getFileHandle(fileName, options = {}) {
            if (!files.has(fileName) && !options.create) {
              throw new DOMException('Not found', 'NotFoundError');
            }
            if (!files.has(fileName)) files.set(fileName, '');
            return fileHandle(fileName);
          },
        };
      };
      // Mock showDirectoryPicker to return a fake handle.
      window.showDirectoryPicker = async () =>
        makeFakeHandle('Mock Drive');
    });

    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    // Navigate to the History page.
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Click Connect folder — this triggers the mocked picker and
    // runs the initial sync. Wait for the connected card.
    await page.getByRole('button', { name: /connect folder/i }).click();

    // Folder name appears once connected.
    await expect(page.getByText(/Mock Drive/)).toBeVisible();

    // The auto-sync blurb (per user spec) is on the connected card.
    await expect(
      page.getByText(/Auto-syncs a moment after each answer and when you finish a session\./i)
    ).toBeVisible();

    // The Sync now button is present and enabled (manual sync still
    // works alongside auto-sync).
    await expect(
      page.getByRole('button', { name: /sync now/i })
    ).toBeEnabled();
  });

  test('disconnected card does NOT show the auto-sync blurb', async ({ page }) => {
    // No init script → showDirectoryPicker is undefined → connect
    // button click is a no-op (or shows the "needs Chromium" msg).
    // Either way, the blurb must not appear.
    await page.goto('./');
    await ensureAppReady(page);
    await dismissDisclaimerIfPresent(page);

    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText('Progress Over Time')).toBeVisible();

    // Blurb should not be present until a folder is connected.
    expect(
      await page.getByText(/Auto-syncs a moment after each answer/i).count()
    ).toBe(0);

    // Click Connect folder; in a non-FSA browser (or in the test
    // context without our mock), the click is a no-op or shows an
    // error message. Either way, the blurb must still be absent.
    const connectBtn = page.getByRole('button', { name: /connect folder/i });
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);
    }
    expect(
      await page.getByText(/Auto-syncs a moment after each answer/i).count()
    ).toBe(0);
  });
});
