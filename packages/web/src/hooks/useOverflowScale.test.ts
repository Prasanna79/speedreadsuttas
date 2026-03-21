import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOverflowScale } from './useOverflowScale';

function mockDimensions(el: HTMLElement, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
}

function createMockedRef(scrollWidth: number, clientWidth: number) {
  const el = document.createElement('div');
  mockDimensions(el, scrollWidth, clientWidth);
  return { current: el } as React.RefObject<HTMLDivElement>;
}

describe('useOverflowScale', () => {
  it('does not scale when content fits', () => {
    const ref = createMockedRef(300, 400);
    const { result } = renderHook(() => {
      useOverflowScale(ref, 'short');
      return ref;
    });
    expect(result.current.current?.style.transform).toBe('');
  });

  it('applies scale when content overflows', () => {
    const ref = createMockedRef(600, 300);
    const { result } = renderHook(() => {
      useOverflowScale(ref, 'long-word');
      return ref;
    });
    expect(result.current.current?.style.transform).toBe('scale(0.5)');
  });

  it('applies scale when scrollWidth equals clientWidth (no overflow)', () => {
    const ref = createMockedRef(400, 400);
    const { result } = renderHook(() => {
      useOverflowScale(ref, 'exact');
      return ref;
    });
    expect(result.current.current?.style.transform).toBe('');
  });
});
