import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Token } from '@palispeedread/shared';

import { RSVPDisplay, splitChunkAtOrp } from './RSVPDisplay';

/** Helper to build a token with sensible defaults. */
function tok(
  word: string,
  overrides: Partial<Token> = {},
): Token {
  return {
    word,
    index: 0,
    segmentId: 'mn1:1.1',
    isParagraphStart: false,
    trailingPunctuation: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// splitChunkAtOrp — pure function unit tests
// ---------------------------------------------------------------------------

describe('splitChunkAtOrp', () => {
  // --- Group 1: Single-word ORP splitting ---

  describe('single-word splits', () => {
    it('1-char word "I" → ORP index 0', () => {
      expect(splitChunkAtOrp([tok('I')])).toEqual(['', 'I', '']);
    });

    it('2-char word "So" → ORP index 1', () => {
      expect(splitChunkAtOrp([tok('So')])).toEqual(['S', 'o', '']);
    });

    it('3-char word "the" → ORP index 1', () => {
      expect(splitChunkAtOrp([tok('the')])).toEqual(['t', 'h', 'e']);
    });

    it('5-char word "heard" → ORP index 1', () => {
      expect(splitChunkAtOrp([tok('heard')])).toEqual(['h', 'e', 'ard']);
    });

    it('6-char word "Buddho" → ORP index 2', () => {
      expect(splitChunkAtOrp([tok('Buddho')])).toEqual(['Bu', 'd', 'dho']);
    });

    it('9-char word "wonderful" → ORP index 2', () => {
      expect(splitChunkAtOrp([tok('wonderful')])).toEqual(['wo', 'n', 'derful']);
    });

    it('11-char word "information" → ORP index 3', () => {
      expect(splitChunkAtOrp([tok('information')])).toEqual(['inf', 'o', 'rmation']);
    });

    it('16-char word "responsibilities" → ORP index 4', () => {
      expect(splitChunkAtOrp([tok('responsibilities')])).toEqual([
        'resp',
        'o',
        'nsibilities',
      ]);
    });
  });

  // --- Group 2: Trailing punctuation ---

  describe('trailing punctuation', () => {
    it('period after "heard"', () => {
      expect(splitChunkAtOrp([tok('heard', { trailingPunctuation: '.' })])).toEqual([
        'h',
        'e',
        'ard.',
      ]);
    });

    it('comma after "So" — punct appended when ORP is last char', () => {
      expect(splitChunkAtOrp([tok('So', { trailingPunctuation: ',' })])).toEqual([
        'S',
        'o',
        ',',
      ]);
    });

    it('question mark after single char "I"', () => {
      expect(splitChunkAtOrp([tok('I', { trailingPunctuation: '?' })])).toEqual([
        '',
        'I',
        '?',
      ]);
    });

    it('ellipsis after "word"', () => {
      expect(splitChunkAtOrp([tok('word', { trailingPunctuation: '…' })])).toEqual([
        'w',
        'o',
        'rd…',
      ]);
    });

    it('em-dash after Pāli word "sutaṁ"', () => {
      expect(splitChunkAtOrp([tok('sutaṁ', { trailingPunctuation: '—' })])).toEqual([
        's',
        'u',
        'taṁ—',
      ]);
    });
  });

  // --- Group 3: Chunk size 2 ---

  describe('chunk size 2', () => {
    it('"So" + "I" — short + short', () => {
      expect(
        splitChunkAtOrp([tok('So', { index: 0 }), tok('I', { index: 1 })]),
      ).toEqual(['S', 'o', ' I']);
    });

    it('"the" + "Buddha" — short + long', () => {
      expect(
        splitChunkAtOrp([tok('the', { index: 0 }), tok('Buddha', { index: 1 })]),
      ).toEqual(['t', 'h', 'e Buddha']);
    });

    it('"I" + "know" — 1-char anchor', () => {
      expect(
        splitChunkAtOrp([tok('I', { index: 0 }), tok('know', { index: 1 })]),
      ).toEqual(['', 'I', ' know']);
    });

    it('"concentration" + "is" — long anchor + short', () => {
      expect(
        splitChunkAtOrp([
          tok('concentration', { index: 0 }),
          tok('is', { index: 1 }),
        ]),
      ).toEqual(['con', 'c', 'entration is']);
    });

    it('trailing punct on first word carries into after column', () => {
      expect(
        splitChunkAtOrp([
          tok('heard', { index: 0, trailingPunctuation: '.' }),
          tok('So', { index: 1 }),
        ]),
      ).toEqual(['h', 'e', 'ard. So']);
    });

    it('trailing punct on second word appears at end', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1, trailingPunctuation: ',' }),
        ]),
      ).toEqual(['S', 'o', ' I,']);
    });
  });

  // --- Group 4: Chunk size 3 ---

  describe('chunk size 3', () => {
    it('"So" + "I" + "have" — mixed lengths', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1 }),
          tok('have', { index: 2 }),
        ]),
      ).toEqual(['S', 'o', ' I have']);
    });

    it('"I" + "am" + "a" — all short, lopsided right', () => {
      expect(
        splitChunkAtOrp([
          tok('I', { index: 0 }),
          tok('am', { index: 1 }),
          tok('a', { index: 2 }),
        ]),
      ).toEqual(['', 'I', ' am a']);
    });

    it('"the" + "great" + "king" — moderate lengths', () => {
      expect(
        splitChunkAtOrp([
          tok('the', { index: 0 }),
          tok('great', { index: 1 }),
          tok('king', { index: 2 }),
        ]),
      ).toEqual(['t', 'h', 'e great king']);
    });

    it('"understanding" + "of" + "the" — long anchor', () => {
      expect(
        splitChunkAtOrp([
          tok('understanding', { index: 0 }),
          tok('of', { index: 1 }),
          tok('the', { index: 2 }),
        ]),
      ).toEqual(['und', 'e', 'rstanding of the']);
    });

    it('punct on middle word', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1, trailingPunctuation: ',' }),
          tok('have', { index: 2 }),
        ]),
      ).toEqual(['S', 'o', ' I, have']);
    });

    it('punct on last word', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1 }),
          tok('have', { index: 2, trailingPunctuation: '.' }),
        ]),
      ).toEqual(['S', 'o', ' I have.']);
    });
  });

  // --- Group 5: Chunk size 4 ---

  describe('chunk size 4', () => {
    it('"the" + "quick" + "brown" + "fox"', () => {
      expect(
        splitChunkAtOrp([
          tok('the', { index: 0 }),
          tok('quick', { index: 1 }),
          tok('brown', { index: 2 }),
          tok('fox', { index: 3 }),
        ]),
      ).toEqual(['t', 'h', 'e quick brown fox']);
    });

    it('"I" + "am" + "a" + "man" — max lopsided', () => {
      expect(
        splitChunkAtOrp([
          tok('I', { index: 0 }),
          tok('am', { index: 1 }),
          tok('a', { index: 2 }),
          tok('man', { index: 3 }),
        ]),
      ).toEqual(['', 'I', ' am a man']);
    });

    it('"with" + "deep" + "calm" + "mind"', () => {
      expect(
        splitChunkAtOrp([
          tok('with', { index: 0 }),
          tok('deep', { index: 1 }),
          tok('calm', { index: 2 }),
          tok('mind', { index: 3 }),
        ]),
      ).toEqual(['w', 'i', 'th deep calm mind']);
    });

    it('Pāli: "Evaṁ" + "me" + "sutaṁ" + "ekaṁ"', () => {
      expect(
        splitChunkAtOrp([
          tok('Evaṁ', { index: 0 }),
          tok('me', { index: 1 }),
          tok('sutaṁ', { index: 2 }),
          tok('ekaṁ', { index: 3 }),
        ]),
      ).toEqual(['E', 'v', 'aṁ me sutaṁ ekaṁ']);
    });

    it('punct on multiple words', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0, trailingPunctuation: ',' }),
          tok('I', { index: 1 }),
          tok('have', { index: 2 }),
          tok('heard', { index: 3, trailingPunctuation: '.' }),
        ]),
      ).toEqual(['S', 'o', ', I have heard.']);
    });
  });

  // --- Group 6: Pāli diacritics ---

  describe('diacritics', () => {
    it('"Evaṁ" — dotted m', () => {
      expect(splitChunkAtOrp([tok('Evaṁ')])).toEqual(['E', 'v', 'aṁ']);
    });

    it('"Mūlapariyāya" — long Pāli with macrons (13 chars)', () => {
      // M-ū-l-a-p-a-r-i-y-ā-y-a (13 chars) → ORP index 3 → "a"
      const chars = [...'Mūlapariyāya'];
      expect(chars.length).toBe(12);
      // 12 chars → ORP index 3
      expect(splitChunkAtOrp([tok('Mūlapariyāya')])).toEqual([
        'Mūl',
        'a',
        'pariyāya',
      ]);
    });

    it('"Ñāṇa" — ORP is a diacritic char', () => {
      // Ñ-ā-ṇ-a (4 chars) → ORP index 1 → "ā"
      expect(splitChunkAtOrp([tok('Ñāṇa')])).toEqual(['Ñ', 'ā', 'ṇa']);
    });

    it('"saṅkhārā" — underdot in word', () => {
      // s-a-ṅ-k-h-ā-r-ā (8 chars) → ORP index 2 → "ṅ"
      expect(splitChunkAtOrp([tok('saṅkhārā')])).toEqual(['sa', 'ṅ', 'khārā']);
    });
  });

  // --- Group 7: Edge cases ---

  describe('edge cases', () => {
    it('empty chunk → all empty strings', () => {
      expect(splitChunkAtOrp([])).toEqual(['', '', '']);
    });

    it('empty word string → graceful handling', () => {
      expect(splitChunkAtOrp([tok('')])).toEqual(['', '', '']);
    });

    it('lone punctuation as word "—" → ORP is the punctuation', () => {
      expect(splitChunkAtOrp([tok('—')])).toEqual(['', '—', '']);
    });

    it('leading quote in word "\'Hello" → quote shifts index', () => {
      // '-H-e-l-l-o (6 chars) → ORP index 2 → "e"
      expect(splitChunkAtOrp([tok("'Hello")])).toEqual(["'H", 'e', 'llo']);
    });

    it('"don\'t" — apostrophe does not interfere', () => {
      // d-o-n-'-t (5 chars) → ORP index 1 → "o"
      expect(splitChunkAtOrp([tok("don't")])).toEqual(['d', 'o', "n't"]);
    });

    it('"well-known" — hyphenated word (10 chars)', () => {
      // w-e-l-l---k-n-o-w-n (10 chars) → ORP index 3 → "l"
      expect(splitChunkAtOrp([tok('well-known')])).toEqual(['wel', 'l', '-known']);
    });

    it('word with trailing multi-char punct', () => {
      expect(splitChunkAtOrp([tok('word', { trailingPunctuation: '."' })])).toEqual([
        'w',
        'o',
        'rd."',
      ]);
    });

    it('empty trailing punct on all words in chunk', () => {
      expect(
        splitChunkAtOrp([
          tok('the', { index: 0 }),
          tok('end', { index: 1 }),
        ]),
      ).toEqual(['t', 'h', 'e end']);
    });
  });
});

