const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}, extra = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: name => dependencies[name] || {},
    Response, URL, console: { log() {}, warn() {} }, process: { env: { MONGO_URI: 'test-only-no-connection' } },
    ...extra,
  }, { filename: file });
  return module.exports;
}

async function testFeeDashboard() {
  const { derivePaymentStatus } = load('lib/adminFees.ts');
  const { COUNTABLE_RECEIPT_STATUSES, calculateRemaining } = load('lib/fees.ts');
  const accounts = [100,100,100,0,100].map((totalFee,index) => ({ enrollmentId: String(index), totalFee }));
  const payments = [
    ['0',40,'APPROVED'], ['0',10,'PENDING_APPROVAL'], ['0',5,'CANCELLED'],
    ['1',100,'SENT'], ['4',100,'PENDING_APPROVAL'], ['orphan',7,'PENDING_APPROVAL'],
    ['2',1000,'REJECTED'],
  ].map(([enrollmentId,amount,receiptStatus]) => ({ tenantId: 'test', enrollmentId, amount, receiptStatus }));
  payments.push({ tenantId: 'other-tenant', enrollmentId: '0', amount: 999, receiptStatus: 'PENDING_APPROVAL' });
  let accountReads = 0, paymentReads = 0;
  const { GET } = load('app/api/admin/fees/dashboard/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/adminFees': { derivePaymentStatus, extractAdminCredentials: input => input, jsonError: error => { throw error; }, getLedgerSummary: () => { throw new Error('N+1 ledger query'); } },
    '@/lib/fees': { COUNTABLE_RECEIPT_STATUSES, calculateRemaining },
    '@/lib/auth/tenantSession': { verifyTenantAdmin: async () => ({ _id: 'test-admin' }) },
    '@/lib/mongodb': { connectDB: async () => {} },
    '@/lib/platform/runtime': { withTenantContext: handler => handler, withTenantScope: (query = {}) => ({ tenantId: 'test', ...query }) },
    '@/models/FeeAccount': { find: () => { accountReads++; return { select: () => ({ lean: async () => accounts }) }; } },
    '@/models/FeePayment': { countDocuments: async query => {
      assert.equal(query.tenantId, 'test'); assert.equal(query.receiptStatus, 'PENDING_APPROVAL'); return 3;
    }, aggregate: async pipeline => {
      paymentReads++;
      assert.equal(pipeline[0].$match.tenantId, 'test');
      assert.deepEqual([...pipeline[0].$match.receiptStatus.$in], [...COUNTABLE_RECEIPT_STATUSES]);
      assert.equal(pipeline[1].$group._id, '$enrollmentId');
      assert.equal(pipeline[1].$group.totalPaid.$sum, '$amount');
      assert.deepEqual(JSON.parse(JSON.stringify(pipeline[1].$group.pendingCount)), { $sum: { $cond: [{ $eq: ['$receiptStatus', 'PENDING_APPROVAL'] }, 1, 0] } });
      const totals = new Map();
      for (const payment of payments.filter(payment => payment.tenantId === 'test' && COUNTABLE_RECEIPT_STATUSES.includes(payment.receiptStatus))) {
        const total = totals.get(payment.enrollmentId) || { _id: payment.enrollmentId, totalPaid: 0, pendingCount: 0 };
        total.totalPaid += payment.amount;
        total.pendingCount += Number(payment.receiptStatus === 'PENDING_APPROVAL');
        totals.set(payment.enrollmentId, total);
      }
      return [...totals.values()];
    } },
  });
  const response = await GET({ url: 'http://test/api/admin/fees/dashboard?userId=test-admin' });
  assert.deepEqual((await response.json()).dashboard, {
    totalStudents: 5, fullyPaidStudents: 2, partiallyPaidStudents: 1, unpaidStudents: 2,
    pendingApprovalCount: 3, totalFeeAmount: 400, totalPaidAmount: 250, totalOutstandingAmount: 150,
  });
  assert.equal(accountReads, 1); assert.equal(paymentReads, 1);
  accounts.push(...Array.from({ length: 1000 }, (_, index) => ({ enrollmentId: `extra-${index}`, totalFee: 100 })));
  await GET({ url: 'http://test/api/admin/fees/dashboard?userId=test-admin' });
  assert.equal(accountReads, 2); assert.equal(paymentReads, 2, 'Query count must stay constant as accounts increase');
  const approvals = await GET({ url: 'http://test/api/admin/fees/dashboard?userId=test-admin&view=approvals' });
  assert.deepEqual((await approvals.json()).dashboard, { pendingApprovalCount: 3 });
  assert.equal(accountReads, 2); assert.equal(paymentReads, 2, 'Overview badge must not calculate full ledgers');
}

