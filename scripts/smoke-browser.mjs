/* global document, getComputedStyle, window */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const port = Number(process.env.SMOKE_PORT ?? 5175);
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const shouldStartServer = !process.env.SMOKE_BASE_URL;
const now = Date.now();
const longPressTitle = `Smoke long press ${now}`;
const handleTitle = `Smoke handle ${now}`;
const editedTitle = `${longPressTitle} edited`;

let server;

try {
  if (shouldStartServer) {
    server = spawn(process.execPath, ['scripts/dev-full.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        HOST: '127.0.0.1',
        API_WRITE_LIMIT_PER_MINUTE: process.env.API_WRITE_LIMIT_PER_MINUTE ?? '0',
        API_IP_WRITE_LIMIT_PER_MINUTE: process.env.API_IP_WRITE_LIMIT_PER_MINUTE ?? '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    server.on('exit', (code) => {
      if (code !== null && code !== 0) process.stderr.write(`dev-full exited with code ${code}\n`);
    });
  }

  await waitForServer(baseUrl);
  await runSmoke();
} finally {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), delay(1200)]);
  }
}

async function runSmoke() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleMessages = [];
  const httpFailures = [];
  const failedRequests = [];
  let cleanupStarted = false;

  page.on('console', (message) => {
    const text = message.text();
    if (
      message.type() === 'error' &&
      /^Failed to load resource: the server responded with a status of (404|429)/.test(text)
    ) {
      return;
    }
    if (['error', 'warning'].includes(message.type())) consoleMessages.push(`${message.type()}: ${text}`);
  });
  page.on('pageerror', (error) => consoleMessages.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      httpFailures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? '';
    if (cleanupStarted && errorText === 'net::ERR_ABORTED') return;
    failedRequests.push(`${request.method()} ${request.url()} ${errorText}`);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForSelector('.board-column', { timeout: 45_000 });

  if ((await page.locator('.task-card').count()) === 0 && (await page.getByRole('button', { name: 'Load sample board' }).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Load sample board' }).click();
    await page.waitForSelector('.task-card', { timeout: 45_000 });
  }

  await page.screenshot({ path: 'verification-smoke-desktop.png', fullPage: true });

  await createTask(page, longPressTitle, 'Created by smoke-browser.mjs');
  await searchFor(page, longPressTitle);
  assertEqual(await page.locator(`.task-card:has-text("${longPressTitle}")`).count(), 1, 'search should isolate created task');
  assertEqual(await page.locator('.task-card').count(), 1, 'search should show one card');
  await clearSearch(page);

  await openTask(page, longPressTitle);
  await page.getByPlaceholder('Add task title').fill(editedTitle);
  await page.getByPlaceholder('Describe what needs to happen').fill('Edited by smoke-browser.mjs');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await waitForDrawerClosed(page);
  await page.waitForSelector(`.task-card:has-text("${editedTitle}")`, { timeout: 30_000 });

  await openTask(page, editedTitle);
  const commentText = `Smoke comment ${now}`;
  await page.getByPlaceholder('Write a comment...').fill(commentText);
  await page.locator('.comment-composer button').click();
  await page.waitForSelector(`.comment-item:has-text("${commentText}")`, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await waitForDrawerClosed(page);

  await dragCardByLongPress(page, editedTitle, 1);
  assertEqual(await columnForTask(page, editedTitle), 'In Progress', 'long-press drag should move task into In Progress');

  await createTask(page, handleTitle, 'Created to verify immediate drag handle activation.');
  await dragCardByHandle(page, handleTitle, 2);
  assertEqual(await columnForTask(page, handleTitle), 'In Review', 'handle drag should move task into In Review');

  await page.getByRole('button', { name: /Filters/ }).click();
  await page.locator('#board-filters label:has-text("Status") select').selectOption('in_progress');
  await page.waitForSelector('.filter-chip:has-text("Status: In Progress")', { timeout: 10_000 });
  await page.waitForSelector(`.task-card:has-text("${editedTitle}")`, { timeout: 30_000 });
  assertEqual(await page.locator(`.task-card:has-text("${editedTitle}")`).count(), 1, 'status filter should keep In Progress task visible');
  await page.getByRole('button', { name: 'Clear all' }).click();

  await page.getByRole('button', { name: /Team & labels/ }).click();
  await page.waitForSelector('[role="dialog"][aria-labelledby="manager-panel-title"]', { timeout: 10_000 });
  assertEqual(await page.evaluate(() => document.activeElement?.getAttribute('placeholder')), 'Add member', 'manager dialog should focus add member input');
  await page.getByRole('button', { name: 'Close team and labels' }).click();

  await page.getByRole('button', { name: `v0.0.1` }).click();
  await page.waitForSelector('[role="dialog"] >> text=v0.0.1', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Close changelog' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => ({
    bodyScrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.documentElement.clientWidth,
    statusTabs: document.querySelectorAll('.mobile-status-tab').length,
    statCards: document.querySelectorAll('.stat-card').length,
    visibleColumns: [...document.querySelectorAll('.board-column')].filter((column) => getComputedStyle(column).display !== 'none').length,
  }));
  assertEqual(mobile.bodyScrollWidth, mobile.bodyClientWidth, 'mobile page should not create body-level horizontal overflow');
  assertEqual(mobile.statusTabs, 4, 'mobile should expose four status tabs');
  assertEqual(mobile.statCards, 5, 'mobile should expose all five stat cards');
  assertEqual(mobile.visibleColumns, 1, 'mobile should show one selected lane at a time');

  await page.waitForSelector('.toast', { state: 'detached', timeout: 5_000 }).catch(() => undefined);
  await page.screenshot({ path: 'verification-smoke-mobile.png', fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await clearSearch(page);
  cleanupStarted = true;
  await deleteTask(page, editedTitle);
  await deleteTask(page, handleTitle);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);

  if (consoleMessages.length || httpFailures.length || failedRequests.length) {
    throw new Error(`Browser smoke found console/request issues:\n${[...consoleMessages, ...httpFailures, ...failedRequests].join('\n')}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        screenshots: ['verification-smoke-desktop.png', 'verification-smoke-mobile.png'],
        checked: ['sample board', 'create', 'edit', 'comment', 'filter', 'long-press drag', 'handle drag', 'manager dialog focus', 'changelog', 'mobile status/stats'],
      },
      null,
      2,
    ),
  );

  await browser.close();
}

async function createTask(page, title, description) {
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByPlaceholder('Add task title').fill(title);
  await page.getByPlaceholder('Describe what needs to happen').fill(description);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await waitForDrawerClosed(page);
  await page.waitForSelector(`.task-card:has-text("${title}")`, { timeout: 30_000 });
}

async function openTask(page, title) {
  await page.locator(`.task-card:has-text("${title}")`).first().click();
  await page.waitForSelector('.task-drawer', { timeout: 10_000 });
}

async function waitForDrawerClosed(page) {
  await page.waitForSelector('.task-drawer', { state: 'detached', timeout: 10_000 });
  await page.waitForSelector('.drawer-backdrop', { state: 'detached', timeout: 10_000 });
}

async function searchFor(page, value) {
  await page.getByLabel('Search tasks').fill(value);
  await page.waitForTimeout(400);
}

async function clearSearch(page) {
  const clearButton = page.getByLabel('Clear search');
  if (await clearButton.isVisible().catch(() => false)) {
    await clearButton.click();
    await page.waitForTimeout(400);
  }
}

async function dragCardByLongPress(page, title, targetColumnIndex) {
  const card = page.locator(`.task-card:has-text("${title}")`).first();
  const targetColumn = page.locator('.board-column').nth(targetColumnIndex);
  const cardBox = await card.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  if (!cardBox || !targetBox) throw new Error(`Cannot find drag geometry for ${title}`);
  const targetPoint = dropPoint(targetBox);

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2650);
  assertEqual(await page.locator('.task-card-overlay').count(), 1, 'long press should activate drag overlay');
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 24 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(1200);
}

async function dragCardByHandle(page, title, targetColumnIndex) {
  const handle = page.getByRole('button', { name: `Drag ${title}` });
  const targetColumn = page.locator('.board-column').nth(targetColumnIndex);
  const handleBox = await handle.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  if (!handleBox || !targetBox) throw new Error(`Cannot find handle drag geometry for ${title}`);
  const targetPoint = dropPoint(targetBox);

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  assertEqual(await page.locator('.task-card-overlay').count(), 1, 'drag handle should activate immediately');
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 18 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(1200);
}

async function columnForTask(page, title) {
  return page.evaluate((taskTitle) => {
    const columns = [...document.querySelectorAll('.board-column')].map((column) => ({
      title: column.querySelector('h2')?.textContent?.trim(),
      text: column.textContent ?? '',
    }));
    return columns.find((column) => column.text.includes(taskTitle))?.title ?? null;
  }, title);
}

async function deleteTask(page, title) {
  await searchFor(page, title);
  if ((await page.locator(`.task-card:has-text("${title}")`).count()) === 0) return;
  await openTask(page, title);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete task' }).click();
  await page.waitForSelector(`.task-card:has-text("${title}")`, { state: 'detached', timeout: 30_000 });
  await clearSearch(page);
}

async function waitForServer(url) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(300);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function dropPoint(box) {
  return {
    x: box.x + box.width / 2,
    y: box.y + Math.min(220, Math.max(120, box.height / 2)),
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
