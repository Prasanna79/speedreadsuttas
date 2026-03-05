import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders progress and formatted time', () => {
    render(<ProgressBar progress={0.42} timeRemainingMs={180000} totalChunks={100} onSeek={() => undefined} />);

    expect(screen.getByText('42% · ~3 min')).toBeInTheDocument();
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '42%' });
  });

  it('click seeks to computed chunk index', () => {
    const onSeek = vi.fn();
    render(<ProgressBar progress={0.1} timeRemainingMs={30000} totalChunks={20} onSeek={onSeek} />);

    const button = screen.getByRole('button', { name: 'Seek progress' });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 10,
      top: 0,
      right: 200,
      bottom: 10,
      left: 0,
      toJSON: () => undefined,
    });

    fireEvent.click(button, { clientX: 100 });
    expect(onSeek).toHaveBeenCalledWith(10);
  });
});
