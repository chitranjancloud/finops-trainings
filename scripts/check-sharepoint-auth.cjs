// Fresh authentication check; never outputs a client secret or access token.
const { createHash } = require('node:crypto');

function setting(value = '') {
  value = value.trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1).trim();
  return value;
}

async function checkSharePointAuth(env = process.env, fetchImpl = fetch) {
  const tenantId = setting(env.SHAREPOINT_TENANT_ID);
  const clientId = setting(env.SHAREPOINT_CLIENT_ID);
  const secret = setting(env.SHAREPOINT_CLIENT_SECRET);
  const configuration = {
    service: env.RAILWAY_SERVICE_NAME || 'local/unspecified',
    tenantId, clientId,
    secretLength: secret.length,
    secretFingerprint: createHash('sha256').update(secret).digest('hex').slice(0, 16),
    secretFormattingRemoved: secret !== (env.SHAREPOINT_CLIENT_SECRET || ''),
    videoDelivery: env.SHAREPOINT_VIDEO_DELIVERY || 'proxy',
  };
  if (!tenantId || !clientId || !secret) {
    return { configuration, authentication: { success: false, error: 'MISSING_CONFIGURATION' } };
  }
  try {
    const response = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    return {
      configuration,
      authentication: {
        success: response.ok && typeof data.access_token === 'string' && !!data.access_token,
        status: response.status,
        errorCodes: data.error_codes || [],
        correlationId: data.correlation_id || null,
      },
    };
  } catch (error) {
    return { configuration, authentication: { success: false, error: error.cause?.code || error.name || 'REQUEST_FAILED' } };
  }
}

module.exports = { checkSharePointAuth };

if (require.main === module) {
  if (process.argv.includes('--local')) {
    require('@next/env').loadEnvConfig(process.cwd(), true);
  }
  checkSharePointAuth().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.authentication.success ? 0 : 1;
  }).catch(() => { console.error('Diagnostic failed; no credential values printed.'); process.exitCode = 1; });
}
