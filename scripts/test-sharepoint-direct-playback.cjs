const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(file, dependencies, env = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Request, Response, URL, URLSearchParams, Headers, console, fetch: (...args) => globalThis.fetch(...args), process: { env },
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

const cases = [
  ['batch', 'app/api/batch-content/route.ts', 'batchId=batch&materialId=material'],
  ['recorded', 'app/api/student/recorded-content/route.ts', 'courseId=course&resourceType=video&resourceIndex=0'],
  ['sharepoint', 'app/api/sharepoint-file/route.ts', 'courseId=course&driveId=drive&itemId=item&name=lesson.mp4'],
];

test('direct delivery is opt-in and preserves proxy as the default', () => {
  const file = 'lib/video/sharePointDelivery.ts';
  const deps = { '@/lib/sharepoint': {} };
  assert.equal(load(file, deps).directSharePointVideoEnabled(), false);
  assert.equal(load(file, deps, { SHAREPOINT_VIDEO_DELIVERY: 'direct' }).directSharePointVideoEnabled(), true);
  assert.equal(load(file, deps, { SHAREPOINT_VIDEO_DELIVERY: 'proxy' }).directSharePointVideoEnabled(), false);
});

for (const metadata of [
  { name: 'lesson.mp4', mimeType: 'video/mp4', downloadUrl: 'https://tenant.sharepoint.com/video' },
  { name: 'document.pdf', mimeType: 'application/pdf', downloadUrl: 'https://tenant.sharepoint.com/pdf' },
]) {
  test(`generic file classification uses trusted metadata: ${metadata.mimeType}`, async () => {
    const api = load('lib/video/sharePointDelivery.ts', {
      '@/lib/sharepoint': { getSharePointItemPlaybackMetadata: async () => metadata },
    });
    const response = await api.redirectSharePointVideoIfVideo('drive', 'item');
    if (metadata.mimeType.startsWith('video/')) assert.equal(response.status, 307);
    else assert.equal(response, null);
  });
}

for (const url of ['https://tenant.sharepoint.com/video?temporary=test', null, 'http://insecure.test/video', 'javascript:alert(1)']) {
  test(`direct response validates URL: ${url ? new URL(url).protocol : 'missing'}`, async () => {
    const api = load('lib/video/sharePointDelivery.ts', {
      '@/lib/sharepoint': { getSharePointItemDownloadUrl: async () => url },
    });
    if (!url?.startsWith('https://')) {
      await assert.rejects(api.redirectToSharePointVideo('drive', 'item'));
      return;
    }
    const response = await api.redirectToSharePointVideo('drive', 'item');
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), url);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-video-delivery'), 'sharepoint-direct');
    assert.equal(await response.text(), '');
  });
}

