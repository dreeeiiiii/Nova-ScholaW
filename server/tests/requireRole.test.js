import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import requireRole from '../src/shared/middleware/requireRole.js';

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

describe('requireRole middleware', () => {
  it('allows a user whose role matches', () => {
    let called = false;
    const next = () => {
      called = true;
    };
    requireRole('admin')({ user: { role: 'admin' } }, makeRes(), next);
    assert.equal(called, true);
  });

  it('allows a user matching any of the allowed roles', () => {
    let called = false;
    const next = () => {
      called = true;
    };
    requireRole('teacher', 'admin')({ user: { role: 'teacher' } }, makeRes(), next);
    assert.equal(called, true);
  });

  it('rejects a user with an unauthorized role (403)', () => {
    const res = makeRes();
    requireRole('admin')({ user: { role: 'student' } }, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.status, 403);
  });

  it('rejects requests without a user (401)', () => {
    const res = makeRes();
    requireRole('admin')({}, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.status, 401);
  });
});