async function testConnectionRecovery() {
  let attempts = 0;
  const mongoose = { connection: { readyState: 0 }, connect: async () => {
    attempts++;
    if (attempts === 1) throw new Error('Temporary outage');
    mongoose.connection.readyState = 1; return mongoose;
  } };
  const { connectDB } = load('lib/mongodb.ts', { mongoose });
  await assert.rejects(connectDB(), /Temporary outage/);
  const [first, second] = await Promise.all([connectDB(), connectDB()]);
  assert.equal(first, mongoose); assert.equal(second, mongoose); assert.equal(attempts, 2);
  await connectDB(); assert.equal(attempts, 2, 'Healthy connections must be reused');
  mongoose.connection.readyState = 0;
  await connectDB(); assert.equal(attempts, 3, 'Disconnected connections must recover');
}

async function testBatchReads() {
  let courseReads = 0;
  const selected = [];
  const enrollments = [
    { courseId: 'course-slug', courseName: 'Course One', learningMode: 'recorded' },
    { courseId: '012345678901234567890123', courseName: 'Course Two', learningMode: 'recorded' },
    { courseId: 'legacy-key', courseName: 'Legacy Course', learningMode: 'recorded' },
    { courseId: 'missing', learningMode: 'recorded' },
  ];
  const courses = [{ _id: 'one', slug: 'course-slug', title: 'Course One' }, { _id: '012345678901234567890123', title: 'Course Two' }, { _id: 'three', title: 'Legacy Course' }];
  const batchQuery = { sort() { return this; }, select(fields) { selected.push(fields); return this; }, lean: async () => [], then(resolve) { return Promise.resolve([]).then(resolve); } };
  const { GET } = load('app/api/batches/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    mongoose: { isValidObjectId: id => /^[a-f\d]{24}$/i.test(id) },
    '@/lib/mongodb': { connectDB: async () => {} },
    '@/models/User': { findById: async () => ({ _id: 'student', email: 'student@test', isLoggedIn: true, sessionToken: 'session', activeDevice: 'device' }) },
    '@/models/Enrollment': { find: () => ({ sort: async () => enrollments }) },
    '@/models/Batch': { find: () => batchQuery },
    '@/models/Course': { find: () => { courseReads++; return { lean: async () => courses }; }, findOne: () => { throw new Error('Per-enrollment query'); }, findById: () => { throw new Error('Per-enrollment query'); } },
  });
  const url = 'http://test/api/batches?scope=student&userId=student&sessionToken=session&deviceId=device';
  const full = await (await GET({ url })).json();
  assert.equal(full.recordedCourses.length, 4);
  assert.deepEqual(full.recordedCourses.map(item => item.course?._id || null), ['one', '012345678901234567890123', 'three', null]);
  assert.equal(courseReads, 1, 'All recorded enrollments share one course read');
  const summary = await (await GET({ url: url + '&view=dashboard' })).json();
  assert.equal(summary.success, true); assert.equal(courseReads, 1, 'Dashboard must not load recorded course content');
  assert.equal(summary.recordedCourses, undefined);
  assert.equal(selected.length, 1); assert.equal(selected[0].includes('questions'), false); assert.equal(selected[0].includes('materials'), false);
}

(async () => {
  await testFeeDashboard(); await testConnectionRecovery(); await testBatchReads();
  console.log('PASS: fee totals and tenant filtering, constant query count at 1,005 accounts, MongoDB outage recovery/deduplication, batched course matching, and lightweight dashboard reads.');
})().catch(error => { console.error(error); process.exitCode = 1; });
