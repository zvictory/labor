import { test, expect } from '@playwright/test';

test('measure catalog load performance', async ({ page }) => {
  const startTime = Date.now();
  
  // Track requests
  let requestCount = 0;
  page.on('request', () => { requestCount++; });

  const response = await page.goto('http://localhost:3001/en/catalog', {
    waitUntil: 'domcontentloaded',
  });

  const loadTime = Date.now() - startTime;
  const status = response?.status();

  console.log(`[E2E Perf] Status: ${status}`);
  console.log(`[E2E Perf] Total DOMContentLoaded Time: ${loadTime}ms`);
  console.log(`[E2E Perf] Total HTTP Requests: ${requestCount}`);

  expect(status).toBe(200);
});
