import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatSchema } from '../middleware/validateChat.ts';

test('chat schema validates', () => {
  assert.throws(() => chatSchema.parse({}), /messages/);
  assert.doesNotThrow(() => chatSchema.parse({
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }]
  }));
});
