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

    render(<ReaderControls chunkSize={2} isPlaying={false} wpm={250} {...handlers} />);

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

  it('renders compact dock mode without advanced controls', () => {
    const onWpmChange = vi.fn();
    render(
      <ReaderControls
        chunkSize={2}
        compact
        isPlaying
        wpm={250}
        onChunkSizeChange={vi.fn()}
        onRestart={vi.fn()}
        onSkipBackward={vi.fn()}
        onSkipForward={vi.fn()}
        onTogglePlay={vi.fn()}
        onWpmChange={onWpmChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Play or pause' })).toHaveTextContent('Pause');
    expect(screen.queryByLabelText('WPM slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chunk 1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Increase speed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease speed' }));
    expect(onWpmChange).toHaveBeenNthCalledWith(1, 275);
    expect(onWpmChange).toHaveBeenNthCalledWith(2, 225);
  });
});
