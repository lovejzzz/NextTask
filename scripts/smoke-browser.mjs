/* global document, getComputedStyle, window */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const port = Number(process.env.SMOKE_PORT ?? 5175);
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const shouldStartServer = !process.env.SMOKE_BASE_URL;
const now = Date.now();
const dragTitle = `Smoke drag ${now}`;
const dragTitleTwo = `Smoke long press ${now}`;
const handleTitle = `Smoke handle ${now}`;
const editedTitle = `${dragTitle} edited`;

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

  await verifyRefreshToast(page);
  await page.screenshot({ path: 'verification-smoke-desktop.png', fullPage: true });

  // Accessibility scan: fail on serious/critical WCAG 2 A/AA violations.
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const blockingA11y = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  if (blockingA11y.length) {
    const summary = blockingA11y
      .map((v) => {
        const nodes = v.nodes
          .slice(0, 5)
          .map((node) => `  - ${node.target.join(' ')}: ${node.failureSummary?.replace(/\s+/g, ' ').trim()}`)
          .join('\n');
        return `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}\n${nodes}`;
      })
      .join('\n');
    throw new Error(`Accessibility violations found:\n${summary}`);
  }

  await createTask(page, dragTitle, 'Created by smoke-browser.mjs');
  await searchFor(page, dragTitle);
  assertEqual(await page.locator(`.task-card:has-text("${dragTitle}")`).count(), 1, 'search should isolate created task');
  assertEqual(await page.locator('.task-card').count(), 1, 'search should show one card');
  await clearSearch(page);

  await openTask(page, dragTitle);
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

  await dragCard(page, editedTitle, 1);
  assertEqual(await columnForTask(page, editedTitle), 'In Progress', 'dragging a card should move it into In Progress');

  await createTask(page, dragTitleTwo, 'Created to verify long-press drag activation.');
  await longPressDragCard(page, dragTitleTwo, 2);
  assertEqual(await columnForTask(page, dragTitleTwo), 'In Review', 'long-press dragging a card should move it into In Review');

  await createTask(page, handleTitle, 'Created to verify immediate drag-handle activation.');
  await dragCardByHandle(page, handleTitle, 3);
  assertEqual(await columnForTask(page, handleTitle), 'Done', 'drag handle should move a task into Done');

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

  await page.getByRole('button', { name: `v0.0.3` }).click();
  await page.waitForSelector('[role="dialog"] >> text=v0.0.3', { timeout: 10_000 });
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
  await clearBoard(page);
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
        checked: ['sample board', 'refresh toast contrast', 'create', 'edit via icon', 'comment', 'filter', 'card-body drag', '2.5s long-press drag', 'immediate handle drag', 'clear board persistence', 'manager dialog focus', 'changelog', 'mobile status/stats', 'axe a11y (serious/critical)'],
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
  await page.locator(`.task-card:has-text("${title}") .card-edit`).first().click();
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

async function verifyRefreshToast(page) {
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'dark') {
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  }

  await page.getByRole('button', { name: 'Refresh board' }).click();
  const toast = page.getByRole('status').filter({ hasText: 'Board refreshed' }).first();
  await toast.waitFor({ state: 'visible', timeout: 10_000 });
  const metrics = await toast.evaluate((element) => {
    const styles = getComputedStyle(element);

    function parseRgbChannel(value) {
      if (value.endsWith('%')) return (Number(value.slice(0, -1)) / 100) * 255;
      return Number(value);
    }

    function parseSrgbChannel(value) {
      if (value.endsWith('%')) return (Number(value.slice(0, -1)) / 100) * 255;
      const numeric = Number(value);
      return numeric <= 1 ? numeric * 255 : numeric;
    }

    function splitChannels(value) {
      return value.replace(/\//g, ' ').split(/[,\s]+/).filter(Boolean);
    }

    function parseCssColor(value) {
      const rgb = value.trim().match(/^rgba?\((.+)\)$/i);
      if (rgb) return splitChannels(rgb[1]).slice(0, 3).map(parseRgbChannel);

      const srgb = value.trim().match(/^color\(srgb\s+(.+)\)$/i);
      if (srgb) return splitChannels(srgb[1]).slice(0, 3).map(parseSrgbChannel);

      return null;
    }

    function relativeLuminance(rgb) {
      const channels = rgb.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function contrastRatio(foreground, background) {
      const fg = relativeLuminance(foreground);
      const bg = relativeLuminance(background);
      const lighter = Math.max(fg, bg);
      const darker = Math.min(fg, bg);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const foreground = parseCssColor(styles.color);
    const background = parseCssColor(styles.backgroundColor);
    return {
      text: element.textContent?.trim() ?? '',
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      contrast: foreground && background ? contrastRatio(foreground, background) : 0,
    };
  });

  if (!metrics.text.includes('Board refreshed')) {
    throw new Error(`refresh toast should include readable message text, got ${JSON.stringify(metrics.text)}`);
  }
  if (metrics.contrast < 4.5) {
    throw new Error(
      `refresh toast contrast is too low (${metrics.contrast.toFixed(2)}). color=${metrics.color}, background=${metrics.backgroundColor}, border=${metrics.borderColor}`,
    );
  }
}

async function dragCard(page, title, targetColumnIndex) {
  const card = page.locator(`.task-card:has-text("${title}")`).first();
  const targetColumn = page.locator('.board-column').nth(targetColumnIndex);
  const cardBox = await card.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  if (!cardBox || !targetBox) throw new Error(`Cannot find drag geometry for ${title}`);
  const targetPoint = dropPoint(targetBox);
  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // The mouse sensor activates after a small movement (distance: 6), so a drag
  // begins from anywhere on the card body without a long press or a handle.
  await page.mouse.move(startX + 12, startY + 12, { steps: 6 });
  await page.waitForTimeout(150);
  assertEqual(await page.locator('.task-card-overlay').count(), 1, 'dragging a card should activate the drag overlay');
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 24 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(1200);
}

async function longPressDragCard(page, title, targetColumnIndex) {
  const card = page.locator(`.task-card:has-text("${title}")`).first();
  const targetColumn = page.locator('.board-column').nth(targetColumnIndex);
  const cardBox = await card.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  if (!cardBox || !targetBox) throw new Error(`Cannot find long-press drag geometry for ${title}`);
  const targetPoint = dropPoint(targetBox);
  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(2600);
  assertEqual(await page.locator('.task-card-overlay').count(), 1, 'long-pressing a card should activate the drag overlay');
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
  await page.waitForTimeout(150);
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

async function clearBoard(page) {
  await page.getByRole('button', { name: 'Clear board' }).first().click();
  await page.waitForSelector('.confirm-dialog', { timeout: 10_000 });
  await page.locator('.confirm-dialog .danger-button').click();
  await page.waitForSelector('.task-card', { state: 'detached', timeout: 30_000 });
  await page.getByRole('button', { name: 'Load sample board' }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.board-column', { timeout: 45_000 });
  assertEqual(await page.locator('.task-card').count(), 0, 'clear board should persist after reload');
  assertEqual(
    await page.getByRole('button', { name: 'Load sample board' }).isVisible().catch(() => false),
    true,
    'clear board should return to the empty sample-board state after reload',
  );
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
