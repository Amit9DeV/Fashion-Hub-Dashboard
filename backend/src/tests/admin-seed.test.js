import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminUser } from '../scripts/admin.js';

test('buildAdminUser uses the user schema fields required by login and an explicit password', async () => {
  const doc = await buildAdminUser({ email: 'admin@example.com', password: 'correct horse battery staple' });

  assert.equal(doc.name, 'Fashion Hub Admin');
  assert.equal(doc.email, 'admin@example.com');
  assert.ok(doc.passwordHash.startsWith('$2a$') || doc.passwordHash.startsWith('$2b$'));
  assert.equal(doc.role, 'ADMIN');
  assert.equal(doc.active, true);
  assert.equal(doc.status, undefined);
});
