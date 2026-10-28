const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.UI_TEST_URL || 'http://localhost:3101';
const courses = [
  { _id: 'cloud', slug: 'azure-foundations', title: 'Azure Foundations', description: 'Hands-on cloud architecture', level: 'Beginner', duration: '6 weeks', recordedPrice: '₹5,000', enrolled: '40', createdAt: '2026-10-01', learn: ['Build a cloud project'], prerequisites: [] },
  { _id: 'security', slug: 'security-practice', title: 'Security Practice', description: 'Security fundamentals', level: 'Intermediate', price: '₹7,000', enrolled: '20', createdAt: '2026-10-20', learn: ['Investigate incidents'], prerequisites: [] },
];
const batch = { _id: 'batch-1', name: 'Azure October', courseId: 'azure-foundations', courseName: 'Azure Foundations', isActive: true, materials: [], tests: [], assignments: [{ _id: 'assignment-1', title: 'Build your first cloud lab', dueDate: '2026-12-01T10:00:00Z', isActive: true }], notices: [], faculty: [] };
const empty = { success: true, courses: [], batches: [], submissions: [], enrollments: [], banners: [], partners: [], companies: [], trustedCompanies: [], rooms: [], messages: [], testimonials: [], webinars: [], inquiries: [], bookings: [], users: [], activities: [], showcases: [], sessions: [], meetings: [], scheduled: [], history: [], counts: {}, notifications: [], data: [] };

let browser;
(async () => {
  browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return route.fulfill({ status: 200, body: '' });
    return route.fallback();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
  let courseFailure = false;
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname;
    let body = { ...empty };
    if (endpoint === '/api/courses') {
      if (courseFailure) return route.fulfill({ status: 503, json: { success: false } });
      body.courses = courses;
    }
    if (endpoint === '/api/login') return route.fulfill({ status: 401, json: { success: false, message: 'Check your credentials' } });
    if (endpoint === '/api/user-report') body = { success: true, user: { name: 'Demo Learner' }, summary: { enrolledCourses: 1, averageCompletion: 25, activeTime: '2h' }, courses: [{ courseName: 'Azure Foundations', batchId: 'batch-1', completion: 25, totalLessons: 4, completedLessons: 1, statusClass: 'enrolled' }] };
    if (endpoint === '/api/batches') body.batches = [batch];
    if (endpoint === '/api/teams-meetings') body.meetings = [{ _id: 'meeting-1', title: 'Cloud lab walkthrough', startsAt: '2026-12-01T10:00:00Z' }];
    if (endpoint === '/api/admin/fees/dashboard') body.dashboard = { pendingApprovalCount: 3 };
    if (endpoint === '/api/testimonials') body.testimonials = [{ _id: 'review-1', name: 'Demo Learner', content: 'Practical learning helped me understand cloud concepts.', status: 'approved' }];
    return route.fulfill({ json: body });
  });
  async function go(path) { console.log('Checking', path); await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  async function noOverflow(label) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    assert.equal(overflow, false, `${label}: horizontal overflow`);
  }
  fs.mkdirSync('artifacts/ui-refresh', { recursive: true });
  await go('/');
  const brandLogo = page.getByRole('img', { name: 'FinOps Trainings by CloudCadre' }).first();
  await brandLogo.evaluate(image => image.decode());
  assert.ok(await brandLogo.evaluate(image => image.naturalWidth > 0 && image.getBoundingClientRect().width > 0));
  await page.getByRole('heading', { name: 'Practical skills. Clear learning paths.' }).waitFor();
  await page.getByRole('link', { name: /View course/ }).first().waitFor();
  assert.equal(await page.getByRole('link', { name: /View course/ }).count(), 2);
  await page.getByRole('button', { name: 'Security', exact: true }).click();
  assert.equal(await page.getByRole('link', { name: /View course/ }).count(), 1);
  await page.getByRole('button', { name: 'All topics', exact: true }).click();
  await page.getByRole('searchbox').fill('no match');
  await page.getByRole('heading', { name: 'No matching courses' }).waitFor();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('combobox').selectOption('newest');
  assert.match(await page.getByRole('link', { name: /View course/ }).first().innerText(), /Security Practice/);
  await noOverflow('desktop homepage');
  await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.screenshot({ path: 'artifacts/ui-refresh/home-desktop.png', fullPage: true });
  await go('/courses/azure-foundations');
  await page.getByRole('heading', { name: 'Azure Foundations', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Please Login to View Course' }).count(), 0);
  await go('/courses/missing-course');
  await page.getByRole('heading', { name: 'Course not found' }).waitFor();
  courseFailure = true; await go('/');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  courseFailure = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('link', { name: /Azure Foundations/ }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('mobile homepage');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Corporate training' }).waitFor();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'artifacts/ui-refresh/home-mobile.png', fullPage: true });
  await go('/login');
  await page.getByLabel('Email address', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Password', { exact: true }).fill('example-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await page.getByRole('button', { name: 'Hide password', exact: true }).waitFor();
  await page.getByLabel('Email address', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Password', { exact: true }).fill('example-password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Check your credentials' }).waitFor();
  await context.addInitScript(() => { const admin = location.pathname.startsWith('/admin-page'); localStorage.setItem('user', JSON.stringify({ _id: admin ? 'demo-admin' : 'demo', name: admin ? 'Demo Admin' : 'Demo Learner', email: 'demo@example.com', role: admin ? 'admin' : 'student' })); localStorage.setItem('sessionToken', 'ui-test'); localStorage.setItem('deviceId', 'ui-test'); });
  await go('/student');
  await page.getByRole('link', { name: 'Continue learning' }).waitFor();
  await page.getByRole('link', { name: /Build your first cloud lab/ }).waitFor();
  await noOverflow('mobile student dashboard');
  await page.screenshot({ path: 'artifacts/ui-refresh/student-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Open navigation', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.getByRole('link', { name: /Build your first cloud lab/ }).click();
  await page.waitForURL('**/student/batches?batch=batch-1&tab=assignments');
  await page.getByRole('heading', { name: 'My Batches' }).waitFor();
  await noOverflow('mobile batch classroom');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go('/student');
  await page.getByRole('link', { name: 'Continue learning' }).waitFor();
  await page.screenshot({ path: 'artifacts/ui-refresh/student-desktop.png', fullPage: true });
  await go('/admin-page');
  await page.getByRole('heading', { name: 'Keep learning operations moving.' }).waitFor();
  await page.getByRole('link', { name: /Payment approvals/ }).filter({ hasText: '3' }).waitFor();
  await noOverflow('desktop admin');
  await page.screenshot({ path: 'artifacts/ui-refresh/admin-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('mobile admin');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Website content', exact: true }).click();
  await page.getByRole('heading', { name: 'Keep your public website current.' }).waitFor();
  await noOverflow('mobile website content');
  assert.equal(await page.getByRole('heading', { name: 'Your Courses', exact: true }).count(), 0);
  assert.deepEqual(errors, [], 'Unexpected browser errors');
  console.log('PASS: discovery filters/search/sort, API recovery, public course details, missing course, login errors, student actions/deep links, admin content separation, keyboard navigation, and responsive overflow checks.');
  await browser.close();
})().catch(async error => { console.error(error); if (browser) await browser.close().catch(() => {}); process.exit(1); });
