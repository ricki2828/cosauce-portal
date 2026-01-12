#!/usr/bin/env node
/**
 * Automated Browser Runtime Error Checker
 *
 * Launches headless browser, loads the page, captures console errors
 * Usage: node check-browser-errors.mjs <url>
 */

import { chromium } from 'playwright';

const url = process.argv[2] || 'http://169.150.243.5:5173';
const timeout = 15000; // 15 seconds

async function checkBrowserErrors() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   BROWSER RUNTIME ERROR CHECK             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`URL: ${url}`);
  console.log(`Timeout: ${timeout}ms`);
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const logs = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();

    // Skip chrome-extension errors
    if (text.includes('chrome-extension://')) return;

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    } else {
      logs.push(text);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure) {
      errors.push(`REQUEST FAILED: ${request.url()} - ${failure.errorText}`);
    }
  });

  try {
    console.log('1. Launching browser...');

    // Navigate to page
    console.log('2. Loading page...');
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout
    });

    if (!response.ok()) {
      console.log(`   ❌ Page returned status ${response.status()}`);
      await browser.close();
      process.exit(1);
    }

    console.log('   ✅ Page loaded (HTTP ' + response.status() + ')');

    // Wait a bit for React to mount and run
    console.log('3. Waiting for JavaScript execution...');
    await page.waitForTimeout(3000);

    // Check for specific module errors in the page content
    console.log('4. Checking for module errors...');
    const pageContent = await page.content();
    if (pageContent.includes('does not provide an export')) {
      errors.push('MODULE ERROR: Export not found error detected in page');
    }

    // Take screenshot
    const screenshotPath = '/tmp/browser-check.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`   ✅ Screenshot saved to ${screenshotPath}`);

    console.log('');
    console.log('═══════════════════ RESULTS ═══════════════════');
    console.log('');

    // Report errors
    if (errors.length > 0) {
      console.log(`❌ ERRORS FOUND (${errors.length}):`);
      console.log('');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      console.log('');
      await browser.close();
      process.exit(1);
    }

    // Report warnings (non-fatal)
    if (warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${warnings.length}):`);
      console.log('');
      warnings.forEach((warn, i) => {
        console.log(`  ${i + 1}. ${warn}`);
      });
      console.log('');
    }

    console.log('✅ NO RUNTIME ERRORS DETECTED');
    console.log('');
    console.log(`Console logs: ${logs.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log('');

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.log('');
    console.log('❌ BROWSER CHECK FAILED:');
    console.log(error.message);
    console.log('');
    await browser.close();
    process.exit(1);
  }
}

checkBrowserErrors().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
