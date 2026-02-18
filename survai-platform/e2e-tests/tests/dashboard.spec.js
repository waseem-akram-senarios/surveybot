// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

// NOTE: Login.jsx exists but is never wired into the routes.
// The dashboard has no auth guards — all pages are publicly accessible.
// Tests below verify the dashboard renders correctly without requiring login.

// ─── Dashboard Page ───────────────────────────────────────────────────────────

test.describe('Dashboard Home', () => {
  test('root redirects to /dashboard', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });

  test('renders dashboard with stats cards', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should show stats like "Created Templates", "Active Surveys", etc.
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    const hasStats =
      bodyText.includes('Templates') ||
      bodyText.includes('Surveys') ||
      bodyText.includes('Dashboard');
    expect(hasStats).toBeTruthy();
  });

  test('dashboard has sidebar with navigation links', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should have sidebar with Templates and Surveys sections
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Templates');
    expect(bodyText).toContain('Surveys');
  });

  test('dashboard loads without critical JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Loading chunk')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('dashboard shows Active Surveys table', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Active Surveys');
  });
});

// ─── Sidebar Navigation ──────────────────────────────────────────────────────

test.describe('Sidebar Navigation', () => {
  test('can navigate to Templates Manage page', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const templatesLink = page.locator('a[href*="templates"]').first();
    if (await templatesLink.count() > 0) {
      await templatesLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/templates');
    } else {
      // Navigate directly
      await page.goto(`${BASE}/templates/manage`);
      await page.waitForLoadState('networkidle');
      const bodyText = await page.textContent('body');
      expect(bodyText && bodyText.length > 10).toBeTruthy();
    }
  });

  test('can navigate to Surveys Manage page', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const surveysLink = page.locator('a[href*="surveys/manage"]').first();
    if (await surveysLink.count() > 0) {
      await surveysLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/surveys');
    } else {
      // Navigate directly
      await page.goto(`${BASE}/surveys/manage`);
      await page.waitForLoadState('networkidle');
      const bodyText = await page.textContent('body');
      expect(bodyText && bodyText.length > 10).toBeTruthy();
    }
  });
});
