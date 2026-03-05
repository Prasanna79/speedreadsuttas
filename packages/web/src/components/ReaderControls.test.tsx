import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReaderControls } from './ReaderControls';

describe('ReaderControls', () => {
  it('renders controls and dispatches callbacks', () => {
    const handlers = {
      onTogglePlay: vi.fn(),
      onSkipBackward: vi.fn(),
      onSkipForward: vi.fn(),
      onWpmChange: vi.fn(),
      onChunkSizeChange: vi.fn(),
      onRestart: vi.fn(),
    };

    render(
      <ReaderControls
        chunkSize={2}
        isPlaying={false}
        wpm={250}
        {...handlers}
      />,
    );

    expect(screen.getByRole('button', { name: 'Play or pause' })).toHaveTextContent('Play');

    fireEvent.click(screen.getByRole('button', { name: 'Skip backward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip forward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play or pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chunk 4' }));
    fireEvent.change(screen.getByLabelText('WPM slider'), { target: { value: '300' } });

    expect(handlers.onSkipBackward).toHaveBeenCalled();
    expect(handlers.onSkipForward).toHaveBeenCalled();
    expect(handlers.onTogglePlay).toHaveBeenCalled();
    expect(handlers.onRestart).toHaveBeenCalled();
    expect(handlers.onChunkSizeChange).toHaveBeenCalledWith(4);
    expect(handlers.onWpmChange).toHaveBeenCalledWith(300);
  });
});
