import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import errorHandler from '../../src/shared/middleware/errorHandler.js';
Object.assign(process.env, { NODE_ENV: 'test', B2_BUCKET_NAME: 'mock', B2_BUCKET_ID: 'mock', B2_ENDPOINT: 'localhost', B2_REGION: 'mock', B2_KEY_ID: 'fake', B2_APPLICATION_KEY: 'fake' });
let unavailable = false;
test('server errors redact credentials from response and console', () => {
  const logs = [], original = console.error; console.error = (...args) => logs.push(args.join(' '));
  let status, body;
  try {
    errorHandler(new Error('secret-password-JWT-api-key-database-url'), {}, {
      status(value) { status=value; return this; }, json(value) { body=value; },
    });
    assert.equal(status, 500); assert.equal(body.message, 'Internal server error');
    assert.deepEqual(logs, ['[request] Internal server error']);
  } finally { console.error = original; }
});
mock.module('../../src/shared/config/db.js', { namedExports: {
  checkConnection: async () => { if (unavailable) throw new Error('secret-database-credential'); return true; },
  query: async () => assert.fail('No database queries allowed'), getClient: async () => assert.fail('No database connection allowed'),
} });
test('health rejects disconnected deployments without leaking connection errors', async () => {
  const { default: createApp } = await import('../../src/app.js');
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const logs = [], original = console.error; console.error = (...args) => logs.push(args.join(' '));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/health`;
    assert.equal((await fetch(url)).status, 200); unavailable = true;
    const response = await fetch(url); assert.equal(response.status, 503);
    assert.equal((await response.json()).database, 'disconnected');
    assert.deepEqual(logs, ['[health] database check failed']);
  } finally { console.error = original; await new Promise(r => server.close(r)); }
});
