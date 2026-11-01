import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const { outputText } = ts.transpileModule(await readFile('lib/sharepoint.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const keys = ['SHAREPOINT_TENANT_ID', 'SHAREPOINT_CLIENT_ID', 'SHAREPOINT_CLIENT_SECRET'];
const previous = keys.map(key => process.env[key]);
const previousFetch = globalThis.fetch;
try {
  const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  process.env.SHAREPOINT_TENANT_ID = ' "tenant" \n';
  process.env.SHAREPOINT_CLIENT_ID = " 'client' ";
  process.env.SHAREPOINT_CLIENT_SECRET = ' "literal+secret&with%special$characters" \n';
  const config = api.getSharePointConfig();
  assert.equal(config.tenantId, 'tenant');
  assert.equal(config.clientId, 'client');
  assert.equal(config.clientSecret, 'literal+secret&with%special$characters');
  console.log('PASS environment wrappers normalized without changing internal secret characters');
  let tokenCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/oauth2/v2.0/token')) {
      tokenCalls++;
      assert.equal(String(url), 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token');
      const form = new URLSearchParams(init.body);
      assert.equal(form.get('client_secret'), config.clientSecret);
      assert.equal(form.get('client_id'), 'client');
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    }
    return Response.json({ '@microsoft.graph.downloadUrl': 'https://example.invalid/video' });
  };
  await api.getSharePointItemDownloadUrl('drive', 'item');
  assert.equal(tokenCalls, 1);
  console.log('PASS token request preserves literal special characters');
} finally {
  globalThis.fetch = previousFetch;
  keys.forEach((key, index) => previous[index] === undefined ? delete process.env[key] : process.env[key] = previous[index]);
}
