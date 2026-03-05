import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fetchSuttaMeta } from '../lib/api';
import { TranslationChooser } from './TranslationChooser';

const navigate = vi.fn();

vi.mock('../lib/api', () => ({
  fetchSuttaMeta: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const mockedFetchSuttaMeta = vi.mocked(fetchSuttaMeta);

describe('TranslationChooser', () => {
  it('defaults to english sujato and navigates on start', async () => {
    mockedFetchSuttaMeta.mockResolvedValue({
      uid: 'mn1',
      collection: 'mn',
      title: 'Mūlapariyāyasutta',
      translations: [
        {
          lang: 'de',
          langName: 'German',
          author: 'sabbamitta',
          authorName: 'Sabbamitta',
          isRoot: false,
          publication: 'SuttaCentral',
          licence: 'CC0 1.0',
        },
        {
          lang: 'en',
          langName: 'English',
          author: 'sujato',
          authorName: 'Bhikkhu Sujato',
          isRoot: false,
          publication: 'SuttaCentral',
          licence: 'CC0 1.0',
        },
      ],
    });

    render(<TranslationChooser uid="mn1" />);

    await waitFor(() => expect(screen.getByText('Choose translation')).toBeInTheDocument());
    expect(screen.getByText('English')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Bhikkhu Sujato')).toBeChecked());

    fireEvent.click(screen.getByRole('button', { name: 'Start Reading' }));
    expect(navigate).toHaveBeenCalledWith('/read/mn1/en/sujato');
  });
});