test('direct delivery fetches only Graph metadata and never sends the app token to the browser', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push(String(url));
    if (String(url).startsWith('https://login.microsoftonline.com/')) {
      return Response.json({ access_token: 'server-only-token', expires_in: 3600 });
    }
    assert.ok(String(url).startsWith('https://graph.microsoft.com/v1.0/drives/'));
    assert.ok(!String(url).includes('/content'), 'metadata only, never the file content endpoint');
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer server-only-token');
    assert.equal(init.cache, 'no-store');
    return Response.json({ '@microsoft.graph.downloadUrl': 'https://tenant.sharepoint.com/video?temporary=test' });
  };
  try {
    const sharepoint = load('lib/sharepoint.ts', {}, {
      SHAREPOINT_TENANT_ID: 'test', SHAREPOINT_CLIENT_ID: 'test', SHAREPOINT_CLIENT_SECRET: 'test',
    });
    const api = load('lib/video/sharePointDelivery.ts', { '@/lib/sharepoint': sharepoint });
    const response = await api.redirectToSharePointVideo('drive', 'item');
    assert.equal(response.status, 307);
    assert.equal(requests.length, 2);
    assert.equal(response.headers.get('authorization'), null);
    assert.ok(!JSON.stringify([...response.headers]).includes('server-only-token'));
    assert.equal(await response.text(), '');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for (const [label, file, query] of cases) {
  for (const scenario of ['direct', ...(label === 'batch' ? ['inventory'] : []), ...(label === 'sharepoint' ? ['spoofed-pdf', 'unnamed-video'] : []), 'session', 'enrollment', 'file', 'proxy', 'metadata-failure', 'pdf']) {
    test(`${label}: ${scenario}`, async () => {
      let redirects = 0, byteRequests = 0;
      const user = { _id: 'user', role: 'user' };
      const material = { _id: 'material', name: scenario === 'pdf' ? 'lesson.pdf' : 'lesson.mp4', type: scenario === 'pdf' ? 'pdf' : 'video', url: '/api/sharepoint-file?driveId=drive&itemId=item' };
      const batch = { _id: 'batch', materials: [material] };
      const course = { videos: [material], pdfs: [material] };
      const directResponse = async () => {
        redirects++;
        if (scenario === 'metadata-failure') throw new Error('Playback URL unavailable');
        return new Response(null, { status: 307, headers: { Location: 'https://tenant.sharepoint.com/video?temporary=test' } });
      };
      const deps = {
        'next/server': { NextResponse: Response },
        '@/lib/mongodb': { connectDB: async () => {} },
        '@/lib/auth/tenantSession': { verifyTenantSession: async () => scenario === 'session' ? null : user },
        '@/lib/platform/runtime': { withTenantContext: (fn) => fn, withTenantScope: (v) => v, stampTenantId: (v) => v },
        '@/models/ContentInventory': { findOne: async () => scenario === 'inventory' ? {
          _id: 'inventory', fileName: 'lesson.mp4', fileType: 'video', url: '',
          sharePointDriveId: 'drive', sharePointItemId: 'item',
        } : null },
        '@/models/ContentAccessLog': { create: async () => {} },
        '@/lib/contentPreview': { serveInWebsitePreviewHtml: async () => new Response('preview') },
        '@/lib/sharepoint': { fetchSharePointFile: async () => { byteRequests++; return new Response('bytes', { headers: { 'content-type': scenario === 'pdf' ? 'application/pdf' : 'video/mp4' } }); } },
        '@/lib/video/sharePointDelivery': {
          directSharePointVideoEnabled: () => scenario !== 'proxy',
          redirectToSharePointVideo: directResponse,
          redirectSharePointVideoIfVideo: async () => ['pdf', 'spoofed-pdf'].includes(scenario) ? null : directResponse(),
        },
        '@/lib/auth/protectedContentAccess': {
          findAuthorizedBatch: async () => batch, findAuthorizedCourse: async () => course,
          verifyBatchEnrollment: async () => scenario !== 'enrollment', verifyCourseEnrollment: async () => scenario !== 'enrollment',
          verifySharePointItemAuthorized: async () => scenario !== 'file',
          extractSharePointParam: (url, key) => new URL(url, 'https://local').searchParams.get(key) || '',
          safeContentFilename: (name) => name,
          contentTypeFromName: (name, fallback) => fallback || (name.endsWith('.mp4') ? 'video/mp4' : 'application/pdf'),
          viewableKindFromName: (name) => name.endsWith('.mp4') ? 'video' : 'pdf',
          protectedContentResponseHeaders: () => ({}),
        },
      };
      const api = load(file, deps);
      const params = new URLSearchParams(`${query}&userId=user&sessionToken=session&deviceId=device`);
      if (scenario === 'inventory') { params.delete('materialId'); params.set('inventoryId', 'inventory'); }
      if (scenario === 'unnamed-video') params.delete('name');
      if (scenario === 'pdf') { params.set('name', 'lesson.pdf'); params.set('resourceType', 'pdf'); }
      const response = await api.GET(new Request(`https://app.test/api?${params}`));
      if (['session', 'enrollment', 'file'].includes(scenario)) {
        assert.ok([401, 403].includes(response.status));
        assert.equal(redirects, 0, 'no playback link before all authorization checks');
        assert.equal(byteRequests, 0);
      } else if (['direct', 'inventory', 'unnamed-video'].includes(scenario)) {
        assert.equal(response.status, 307);
        assert.equal(redirects, 1);
        assert.equal(byteRequests, 0, 'direct playback must never fetch video bytes');
      } else if (scenario === 'metadata-failure') {
        assert.ok(response.status >= 500);
        assert.equal(byteRequests, 0, 'do not silently fall back to streaming');
      } else {
        assert.equal(response.status, 200);
        assert.equal(redirects, 0);
        assert.equal(byteRequests, 1);
      }
    });
  }
}
