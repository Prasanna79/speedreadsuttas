import { useEffect, useLayoutEffect, type RefObject } from 'react';

function measure(el: HTMLElement): void {
  const { scrollWidth, clientWidth } = el;
  if (scrollWidth > clientWidth) {
    el.style.transform = `scale(${clientWidth / scrollWidth})`;
  } else {
    el.style.transform = '';
  }
}

/**
 * Detects overflow on a referenced element and applies transform: scale()
 * to shrink it just enough to fit. Mutates the DOM directly to avoid
 * re-render loops with ResizeObserver.
 */
export function useOverflowScale(ref: RefObject<HTMLElement | null>, content: unknown): void {
  // Handle content changes (new chunk each RSVP tick).
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) measure(el);
  }, [ref, content]);

  // Handle container resizes (window resize, orientation change).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(() => measure(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
