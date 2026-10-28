const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const base = process.env.UI_TEST_URL || 'http://localhost:3101';
let browser;
(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url()); if (url.hostname === 'localhost' && request.resourceType() === 'fetch' && !url.searchParams.has('_rsc')) requests.push(url); });
  await context.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.fallback() : route.fulfill({ body: '' }));
  let releaseAssessment;
  const assessmentGate = new Promise(resolve => { releaseAssessment = resolve; });
  let holdingAssessments = false;
  let holdEnrollments = false;
  let releaseEnrollments;
  const enrollmentGate = new Promise(resolve => { releaseEnrollments = resolve; });
  const course = { _id: 'course', slug: 'cloud', title: 'Cloud Practice', description: 'Practical cloud skills', learn: [], prerequisites: [] };
  const empty = { success: true, courses: [], batches: [], submissions: [], enrollments: [], banners: [], partners: [], trustedCompanies: [], testimonials: [], webinars: [], inquiries: [], bookings: [], users: [], activities: [], sessions: [], meetings: [], history: [], scheduled: [], records: [], data: [], dashboard: { pendingApprovalCount: 0 } };
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname;
    let data = { ...empty };
    if (endpoint === '/api/enrollments' && holdEnrollments) await enrollmentGate;
    if (endpoint === '/api/courses') data.courses = [course];
    if (endpoint === '/api/user-report') data = { success: true, user: { name: 'Demo Learner' }, summary: { enrolledCourses: 1, averageCompletion: 25, activeTime: '1h' }, courses: [{ courseName: 'Cloud Practice', batchId: 'batch', statusClass: 'enrolled', completedLessons: 1, totalLessons: 4, completion: 25 }] };
    if (endpoint === '/api/teams-meetings') data.meetings = [{ _id: 'meeting', title: 'Live cloud lab', startsAt: '2099-01-01T10:00:00Z' }];
    if (endpoint === '/api/batches' && holdingAssessments) {
      await assessmentGate;
      data.batches = [{ _id: 'batch', name: 'Cloud cohort', assignments: [{ _id: 'work', title: 'Deploy your project', dueDate: '2099-01-01T10:00:00Z', isActive: true }], tests: [] }];
    }
    return route.fulfill({ json: data });
  });
  await page.goto(base);
  await page.getByRole('link', { name: /View course/ }).waitFor();
  await page.waitForLoadState('networkidle');
  assert.equal(requests.length, 4, 'Closed chatbot must not fetch APIs or download unrelated pages');
  assert.equal(requests.filter(url => url.pathname === '/api/courses').length, 1);
  assert.equal(requests.filter(url => !url.pathname.startsWith('/api/')).length, 0);
  await page.getByRole('button', { name: 'Open website assistant' }).click();
  await page.waitForLoadState('networkidle');
  assert.equal(requests.filter(url => url.pathname === '/api/courses').length, 2, 'Assistant loads data only on demand');
  assert.equal(requests.filter(url => !url.pathname.startsWith('/api/')).length, 0, 'Assistant must use known routes without downloading full pages');

  await context.addInitScript(() => {
    const admin = location.pathname.startsWith('/admin-page');
    localStorage.setItem('user', JSON.stringify({ _id: 'demo', name: 'Demo', email: 'demo@example.com', role: admin ? 'admin' : 'student' }));
    localStorage.setItem('sessionToken', 'test'); localStorage.setItem('deviceId', 'test');
  });
  holdingAssessments = true;
  await page.goto(base + '/student');
  await page.getByRole('link', { name: 'Continue learning' }).waitFor();
  await page.getByRole('heading', { name: 'Live cloud lab' }).waitFor();
  await page.getByText('Loading upcoming work…', { exact: true }).waitFor();
  assert.ok(requests.some(url => url.pathname === '/api/batches' && url.searchParams.get('view') === 'dashboard'));
  releaseAssessment();
  await page.getByRole('link', { name: /Deploy your project/ }).waitFor();

  requests.length = 0;
  holdEnrollments = true;
  await page.goto(base + '/admin-page');
  await page.getByRole('heading', { name: 'Keep learning operations moving.' }).waitFor();
  await page.locator('[aria-label="Awaiting batch assignment: loading"]').waitFor();
  assert.equal(await page.getByRole('link', { name: /Awaiting batch assignment/ }).getByText('Up to date', { exact: true }).count(), 0, 'Unloaded counts must not look like zero');
  releaseEnrollments();
  await page.waitForLoadState('networkidle');
  for (const path of ['/api/partners', '/api/trusted-companies', '/api/hero-banners', '/api/testimonials', '/api/webinars', '/api/session-showcases']) {
    assert.equal(requests.some(url => url.pathname === path), false, `Overview must not load ${path}`);
  }
  assert.ok(requests.some(url => url.pathname === '/api/admin/fees/dashboard' && url.searchParams.get('view') === 'approvals'));
  assert.equal(requests.filter(url => url.pathname === '/api/student-activity').length, 0, 'Remove unused duplicate activity requests');
  assert.equal(requests.filter(url => url.pathname === '/api/admin/student-monitoring').length, 1, 'Activity data should be loaded once by its visible component');

  requests.length = 0;
  await page.goto(base + '/admin-page/website');
  await page.getByRole('heading', { name: 'Keep your public website current.' }).waitFor();
  await page.waitForLoadState('networkidle');
  for (const path of ['/api/courses', '/api/enrollments', '/api/student-activity', '/api/admin/fees/dashboard', '/api/batches']) {
    assert.equal(requests.some(url => url.pathname === path), false, `Website editor must not load ${path}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 4 initial homepage requests, lazy chatbot with no page probes, progressive dashboard with a deliberately blocked API, dashboard-only payload requests, and section-specific admin fetching.');
  await browser.close();
})().catch(async error => { console.error(error); if (browser) await browser.close().catch(() => {}); process.exitCode = 1; });

