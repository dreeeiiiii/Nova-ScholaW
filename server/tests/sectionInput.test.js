import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, validateSectionName } from '../src/shared/utils/sectionInput.js';

test('official section names normalize whitespace without losing letters, numbers or hyphens', () => {
  assert.equal(validateSectionName('  BSIS   1-A  '), 'BSIS 1-A');
  assert.equal(normalizeName(' BSIS\t1-A ').toLowerCase(), normalizeName('bsis 1-a'));
  for (const name of ['NEWPROGRAM 1-A', 'Grade 7 - A', 'STEM 12-C']) assert.equal(validateSectionName(name), name);
});
test('blank, markup, control characters, malformed and oversized section names are rejected', () => {
  for (const value of ['', '   ', 'asdf', '<script>', 'BSIS 1-A<script>', 'BSIS\u00001-A', '1---A', 'A'.repeat(101), null, {}]) {
    assert.throws(() => validateSectionName(value), { status: 400 });
  }
});
