import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useHydrated } from './use-hydrated';

const Probe = () => createElement('button', { disabled: !useHydrated() }, 'add');

describe('useHydrated', () => {
  it('is false in the server HTML, so JS-only buttons arrive disabled', () => {
    expect(renderToString(createElement(Probe))).toContain('disabled');
  });
});
