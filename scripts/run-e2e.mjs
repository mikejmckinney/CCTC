#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const previewHost = process.env.PREVIEW_HOST ?? '127.0.0.1';
const previewPort = Number(process.env.PREVIEW_PORT ?? 4173);
const previewUrl = process.env.PREVIEW_URL ?? `http://${previewHost}:${previewPort}`;

async function isPreviewReady(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    return response.ok || response.status === 304;
  } catch {
    return false;
  }
}

async function waitForPreview(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isPreviewReady(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Preview server did not become ready at ${url}`);
}

function runNode(scriptPath, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptPath} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  let previewProcess;
  const previewAlreadyRunning = await isPreviewReady(previewUrl);
  const shouldManagePreview = process.env.CI === 'true' || (!process.env.PREVIEW_URL && !previewAlreadyRunning);

  if (shouldManagePreview) {
    previewProcess = spawn('npm', ['run', 'preview', '--', '--host', previewHost, '--port', String(previewPort)], {
      stdio: 'inherit',
      env: process.env
    });

    previewProcess.on('error', (error) => {
      throw error;
    });

    await waitForPreview(previewUrl);
  } else if (!previewAlreadyRunning) {
    await waitForPreview(previewUrl);
  }

  try {
    await runNode(fileURLToPath(new URL('./run-resume-smoke.mjs', import.meta.url)), {
      ...process.env,
      PREVIEW_URL: previewUrl
    });
  } finally {
    if (previewProcess) {
      previewProcess.kill('SIGTERM');

      try {
        await once(previewProcess, 'exit');
      } catch {
        previewProcess.kill('SIGKILL');
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
