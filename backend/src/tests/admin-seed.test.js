import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminUser } from '../scripts/admin.js';

test('buildAdminUser uses the user schema fields required by login', () => {
  const doc = buildAdminUser();

  assert.equal(doc.name, 'Fashion Hub Admin');
  assert.equal(doc.email, 'admin@fashionhub.com');
  assert.ok(doc.passwordHash.startsWith('$2a$') || doc.passwordHash.startsWith('$2b$'));
  assert.equal(doc.role, 'ADMIN');
  assert.equal(doc.active, true);
  assert.equal(doc.status, undefined);
});
