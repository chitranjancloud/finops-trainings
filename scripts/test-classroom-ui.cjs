const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const base = process.env.UI_TEST_URL || 'http://localhost:3101';
const output = path.resolve('artifacts/classroom-redesign');
fs.mkdirSync(output, { recursive: true });
const mediaPath = path.join(output, 'sample-lesson.mp4');
execFileSync(require('ffmpeg-static'), ['-nostdin', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x1d4ed8:s=640x360:r=12', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mediaPath], { windowsHide: true });
const media = fs.readFileSync(mediaPath);
const batchId = '6ad4a198bcebb6ab9198cd8a';
const batches = [
  { _id: batchId, name: 'CEAP-Batch4', code: 'CEAP-BATCH4-6VNY', courseName: 'CEAP', description: 'Practical cloud training with guided labs and mentor support.', startDate: '2026-10-01', materials: [{ _id: 'legacy-note', name: 'Cloud architecture notes', type: 'pdf', url: 'https://fixture.invalid/private-notes' }], assignments: [{ _id: 'assignment', title: 'Build your cloud architecture', dueDate: '2099-01-01', isActive: true }], tests: [], notices: [{ title: 'Welcome to your classroom', message: 'Your next lab is ready.', isActive: true }], faculty: [{ name: 'Demo Trainer', role: 'Cloud mentor', email: 'trainer@example.invalid' }] },
  { _id: 'other-batch', name: 'FinOps Foundations', code: 'FINOPS-02', courseName: 'FinOps', materials: [], assignments: [], tests: [], notices: [], faculty: [] },
];
const recordedCourses = [{ enrollment: { _id: 'recorded-course', courseName: 'Self-paced Cloud Basics' }, course: { slug: 'cloud-basics', title: 'Self-paced Cloud Basics', videos: [], pdfs: [], materials: [] } }];
const pending = [{ _id: 'waiting', courseName: 'Future Live Training' }];
const assets = [
  { assetId: 'video-1', filename: 'AWS services overview.mp4', category: 'video', contentType: 'video/mp4', contentDate: '2026-10-27', byteSize: media.length, videoProcessingState: 'ready', videoDurationSeconds: 3, batchId, courseId: 'ceap', status: 'ready', createdAt: '2026-10-27' },
  { assetId: 'video-2', filename: 'Cloud cost lab.mp4', category: 'video', contentType: 'video/mp4', contentDate: '2026-10-27', byteSize: media.length, videoProcessingState: 'ready', videoDurationSeconds: 3, batchId, courseId: 'ceap', status: 'ready', createdAt: '2026-10-27' },
  { assetId: 'pdf-1', filename: 'Cloud reference guide.pdf', category: 'pdf', contentType: 'application/pdf', contentDate: '2026-10-27', byteSize: 1024, batchId, courseId: 'ceap', status: 'ready', createdAt: '2026-10-27' },
];
let browser;
(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ _id: 'demo-student', name: 'Demo Learner', email: 'learner@example.invalid', role: 'student' }));
    localStorage.setItem('sessionToken', 'test-only'); localStorage.setItem('deviceId', 'test-only');
  });
  const requests = [], errors = [];
  let storageDisabled = false;
  await context.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.fallback() : route.fulfill({ body: '' }));
  await context.route('**/test-media/classroom.mp4', route => route.fulfill({ contentType: 'video/mp4', body: media }));
  await context.route('**/api/**', route => {
    const request = route.request(), url = new URL(request.url()); requests.push(url);
    const json = data => route.fulfill({ json: { success: true, ...data } });
    if (url.pathname === '/api/batches') return json({ batches, recordedCourses, enrollments: [], pendingLiveEnrollments: pending });
    if (url.pathname === '/api/batch-submissions') return json({ submissions: [] });
    if (url.pathname === '/api/lesson-progress') return json({ byBatch: {}, completedMaterialIds: [] });
    if (url.pathname === '/api/student/content-inventory') return json({ inventory: [] });
    if (url.pathname === '/api/s3/student/assets') {
      if (storageDisabled) return route.fulfill({ status: 503, json: { success: false, message: 'Storage unavailable' } });
      const category = url.searchParams.get('category');
      const found = assets.filter(asset => asset.category === category);
      return json({ assets: found, total: found.length, hasMore: false });
    }
    if (url.pathname === '/api/s3/student/access-url') {
      const asset = assets.find(asset => asset.assetId === request.postDataJSON().assetId);
      return json({ filename: asset.filename, contentType: asset.contentType, url: base + '/test-media/classroom.mp4', expiresAt: new Date(Date.now() + 600000).toISOString() });
    }
    return json({});
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function go(route) { await page.goto(base + route); }
  async function fits(label) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, `${label}: horizontal overflow`); }
  async function screenshot(name, fullPage = false) { await page.screenshot({ path: path.join(output, name + '.png'), fullPage, animations: 'disabled' }); }

  await go('/student/batches');
  await page.getByRole('heading', { name: 'My Batches', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: /Open classroom/ }).count(), 2);
  assert.equal(await page.getByRole('tablist').count(), 0);
  assert.equal(requests.filter(url => url.pathname === '/api/s3/student/assets').length, 0, 'Library overview must not fetch classroom files');
  await fits('desktop library'); await screenshot('library-desktop');
  await page.getByRole('searchbox', { name: 'Search your batches and courses' }).fill('CEAP');
  assert.equal(await page.getByRole('link', { name: /Open classroom/ }).count(), 1);
  await page.getByRole('link', { name: /CEAP-Batch4/ }).click();
  await page.waitForURL(`**/student/batches?batch=${batchId}`);
  await page.getByRole('heading', { name: 'CEAP-Batch4', exact: true }).waitFor();
  await page.getByText('AWS services overview.mp4', { exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'My Batches', exact: true }).count(), 0);
  assert.equal(await page.getByText('Self-paced Cloud Basics', { exact: true }).count(), 0);
  assert.equal(await page.getByText('FinOps Foundations', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Future Live Training', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Batch learning files', exact: true }).count(), 0);
  await fits('desktop classroom'); await screenshot('classroom-desktop');

  await page.getByRole('button', { name: 'PDFs', exact: true }).click();
  await page.getByText('Cloud reference guide.pdf', { exact: true }).waitFor();
  assert.equal(await page.getByText('AWS services overview.mp4', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Videos', exact: true }).click();
  await page.getByRole('button', { name: 'Watch lesson', exact: true }).first().click();
  await page.getByRole('complementary', { name: 'Lesson playlist' }).waitFor();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Videos', exact: true }).count(), 0, 'Player view should not repeat browse filters');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  await page.waitForFunction(() => (document.querySelector('video')?.duration || 0) > 2);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('complementary', { name: 'Lesson playlist' }).getByRole('button', { name: /Cloud cost lab/ }).click();
  await page.getByRole('heading', { name: 'Cloud cost lab.mp4', exact: true }).waitFor();
  await fits('desktop player'); await screenshot('player-desktop');
  await page.getByRole('button', { name: 'Back to learning files' }).click();
  await page.getByRole('button', { name: 'Videos', exact: true }).waitFor();

  await page.getByRole('button', { name: /Additional study resources/ }).click();
  await page.getByRole('heading', { name: 'Cloud architecture notes', exact: true }).waitFor();
  await page.getByRole('searchbox', { name: 'Search study resources' }).fill('no match');
  await page.getByText('No resources match “no match”.', { exact: true }).waitFor();

  await page.getByRole('tab', { name: /Assignments/ }).click();
  await page.waitForURL('**/student/batches?batch=**&tab=assignments');
  await page.getByRole('heading', { name: 'Build your cloud architecture', exact: true }).waitFor();
  assert.equal(await page.getByRole('region', { name: 'Learning library', exact: true }).count(), 0);
  await page.reload();
  await page.getByRole('tab', { name: /Assignments/ }).waitFor();
  assert.equal(await page.getByRole('tab', { name: /Assignments/ }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: /Assignments/ }).press('ArrowRight');
  await page.waitForURL('**/student/batches?batch=**&tab=tests');
  assert.equal(await page.getByRole('tab', { name: 'Tests', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: /Notices/ }).click();
  await page.getByRole('heading', { name: 'Welcome to your classroom', exact: true }).waitFor();
  await page.getByRole('tab', { name: /Faculty/ }).click();
  await page.getByRole('heading', { name: 'Demo Trainer', exact: true }).waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Learning library', exact: true }).click();
  await page.getByText('AWS services overview.mp4', { exact: true }).waitFor();
  await fits('mobile classroom'); await screenshot('classroom-mobile', true);
  await page.getByRole('button', { name: 'Watch lesson', exact: true }).first().click();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await fits('mobile player'); await screenshot('player-mobile', true);
  await page.getByRole('link', { name: 'All my batches', exact: true }).click();
  await page.getByRole('heading', { name: 'My Batches', exact: true }).waitFor();
  await page.getByRole('searchbox', { name: 'Search your batches and courses' }).fill('');
  await page.getByRole('link', { name: /Self-paced Cloud Basics/ }).click();
  await page.waitForURL('**/student/batches?recorded=recorded-course');
  await page.getByRole('heading', { name: 'Self-paced Cloud Basics', exact: true }).waitFor();
  assert.equal(await page.getByText('CEAP-Batch4', { exact: true }).count(), 0);
  await fits('mobile recorded course');

  await go('/student/batches?batch=not-assigned');
  await page.getByRole('heading', { name: 'This classroom isn’t available', exact: true }).waitFor();
  storageDisabled = true;
  await go(`/student/batches?batch=${batchId}`);
  await page.getByRole('heading', { name: 'Cloud architecture notes', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Additional study resources/ }).count(), 0, 'Fallback library should be the primary content when storage is disabled');
  assert.deepEqual(errors, []);
  console.log('PASS: library/detail separation, existing deep links, isolated recorded courses, file categories, protected video playback and playlist, legacy resources, persisted tabs, keyboard navigation, unavailable batches, storage fallback, and desktop/mobile layouts.');
  await browser.close();
})().catch(async error => { console.error(error); if (browser) await browser.close().catch(() => {}); process.exitCode = 1; });
