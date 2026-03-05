import { expect, test } from '@playwright/test';

test('home page loads and search input is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SuttaSpeed' })).toBeVisible();
  await expect(page.getByLabel('Search sutta')).toBeVisible();
  await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Donate' })).toBeVisible();
});

test('about and donate pages are reachable from nav', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'About SuttaSpeed' })).toBeVisible();

  await page.getByRole('link', { name: 'Donate' }).click();
  await expect(page.getByRole('heading', { name: 'Support SuttaCentral' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Donate to SuttaCentral' })).toBeVisible();
});

test('not-found route renders fallback page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('reader route loads play controls for mn1', async ({ page }) => {
  await page.goto('/read/mn1/en/sujato');
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Play or pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to Search' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Full sutta' })).toBeVisible();
  await expect(page.getByLabel('Switch translation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter focus mode' })).toBeVisible();
});

test('theme toggle persists on reader page', async ({ page }) => {
  await page.goto('/read/mn1/en/sujato');
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });

  await page.getByText('Settings').click();

  const isDarkBefore = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();

  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(!isDarkBefore);

  await page.reload();
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(!isDarkBefore);
});

test('mobile xlarge keeps playback controls inside viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'palispeedread:preferences',
      JSON.stringify({
        wpm: 250,
        chunkSize: 2,
        theme: 'light',
        fontSize: 'xlarge',
        fontFamily: 'serif',
        focusMode: false,
      }),
    );
  });

  await page.goto('/read/mn1/en/sujato');
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });

  const playPause = page.getByRole('button', { name: 'Play or pause' });
  await expect(playPause).toBeVisible();
  const box = await playPause.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) {
    return;
  }

  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
});

test('focus mode hides global chrome and can be exited', async ({ page }) => {
  await page.goto('/read/mn1/en/sujato');
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Enter focus mode' }).click();

  await expect(page.getByRole('button', { name: 'Exit focus mode' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play or pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip forward' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Donate' })).toBeHidden();

  await page.getByRole('button', { name: 'Exit focus mode' }).click();
  await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Donate' })).toBeVisible();
});

test('resume banner remains visible on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'palispeedread:last-read',
      JSON.stringify({
        uid: 'mn1',
        lang: 'en',
        author: 'sujato',
        position: 12,
        timestamp: Date.now(),
      }),
    );
  });

  await page.goto('/read/mn1/en/sujato');
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Resume where you left off?')).toBeVisible();

  const resumeButton = page.getByRole('button', { name: 'Resume' });
  const startOverButton = page.getByRole('button', { name: 'Start over' });
  await expect(resumeButton).toBeVisible();
  await expect(startOverButton).toBeVisible();
});

test('reader tokenization splits em-dash joins and preserves segment order', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'palispeedread:preferences',
      JSON.stringify({
        wpm: 250,
        chunkSize: 1,
        theme: 'light',
        fontSize: 'normal',
        fontFamily: 'serif',
        focusMode: false,
      }),
    );
  });

  await page.route('**/api/v1/sutta/mn19', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uid: 'mn19',
        collection: 'mn',
        title: 'Tokenization Mock',
        translations: [
          {
            lang: 'en',
            langName: 'English',
            author: 'sujato',
            authorName: 'Bhikkhu Sujato',
            isRoot: false,
            publication: 'SuttaCentral',
            licence: 'CC0 1.0',
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/sutta/mn19/text/en/sujato', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uid: 'mn19',
        lang: 'en',
        author: 'sujato',
        segments: [
          { id: 'mn19:0.1', text: 'Intro' },
          { id: 'mn19:4-5.1', text: 'late' },
          { id: 'mn19:1.1', text: 'awakening—I' },
          { id: 'mn19:2.1', text: 'middle' },
        ],
      }),
    });
  });

  await page.goto('/read/mn19/en/sujato');
  await expect(page.getByRole('heading', { name: /MN19/i })).toBeVisible({ timeout: 15_000 });

  const display = page.locator('section[aria-live="polite"]');
  const skipForward = page.getByRole('button', { name: 'Skip forward' });

  await expect(display).toContainText('Intro');

  await skipForward.click();
  await expect(display).toContainText('awakening');
  await expect(display).toContainText('—');
  await expect(display).not.toContainText('awakening—I');

  await skipForward.click();
  await expect(display).toContainText('I');

  await skipForward.click();
  await expect(display).toContainText('middle');

  await skipForward.click();
  await expect(display).toContainText('late');
});
