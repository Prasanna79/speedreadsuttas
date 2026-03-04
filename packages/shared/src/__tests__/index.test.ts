import { describe, expect, it } from 'vitest';

import * as shared from '../index';

describe('index exports', () => {
  it('re-exports public shared surface', () => {
    expect(shared.WPM_DEFAULT).toBe(250);
    expect(typeof shared.normalizeInput).toBe('function');
    expect(typeof shared.tokenize).toBe('function');
    expect(typeof shared.buildChunks).toBe('function');
    expect(typeof shared.getOrpIndex).toBe('function');
    expect(typeof shared.searchIndex).toBe('function');
  });
});
