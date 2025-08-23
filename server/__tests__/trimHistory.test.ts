import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimHistory } from '../middleware/trimHistory.ts';

test('trimHistory limits characters', () => {
  const msgs = Array.from({ length: 5 }, (_, i) => ({ role: 'user', content: 'x'.repeat(3000) + i }));
  const trimmed = trimHistory(msgs, 8000);
  const total = trimmed.reduce((sum, m) => sum + m.content.length, 0);
  assert.ok(total <= 8000);
  assert.equal(trimmed.length, 2);
  assert.ok(trimmed[0].content.endsWith('3'));
  assert.ok(trimmed[1].content.endsWith('4'));
});
