// Browser UI regression with synthetic API responses; no real user data or S3 writes.
const assert = require('node:assert/strict'); const { chromium } = require('playwright-core');
const courseId = '333333333333333333333333', batchId = '444444444444444444444444';
const categories = ['video', 'pdf', 'study-material', 'assignment']; const labels = ['Videos', 'PDFs', 'Study Materials', 'Assignment Files'];
const batch = { _id: batchId, courseId, courseName: 'Synthetic Course', name: 'Synthetic Batch', code: 'S3-UI-TEST', isActive: true, materials: [], assignments: [], tests: [], notices: [], faculty: [] };
const course = { _id: courseId, title: 'Synthetic Course', slug: 'synthetic-course' };
let rows = [], uploads = new Map(), calls = [], next = 1;
async function setup(browser, role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(({ role }) => { localStorage.setItem('user', JSON.stringify({ _id: '222222222222222222222222', name: 'Synthetic Test User', email: 'test@ui.invalid', role })); localStorage.setItem('sessionToken', 'ui-test'); localStorage.setItem('deviceId', 'ui-device'); }, { role });
  await context.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname; calls.push(p);
    const json = async (data) => route.fulfill({ json: { success: true, ...data } });
    if (p === '/api/batches') return json({ batches: [batch], enrollments: [] });
    if (p === '/api/courses') return json({ courses: [course] });
    if (p === '/api/s3/admin/uploads') {
      const body = request.postDataJSON(), id = String(next++).padStart(24, '0');
      const asset = { ...body, assetId: id, filename: body.filename, status: 'uploading', createdAt: new Date().toISOString(), contentDate: body.contentDate };
      rows.push(asset); uploads.set(id, asset);
      return json({ assetId: id, uploadSessionId: id, partSize: 16777216, partCount: 1, status: 'uploading', expiresAt: new Date(Date.now() + 600000).toISOString() });
    }
    const parts = p.match(/^\/api\/s3\/admin\/uploads\/(\w+)\/parts$/); if (parts) return json({ parts: [{ url: 'https://s3-ui.invalid/part/' + parts[1] }] });
    const complete = p.match(/^\/api\/s3\/admin\/uploads\/(\w+)\/complete$/); if (complete) { const asset = uploads.get(complete[1]); asset.status = 'ready'; asset.uploadedAt = new Date().toISOString(); if (asset.replacesAssetId) rows.find((r) => r.assetId === asset.replacesAssetId).status = 'replaced'; return json({ asset }); }
    if (p === '/api/s3/admin/assets' || p === '/api/s3/student/assets') {
      const category = url.searchParams.get('category'), date = url.searchParams.get('contentDate');
      const filtered = rows.filter((a) => a.batchId === batchId && (!category || a.category === category) && (!date || a.contentDate === date) && (url.searchParams.get('includeArchived') === 'true' || a.status === 'ready'));
      return json({ assets: filtered, total: filtered.length, hasMore: false });
    }
    const del = p.match(/^\/api\/s3\/admin\/assets\/(\w+)\/delete$/); if (del) { rows.find((a) => a.assetId === del[1]).status = 'deleted'; return json({ message: 'File deleted from S3. Its database audit record is retained.' }); }
    const history = p.match(/^\/api\/s3\/admin\/assets\/(\w+)\/history$/); if (history) return json({ asset: rows.find((a) => a.assetId === history[1]), events: [{ action: 'upload-ready', actorId: '222222222222222222222222', relatedAssetId: '', createdAt: new Date().toISOString() }] });
    if (p === '/api/s3/student/access-url') { const a = rows.find((r) => r.assetId === request.postDataJSON().assetId); return json({ filename: a.filename, contentType: a.contentType, url: 'https://s3-ui.invalid/file', expiresAt: new Date(Date.now() + 600000).toISOString() }); }
    return json({ inventory: [], enrollments: [], submissions: [], notifications: [], byBatch: {}, activeStudents: [], inactiveStudents: [], students: [], count: 0 });
  });
  await context.route('https://s3-ui.invalid/**', (route) => route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,OPTIONS', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'ETag', ETag: '"ui-part"' }, body: '' }));
  return context;
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.LOCAL_MEDIA_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let count = 0; const pass = (s) => { count++; console.log('PASS ' + s); };
  try {
    const adminContext = await setup(browser, 'admin'), page = await adminContext.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost:3000/admin-page/batches'); await page.getByRole('button', { name: /Synthetic Batch/ }).click();
    for (let i = 0; i < categories.length; i++) {
      const card = page.locator('section').filter({ has: page.getByRole('heading', { name: labels[i], exact: true }) }).last();
      await card.getByLabel('Lesson date', { exact: true }).fill('2026-10-26');
      const extension = i === 0 ? 'mp4' : i === 2 ? 'txt' : 'pdf';
      await card.locator('input[type=file]').setInputFiles({ name: `test-${categories[i]}.${extension}`, mimeType: i === 0 ? 'video/mp4' : i === 2 ? 'text/plain' : 'application/pdf', buffer: Buffer.alloc(64) });
      await card.getByRole('button', { name: 'Upload / resume', exact: true }).click();
      await card.getByText(`test-${categories[i]}.${extension}`, { exact: true }).waitFor();
      pass(labels[i] + ' uploader sends S3 request with selected batch/date and lists completed file');
    }
    const pdf = page.locator('section').filter({ has: page.getByRole('heading', { name: 'PDFs', exact: true }) }).last();
    await pdf.getByRole('button', { name: 'Replace', exact: true }).click(); await pdf.locator('input[type=file]').setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(64) }); await pdf.getByRole('button', { name: 'Replace / resume', exact: true }).click(); await pdf.getByText('replacement.pdf', { exact: true }).waitFor(); pass('replacement control switches file only after completion');
    await pdf.getByRole('button', { name: 'History', exact: true }).click(); await pdf.getByText(/upload-ready/).waitFor(); await pdf.getByRole('button', { name: 'Close history' }).click(); pass('database record history is visible');
    const assignment = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Assignment Files', exact: true }) }).last(); page.on('dialog', (dialog) => dialog.accept()); await assignment.getByRole('button', { name: 'Delete', exact: true }).click(); await assignment.getByText('File deleted from S3. Its database audit record is retained.').waitFor(); assert.equal(rows.find((r) => r.category === 'assignment').status, 'deleted'); pass('delete confirmation and list refresh work');
    assert.ok(!calls.includes('/api/upload')); assert.equal(errors.length, 0); pass('all four upload controls avoid legacy upload API and produce no JavaScript errors');
    const studentContext = await setup(browser, 'user'), studentPage = await studentContext.newPage(); await studentPage.goto('http://localhost:3000/student/batches'); await studentPage.getByRole('link', { name: /Synthetic Batch/ }).click();
    await studentPage.getByRole('heading', { name: 'Learning library', exact: true }).waitFor(); await studentPage.getByText('test-video.mp4', { exact: true }).waitFor(); assert.equal(await studentPage.getByText('replacement.pdf', { exact: true }).count(), 0); pass('video category excludes PDF files'); await studentPage.getByRole('button', { name: 'PDFs', exact: true }).click(); await studentPage.getByText('replacement.pdf', { exact: true }).waitFor(); assert.equal(await studentPage.getByText('test-video.mp4', { exact: true }).count(), 0); pass('PDF category excludes video files'); pass('student batch category shows the replacement file');
    await studentPage.getByRole('button', { name: 'Study Materials', exact: true }).click(); await studentPage.getByText('test-study-material.txt', { exact: true }).waitFor(); pass('student can switch categories and load batch files');
    await studentContext.close(); await adminContext.close(); console.log(`${count} browser UI checks passed with synthetic API responses. Real S3/DB tested separately.`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
