const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function loadConnection(env, connect) {
  const dnsServers = [];
  const mongoose = { connect };
  const exports = {};
  const context = {
    exports, global: {}, process: { env }, console: { log() {}, warn() {} },
    require(name) {
      if (name === 'mongoose') return mongoose;
      if (name === 'node:dns') return { setServers: (servers) => dnsServers.push(servers) };
      throw new Error(`Unexpected module: ${name}`);
    },
  };
  const source = ts.transpileModule(readFileSync('lib/mongodb.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, context);
  return { connectDB: exports.connectDB, dnsServers };
}

test('a failed connection can be retried on the next request', async () => {
  let attempts = 0;
  const connected = {};
  const { connectDB } = loadConnection({ MONGO_URI: 'mongodb://test' }, async () => {
    if (++attempts === 1) throw new Error('querySrv ECONNREFUSED');
    return connected;
  });
  await assert.rejects(connectDB(), /ECONNREFUSED/);
  assert.equal(await connectDB(), connected);
  assert.equal(attempts, 2);
});

test('an explicit DNS override is applied before connecting', async () => {
  let configured;
  const runtime = loadConnection({
    MONGO_URI: 'mongodb+srv://test', MONGODB_DNS_SERVERS: '8.8.8.8, 8.8.4.4',
  }, async () => { configured = runtime.dnsServers.length; return {}; });
  await runtime.connectDB();
  assert.equal(configured, 1);
  assert.deepEqual(Array.from(runtime.dnsServers[0]), ['8.8.8.8', '8.8.4.4']);
});

test('default connections preserve system DNS and share one connection', async () => {
  let attempts = 0;
  const runtime = loadConnection({ MONGO_URI: 'mongodb://test' }, async () => {
    attempts++;
    return {};
  });
  const [first, second] = await Promise.all([runtime.connectDB(), runtime.connectDB()]);
  assert.equal(first, second);
  assert.equal(attempts, 1);
  assert.equal(runtime.dnsServers.length, 0);
});
