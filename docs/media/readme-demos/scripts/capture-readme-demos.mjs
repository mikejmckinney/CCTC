#!/usr/bin/env node
/**
 * Playwright live captures of the production CCTC app for README demos.
 * Run from repo root after `npm run build`.
 */
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const MEDIA_ROOT = path.join(REPO_ROOT, 'docs/media/readme-demos');
const OUT_DIR = path.join(MEDIA_ROOT, '.outputs');
const POSTER_DIR = path.join(MEDIA_ROOT, 'posters');
const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 4173;
const BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
const MIN_QUESTIONS = 10;
const VIEWPORT = { width: 1920, height: 1080 };
const SLOW_MO_MS = 120;
const DEMO_ORDER = [
  '01-setup',
  '02-study-mode',
  '03-exam-navigation-flagging',
  '04-score-history',
  '05-resume-session',
  '00-hero-overview'
];

function pacing(page) {
  const pause = (ms = 600) => page.waitForTimeout(ms);
  const clickChoice = async (locator) => {
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    }
    await pause(250);
    await locator.click();
    await pause(500);
  };
  const fillChoice = async (locator, value) => {
    await locator.click();
    await pause(200);
    await locator.fill(String(value));
    await pause(400);
  };
  return { pause, clickChoice, fillChoice };
}

async function ensureAppReady(page) {
  await page.getByText('Loading local study data').waitFor({ state: 'hidden', timeout: 60_000 });
}

async function dismissDisclaimer(page) {
  const modal = page.getByLabel('Study aid disclaimer');
  try {
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
    await page.getByRole('button', { name: 'I understand' }).click();
    await modal.waitFor({ state: 'hidden' });
  } catch {
    // already dismissed
  }
}

async function prepareHome(page, { pause }) {
  await page.goto('./');
  await ensureAppReady(page);
  await dismissDisclaimer(page);
  await page.getByRole('heading', { name: /build a practice session/i }).waitFor();
  await pause(1200);
}

async function startSession(page, { pause, clickChoice, fillChoice }, { mode = 'study', count = MIN_QUESTIONS } = {}) {
  await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption(mode);
  await pause(400);
  await fillChoice(page.getByRole('spinbutton', { name: /^Question count/i }), count);
  await clickChoice(page.getByRole('button', { name: /Start session/i }));
  await page.getByRole('heading', { name: /Item 1 of/i }).waitFor();
  await pause(800);
}

async function capturePoster(page, name) {
  fs.mkdirSync(POSTER_DIR, { recursive: true });
  await page.screenshot({ path: path.join(POSTER_DIR, `${name}.png`) });
}

async function launchBrowser({ recordDir } = {}) {
  const browser = await chromium.launch({
    slowMo: SLOW_MO_MS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: recordDir
      ? { dir: recordDir, size: { width: VIEWPORT.width, height: VIEWPORT.height } }
      : undefined
  });
  const page = await context.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  return { browser, context, page };
}

async function recordClip(name, steps) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const clipDir = path.join(OUT_DIR, `_clip-${name}`);
  fs.rmSync(clipDir, { recursive: true, force: true });
  fs.mkdirSync(clipDir, { recursive: true });

  const { browser, context, page } = await launchBrowser({ recordDir: clipDir });
  const helpers = pacing(page);

  try {
    await steps(page, helpers);
    await helpers.pause(1500);
  } finally {
    await context.close();
    await browser.close();
  }

  const webmPath = fs.readdirSync(clipDir).find((f) => f.endsWith('.webm'));
  if (!webmPath) {
    throw new Error(`No recording produced for ${name}`);
  }
  const mp4Path = path.join(OUT_DIR, `${name}.mp4`);
  const ff = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      path.join(clipDir, webmPath),
      '-c:v',
      'libx264',
      '-crf',
      '23',
      '-preset',
      'medium',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      mp4Path
    ],
    { stdio: 'inherit' }
  );
  if (ff.status !== 0) {
    throw new Error(`ffmpeg failed for ${name}`);
  }
  fs.rmSync(clipDir, { recursive: true, force: true });
  console.log(`wrote ${mp4Path}`);
}

function startPreview() {
  try {
    spawnSync('fuser', ['-k', `${PREVIEW_PORT}/tcp`], { stdio: 'ignore' });
  } catch {
    // fuser may be unavailable
  }
  return spawn('npm', ['run', 'preview', '--', '--host', PREVIEW_HOST, '--port', String(PREVIEW_PORT)], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    env: { ...process.env, CI: '1' }
  });
}

