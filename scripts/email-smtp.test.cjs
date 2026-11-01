const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function sendSmtp(fail = false) {
  let message;
  let options;
  let closed = false;
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../lib/email.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, {
    module, exports: module.exports, console: { log() {} },
    process: { env: {
      SMTP_USER: 'sender@example.com',
      SMTP_HOST: 'smtp.office365.com', SMTP_PORT: '587', SMTP_SECURE: 'STARTTLS/TLS',
      SMTP_PASS: 'test-only', EMAIL_FROM: 'sender@example.com',
    } },
    require(name) {
      if (name === '@/lib/resend') return { getResendClient: () => null };
      if (name === 'nodemailer') return {
        createTransport(value) {
          options = value;
          return {
            async sendMail(value) { message = value; if (fail) throw new Error('Test failure'); },
            close() { closed = true; },
          };
        }
      };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  const result = await module.exports.sendEmail({
    to: 'recipient@example.com', subject: 'Test', html: '<p>Test</p>',
  });
  return { result, message, closed, options };
}

test('email helper uses password authentication with STARTTLS and closes the transport', async () => {
  const { result, message, closed, options } = await sendSmtp();
  assert.equal(options.auth.pass, 'test-only');
  assert.equal(options.auth.user, 'sender@example.com');
  assert.equal(options.secure, false);
  assert.equal(options.requireTLS, true);
  assert.equal(result.ok, true);
  assert.equal(result.provider, 'smtp');
  assert.equal(message.from, 'sender@example.com');
  assert.equal(message.to, 'recipient@example.com');
  assert.equal(closed, true);
});

test('email helper closes the SMTP transport after a delivery failure', async () => {
  const { result, closed } = await sendSmtp(true);
  assert.equal(result.ok, false);
  assert.equal(closed, true);
});