// ---------------------------------------------------------------------------
// RSVPDisplay — component rendering tests
// ---------------------------------------------------------------------------

describe('RSVPDisplay', () => {
  it('renders 3-column grid with correct ORP highlight', () => {
    render(
      <RSVPDisplay
        chunk={[tok('Buddho')]}
        fontFamily="serif"
        fontSize="normal"
      />,
    );

    expect(screen.getByTestId('orp-grid')).toBeInTheDocument();
    expect(screen.getByTestId('orp-before')).toHaveTextContent('Bu');
    expect(screen.getByTestId('orp-char')).toHaveTextContent('d');
    expect(screen.getByTestId('orp-after')).toHaveTextContent('dho');
  });

  it('only highlights ONE ORP char in multi-word chunk', () => {
    render(
      <RSVPDisplay
        chunk={[tok('So', { index: 0 }), tok('I', { index: 1 }), tok('have', { index: 2 })]}
        fontFamily="serif"
        fontSize="normal"
      />,
    );

    // Only one orp-char element in the DOM
    expect(screen.getAllByTestId('orp-char')).toHaveLength(1);
    expect(screen.getByTestId('orp-char')).toHaveTextContent('o');
    expect(screen.getByTestId('orp-after')).toHaveTextContent('I have');
  });

  it('shows empty state when chunk is null', () => {
    render(<RSVPDisplay chunk={null} fontFamily="serif" fontSize="large" />);
    expect(screen.getByText('No text loaded')).toBeInTheDocument();
  });

  it('shows empty state when chunk is empty array', () => {
    render(<RSVPDisplay chunk={[]} fontFamily="serif" fontSize="large" />);
    expect(screen.getByText('No text loaded')).toBeInTheDocument();
  });

  it('applies font size class', () => {
    render(
      <RSVPDisplay chunk={[tok('test')]} fontFamily="serif" fontSize="xlarge" />,
    );
    expect(screen.getByTestId('orp-grid')).toHaveClass('text-6xl');
  });

  it('applies font family class', () => {
    render(
      <RSVPDisplay chunk={[tok('test')]} fontFamily="mono" fontSize="normal" />,
    );
    expect(screen.getByTestId('orp-grid')).toHaveClass('reader-font-mono');
  });

  it('sets aria-label with full chunk text', () => {
    render(
      <RSVPDisplay
        chunk={[
          tok('So', { index: 0, trailingPunctuation: ',' }),
          tok('I', { index: 1 }),
        ]}
        fontFamily="serif"
        fontSize="normal"
      />,
    );
    expect(screen.getByLabelText('So, I')).toBeInTheDocument();
  });

  it('renders triangle markers', () => {
    const { container } = render(
      <RSVPDisplay chunk={[tok('test')]} fontFamily="serif" fontSize="normal" />,
    );
    // Both triangles should exist as children of the section
    const section = container.querySelector('section');
    // Top and bottom triangles + the grid = 3 children
    expect(section?.children.length).toBe(3);
  });
});
