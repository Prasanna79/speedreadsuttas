import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RSVPDisplay } from './RSVPDisplay';

describe('RSVPDisplay', () => {
  it('renders ORP highlight for chunks', () => {
    render(
      <RSVPDisplay
        chunk={[
          {
            word: 'Buddho',
            index: 0,
            segmentId: 'mn1:1.1',
            isParagraphStart: true,
            trailingPunctuation: '',
          },
        ]}
        fontFamily="serif"
        fontSize="normal"
      />,
    );

    expect(screen.getAllByTestId('orp-char')).toHaveLength(1);
    expect(screen.getByText('d')).toBeInTheDocument();
  });

  it('shows empty state when chunk is missing', () => {
    render(<RSVPDisplay chunk={null} fontFamily="serif" fontSize="large" />);
    expect(screen.getByText('No text loaded')).toBeInTheDocument();
  });
});
