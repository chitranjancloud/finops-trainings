// Mount the real component in Chromium; intercept all API calls with synthetic data.
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright-core');
async function main() {
  const result = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Panel from './components/S3UploadPanel'; createRoot(document.getElementById('root')).render(<Panel courseId="course" batchId="batch" library />);`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let row = { assetId: 'asset1', filename: 'lesson.mp4', byteSize: 6, category: 'video', contentType: 'video/mp4', contentDate: '2026-10-28', courseId: 'course', batchId: 'batch', status: 'uploading' };
    let releasePart, releaseComplete;
    let listCalls = 0;
    let failSync = false;
    let cancelledSession = true;
    let cancelledCleared = false;
    const requestKeys = [];
    // Use a secure loopback origin so browser crypto.subtle is available.
    await page.route('http://localhost:3198/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
    await page.goto('http://localhost:3198');
    await page.unroute('http://localhost:3198/**');
    await page.route('http://localhost:3198/**', async route => {
      const p = new URL(route.request().url()).pathname;
      const json = data => route.fulfill({ json: { success: true, ...data } });
      if (p === '/api/s3/admin/assets') { listCalls++; if (failSync) return route.fulfill({ status: 503, json: { success: false } }); return json({ assets: [row], total: 1, hasMore: false }); }
      if (p === '/api/s3/admin/uploads') {
        requestKeys.push(route.request().postDataJSON().idempotencyKey);
        if (cancelledSession) return route.fulfill({ status: 409, json: { success: false, code: 'UPLOAD_RESTART_REQUIRED', uploadSessionId: 'cancelled-session', message: 'This upload was cancelled. Start a new upload with the same file.' } });
        return json({ assetId: 'asset1', uploadSessionId: 'session1', partCount: 1, partSize: 16, status: 'uploading' });
      }
      if (p === '/api/s3/admin/uploads/cancelled-session/abort') { cancelledSession = false; cancelledCleared = true; return json({ status: 'cancelled' }); }
      if (p.endsWith('/parts')) return json({ parts: [{ url: 'http://localhost:3198/part' }] });
      if (p === '/part') { await new Promise(resolve => { releasePart = resolve; }); return route.fulfill({ body: '', headers: { ETag: 'test-etag' } }); }
      if (p.endsWith('/complete')) { await new Promise(resolve => { releaseComplete = resolve; }); row = { ...row, status: 'ready', videoProcessingState: 'queued' }; return json({ asset: { videoProcessingState: 'queued' } }); }
      return json({});
    });
    await page.addScriptTag({ content: result.outputFiles[0].text });
    await page.getByText('Upload incomplete', { exact: true }).waitFor();
    await page.getByRole('button', { name: '+ Upload files' }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'lesson.mp4', mimeType: 'video/mp4', buffer: Buffer.from('123456') });
    await page.getByRole('button', { name: 'Upload / resume', exact: true }).click();
    await page.getByText('Start a new upload', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Start new upload', exact: true }).click();
    await page.getByText('Uploading', { exact: true }).first().waitFor();
    assert.equal(cancelledCleared, true);
    assert.notEqual(requestKeys[0], requestKeys[1], 'restart uses a fresh idempotency key');
    await page.waitForFunction(() => document.querySelector('progress')?.value === 0);
    while (!releasePart) await new Promise(resolve => setTimeout(resolve, 10));
    releasePart();
    await page.getByText('Verifying upload', { exact: true }).first().waitFor();
    await page.waitForFunction(() => document.querySelector('progress')?.value === 100);
    while (!releaseComplete) await new Promise(resolve => setTimeout(resolve, 10));
    releaseComplete();
    await page.getByText('Waiting to prepare video', { exact: true }).waitFor();
    row.videoProcessingState = 'processing';
    await page.getByText('Preparing video', { exact: true }).waitFor({ timeout: 12000 });
    row.videoProcessingState = 'ready';
    await page.getByText('Ready to watch', { exact: true }).waitFor({ timeout: 12000 });
    assert.ok(listCalls >= 4, 'background polling advances stages');
    failSync = true;
    await page.getByText(/Status updates interrupted/).waitFor({ timeout: 12000 });
    assert.equal(await page.getByText('Ready to watch', { exact: true }).count(), 1, 'retain rows on failed refresh');
    failSync = false;
    row.videoProcessingState = 'failed';
    await page.getByText('Needs attention', { exact: true }).waitFor({ timeout: 12000 });
    row.videoProcessingState = 'ready';
    await page.getByText('Ready to watch', { exact: true }).waitFor({ timeout: 12000 });
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.getByText('Ready to watch', { exact: true }).count(), 1);
    row.status = 'uploading';
    releasePart = undefined;
    await page.locator('input[type=file]').setInputFiles({ name: 'lesson.mp4', mimeType: 'video/mp4', buffer: Buffer.from('123456') });
    await page.getByRole('button', { name: 'Upload / resume', exact: true }).click();
    await page.getByText('Uploading', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Pause upload', exact: true }).click();
    await page.getByText('Upload paused', { exact: true }).first().waitFor();
    console.log('PASS browser upload -> verification -> queue -> processing -> ready without navigation; refresh failure/recovery; processing failure; pause; mobile status visible; no browser errors');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
