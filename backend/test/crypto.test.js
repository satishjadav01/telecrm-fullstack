const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, comparePassword } = require('../src/core/utils/crypto');

test('hashPassword creates non-plain hash', async () => {
  const plain = 'Pass@1234';
  const hash =   hashPassword(plain);
  assert.ok(hash);
  assert.notEqual(hash, plain);
});

test('comparePassword validates password correctly', async () => {
  const plain = 'Pass@1234';
  const hash = await hashPassword(plain);
  const ok = await comparePassword(plain, hash);
  const fail = await comparePassword('wrong', hash);
  assert.equal(ok, true);
  assert.equal(fail, false);
});
