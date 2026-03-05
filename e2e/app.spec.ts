import { expect, test } from '@playwright/test';

test('home page loads and search input is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PaliSpeedRead' })).toBeVisible();
  await expect(page.getByLabel('Search sutta')).toBeVisible();
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
});

test('theme toggle persists on reader page', async ({ page }) => {
  await page.goto('/read/mn1/en/sujato');
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });

  await page.getByText('Settings').click();

  const isDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();

  await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(
    !isDarkBefore,
  );

  await page.reload();
  await expect(page.getByRole('heading', { name: /MN1/i })).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(
    !isDarkBefore,
  );
});
