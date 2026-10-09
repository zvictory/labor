import { describe, expect, it } from 'vitest';

import { broadcastMessage } from './broadcast';

describe('broadcastMessage', () => {
  const text = { ru: 'Новая коллекция', uz: 'Yangi kolleksiya' };

  it('sends each recipient their language, with the /stop line', () => {
    expect(broadcastMessage(text, 'uz')).toBe(
      'Yangi kolleksiya\n\n/stop — yangilik va aksiyalarni olmaslik',
    );
  });

  it('falls back to Russian when there is no translation', () => {
    expect(broadcastMessage(text, 'en')).toBe('Новая коллекция\n\n/stop — stop news and offers');
  });
});
