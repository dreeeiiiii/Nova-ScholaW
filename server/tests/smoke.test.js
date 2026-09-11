import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import createApp from '../src/app.js';

describe('server smoke tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it('GET /api/health responds ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'novaschola-server');
  });

  it('POST /api/health responds ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { method: 'POST' });
    assert.equal(res.status, 200);
  });

  it('unknown route returns 404 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, 404);
  });
});