async function waitForPreview() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Preview server did not start');
}

const demos = {
  async '01-setup'(page, { pause, clickChoice, fillChoice }) {
    await prepareHome(page, { pause });
    await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption('exam');
    await pause(500);
    await fillChoice(page.getByRole('spinbutton', { name: /^Question count/i }), 25);
    await pause(800);
    await page.getByText('Timer enabled').waitFor({ timeout: 2_000 }).catch(() => {});
    await pause(1200);
  },

  async '02-study-mode'(page, helpers) {
    await prepareHome(page, helpers);
    await startSession(page, helpers, { mode: 'study', count: MIN_QUESTIONS });
    await helpers.clickChoice(page.getByRole('radio').first());
    await page.locator('.explanation-card').waitFor();
    await helpers.pause(1500);
  },

  async '03-exam-navigation-flagging'(page, helpers) {
    await prepareHome(page, helpers);
    await startSession(page, helpers, { mode: 'exam', count: MIN_QUESTIONS });
    await helpers.clickChoice(page.getByRole('radio').first());
    await helpers.clickChoice(page.getByRole('button', { name: 'Flag this item' }));
    await helpers.clickChoice(page.getByRole('button', { name: 'Save flag' }));
    await helpers.clickChoice(page.getByRole('button', { name: 'Next' }));
    await helpers.pause(1200);
  },

  async '04-score-history'(page, helpers) {
    const { pause, clickChoice } = helpers;
    await prepareHome(page, helpers);
    await startSession(page, helpers, { mode: 'study', count: MIN_QUESTIONS });
    for (let i = 0; i < 3; i += 1) {
      await clickChoice(page.getByRole('radio').first());
      if (i < 2) await clickChoice(page.getByRole('button', { name: 'Next' }));
    }
    await clickChoice(page.getByRole('button', { name: 'Complete session' }));
    await page.getByRole('heading', { name: /correct ·/i }).waitFor();
    await pause(1200);
    await clickChoice(page.getByRole('button', { name: 'Back to history' }));
    await page.getByRole('heading', { name: 'History', exact: true }).waitFor();
    await pause(1500);
  },

  async '05-resume-session'(page, helpers) {
    const { pause, clickChoice } = helpers;
    await prepareHome(page, helpers);
    await startSession(page, helpers, { mode: 'study', count: MIN_QUESTIONS });
    await clickChoice(page.getByRole('radio').first());
    await clickChoice(page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Start' }));
    await pause(800);
    await clickChoice(page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Resume' }));
    await page.getByRole('heading', { name: /Item 1 of/i }).waitFor();
    await pause(1200);
  },

  async '00-hero-overview'(page, helpers) {
    const { pause, clickChoice } = helpers;
    await prepareHome(page, helpers);
    await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption('study');
    await pause(500);
    await clickChoice(page.getByRole('button', { name: /Start session/i }));
    await clickChoice(page.getByRole('radio').first());
    await page.locator('.explanation-card').waitFor();
    await pause(1000);
    await clickChoice(page.getByRole('button', { name: 'Complete session' }));
    await page.getByRole('heading', { name: /correct ·/i }).waitFor();
    await pause(1500);
  }
};

async function capturePosters(names) {
  for (const name of names) {
    const { browser, context, page } = await launchBrowser();
    const helpers = pacing(page);
    try {
      await demos[name](page, helpers);
      await capturePoster(page, name);
      console.log(`poster ${name}`);
    } finally {
      await context.close();
      await browser.close();
    }
  }
}

async function main() {
  const arg = process.argv[2];
  const postersOnly = arg === '--posters-only';
  const only = postersOnly ? null : arg;
  const names = only ? [only] : DEMO_ORDER;

  if (!fs.existsSync(path.join(REPO_ROOT, 'dist/index.html'))) {
    console.error('Run npm run build first');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const preview = startPreview();
  try {
    await waitForPreview();
    if (!postersOnly) {
      for (const name of names) {
        if (!demos[name]) {
          throw new Error(`Unknown demo: ${name}`);
        }
        console.log(`Capturing ${name}...`);
        await recordClip(name, demos[name]);
      }
    }
    if (!only || postersOnly) {
      console.log('Capturing posters (separate pass)...');
      await capturePosters(postersOnly ? DEMO_ORDER : names);
    }
  } finally {
    preview.kill('SIGTERM');
    try {
      spawnSync('fuser', ['-k', `${PREVIEW_PORT}/tcp`], { stdio: 'ignore' });
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
