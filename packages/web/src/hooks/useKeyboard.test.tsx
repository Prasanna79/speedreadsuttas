import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeyboard } from './useKeyboard';

function Harness({ handlers }: { handlers: Parameters<typeof useKeyboard>[0] }) {
  useKeyboard(handlers);
  return <input aria-label="typed" />;
}

describe('useKeyboard', () => {
  it('dispatches key handlers', () => {
    const handlers = {
      togglePlay: vi.fn(),
      skipBackward: vi.fn(),
      skipForward: vi.fn(),
      increaseWpm: vi.fn(),
      decreaseWpm: vi.fn(),
      restart: vi.fn(),
      setChunkSize: vi.fn(),
      toggleTheme: vi.fn(),
      goHome: vi.fn(),
    };

    render(<Harness handlers={handlers} />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handlers.togglePlay).toHaveBeenCalled();
    expect(handlers.skipBackward).toHaveBeenCalled();
    expect(handlers.skipForward).toHaveBeenCalled();
    expect(handlers.increaseWpm).toHaveBeenCalled();
    expect(handlers.decreaseWpm).toHaveBeenCalled();
    expect(handlers.restart).toHaveBeenCalled();
    expect(handlers.setChunkSize).toHaveBeenCalledWith(3);
    expect(handlers.toggleTheme).toHaveBeenCalled();
    expect(handlers.goHome).toHaveBeenCalled();
  });

  it('ignores shortcuts when input is focused', () => {
    const handlers = { togglePlay: vi.fn() };
    const { getByLabelText } = render(<Harness handlers={handlers} />);

    const input = getByLabelText('typed');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(handlers.togglePlay).not.toHaveBeenCalled();
  });

  it('prevents default on space and arrow up/down', () => {
    render(<Harness handlers={{}} />);

    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    window.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true);

    const up = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
    window.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    window.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });
});
