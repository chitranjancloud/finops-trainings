const assert = require('node:assert/strict');
const { test } = require('node:test');
const { checkSharePointAuth } = require('./check-sharepoint-auth.cjs');

const env = {
  SHAREPOINT_TENANT_ID: 'tenant', SHAREPOINT_CLIENT_ID: 'client',
  SHAREPOINT_CLIENT_SECRET: ' "test+secret&value" ',
};

test('fresh diagnostic uses effective credentials and excludes secrets and tokens', async () => {
  const result = await checkSharePointAuth(env, async (url, init) => {
    assert.equal(url, 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token');
    assert.equal(new URLSearchParams(init.body).get('client_secret'), 'test+secret&value');
    return Response.json({ access_token: 'must-not-be-printed' });
  });
  assert.equal(result.authentication.success, true);
  assert.equal(result.configuration.secretFormattingRemoved, true);
  assert.equal(result.configuration.secretFingerprint.length, 16);
  assert.ok(!JSON.stringify(result).includes('test+secret&value'));
  assert.ok(!JSON.stringify(result).includes('must-not-be-printed'));
});

test('diagnostic retains Microsoft error codes without copying arbitrary error descriptions', async () => {
  const result = await checkSharePointAuth(env, async () => Response.json({
    error_codes: [7000215], error_description: 'test+secret&value', correlation_id: 'correlation',
  }, { status: 401 }));
  assert.equal(result.authentication.success, false);
  assert.deepEqual(result.authentication.errorCodes, [7000215]);
  assert.ok(!JSON.stringify(result).includes('test+secret&value'));
});

test('missing configuration does not issue a token request', async () => {
  const result = await checkSharePointAuth({}, async () => { throw new Error('must not fetch'); });
  assert.equal(result.authentication.error, 'MISSING_CONFIGURATION');
});
