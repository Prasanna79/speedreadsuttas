import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSearchIndex } from '../lib/api';
import { SearchInput } from './SearchInput';

vi.mock('../lib/api', () => ({
  fetchSearchIndex: vi.fn(),
}));

const mockedFetchSearchIndex = vi.mocked(fetchSearchIndex);

const index = [
  { uid: 'mn1', c: 'mn', t: 'The Root of All Things', p: 'Mūlapariyāyasutta', a: ['mulapariyaya'] },
  { uid: 'mn2', c: 'mn', t: 'All the Taints', p: 'Sabbāsavasutta', a: ['sabbasava'] },
];

describe('SearchInput', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debounces search, supports keyboard navigation, and selects item', async () => {
    mockedFetchSearchIndex.mockResolvedValue(index);
    const onSelectUid = vi.fn();

    render(<SearchInput onSelectUid={onSelectUid} />);

    const input = screen.getByLabelText('Search sutta');
    fireEvent.change(input, { target: { value: 'mn' } });

    await waitFor(() => expect(mockedFetchSearchIndex).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/MN1/i)).toBeInTheDocument());

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelectUid).toHaveBeenCalledWith('mn2');
  });

  it('extracts uid from suttacentral url and handles escape', async () => {
    mockedFetchSearchIndex.mockResolvedValue(index);
    const onSelectUid = vi.fn();

    render(<SearchInput onSelectUid={onSelectUid} />);
    const input = screen.getByLabelText('Search sutta');

    fireEvent.change(input, { target: { value: 'https://suttacentral.net/mn1/en/sujato' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectUid).toHaveBeenCalledWith('mn1');

    fireEvent.change(input, { target: { value: 'mn' } });
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
