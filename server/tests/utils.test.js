import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import config from '../src/config/env.js';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { signToken, verifyToken } from '../src/utils/jwt.js';

describe('password utilities', () => {
  it('hashes a plaintext password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    assert.equal(typeof hash, 'string');
    assert.notEqual(hash, 'Sup3rSecret!');
    assert.match(hash, /^\$2[aby]\$\d+\$/);
  });

  it('comparePassword matches the correct password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    assert.equal(await comparePassword('Sup3rSecret!', hash), true);
  });

  it('comparePassword rejects a wrong password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    assert.equal(await comparePassword('WrongPassword', hash), false);
  });
});

describe('jwt utilities', () => {
  it('signToken produces a token and verifyToken returns the payload', () => {
    const token = signToken({ sub: 42, role: 'admin' });
    assert.equal(typeof token, 'string');
    const decoded = verifyToken(token);
    assert.equal(decoded.sub, 42);
    assert.equal(decoded.role, 'admin');
  });

  it('verifyToken throws on a tampered token', () => {
    const token = signToken({ sub: 42 });
    assert.throws(() => verifyToken(`${token.slice(0, -3)}abc`));
  });

  it('verifyToken throws on an expired token', () => {
    const expired = jwt.sign({ sub: 42 }, config.jwtSecret, { expiresIn: '-1s' });
    assert.throws(() => verifyToken(expired));
  });

  it('verifyToken throws on a non-token string', () => {
    assert.throws(() => verifyToken('not-a-jwt'));
  });
});