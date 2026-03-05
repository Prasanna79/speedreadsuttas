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
