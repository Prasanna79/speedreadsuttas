import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Token } from '@palispeedread/shared';

import { splitChunkAtOrp } from './orp-split';
import { RSVPDisplay } from './RSVPDisplay';

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
//
// The algorithm picks the anchor word that minimizes |left.length - right.length|.
// Ties are broken by preferring the earlier (lower) index.
// ---------------------------------------------------------------------------

describe('splitChunkAtOrp', () => {
  // --- Group 1: Single-word ORP splitting (no anchor choice) ---

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

  // --- Group 3: Chunk size 2 (anchor chosen by min-imbalance) ---

  describe('chunk size 2', () => {
    it('"So" + "I" — anchor 0 (imbalance 1 vs 3)', () => {
      // A0: before "S"(1), after " I"(2) → imbalance 1
      // A1: before "So "(3), after ""(0) → imbalance 3
      expect(
        splitChunkAtOrp([tok('So', { index: 0 }), tok('I', { index: 1 })]),
      ).toEqual(['S', 'o', ' I']);
    });

    it('"the" + "Buddha" — anchor 1 better balanced', () => {
      // A0: before "t"(1), after "e Buddha"(8) → imbalance 7
      // A1: before "the Bu"(6), after "dha"(3) → imbalance 3 ← wins
      expect(
        splitChunkAtOrp([tok('the', { index: 0 }), tok('Buddha', { index: 1 })]),
      ).toEqual(['the B', 'u', 'ddha']);
    });

    it('"I" + "know" — anchor 1 better balanced', () => {
      // A0: before ""(0), after " know"(5) → imbalance 5
      // A1: before "I k"(3), after "ow"(2) → imbalance 1 ← wins
      expect(
        splitChunkAtOrp([tok('I', { index: 0 }), tok('know', { index: 1 })]),
      ).toEqual(['I k', 'n', 'ow']);
    });

    it('"concentration" + "is" — anchor 0 (long first word)', () => {
      // A0: before "con"(3), after "entration is"(12) → imbalance 9
      // A1: before "concentration i"(15), after ""(0) → imbalance 15
      expect(
        splitChunkAtOrp([
          tok('concentration', { index: 0 }),
          tok('is', { index: 1 }),
        ]),
      ).toEqual(['concentr', 'a', 'tion is']);
    });

    it('trailing punct on first word — anchor 0', () => {
      // A0: before "h"(1), after "ard. So"(7) → imbalance 6
      // A1: before "heard. S"(8), after ""(0) → imbalance 8
      expect(
        splitChunkAtOrp([
          tok('heard', { index: 0, trailingPunctuation: '.' }),
          tok('So', { index: 1 }),
        ]),
      ).toEqual(['hear', 'd', '. So']);
    });

    it('trailing punct on second word — tie broken by earlier index', () => {
      // A0: before "S"(1), after " I,"(3) → imbalance 2
      // A1: before "So "(3), after ","(1) → imbalance 2
      // Tie → prefer A0
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
    it('"So" + "I" + "have" — anchor on "I" (imbalance 2)', () => {
      // A0: |1-7|=6, A1: |3-5|=2, A2: |6-2|=4 → A1 wins
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1 }),
          tok('have', { index: 2 }),
        ]),
      ).toEqual(['So ', 'I', ' have']);
    });

    it('"I" + "am" + "a" — anchor on "am" (imbalance 1)', () => {
      // A0: |0-5|=5, A1: |3-2|=1, A2: |5-0|=5 → A1 wins
      expect(
        splitChunkAtOrp([
          tok('I', { index: 0 }),
          tok('am', { index: 1 }),
          tok('a', { index: 2 }),
        ]),
      ).toEqual(['I a', 'm', ' a']);
    });

    it('"the" + "great" + "king" — anchor on "great" (imbalance 3)', () => {
      // A0: |1-12|=11, A1: |5-8|=3, A2: |11-2|=9 → A1 wins
      expect(
        splitChunkAtOrp([
          tok('the', { index: 0 }),
          tok('great', { index: 1 }),
          tok('king', { index: 2 }),
        ]),
      ).toEqual(['the gre', 'a', 't king']);
    });

    it('"understanding" + "of" + "the" — anchor on "of" (imbalance 11)', () => {
      // A0: |3-17|=14, A1: |15-4|=11, A2: |18-1|=17 → A1 wins (least bad)
      expect(
        splitChunkAtOrp([
          tok('understanding', { index: 0 }),
          tok('of', { index: 1 }),
          tok('the', { index: 2 }),
        ]),
      ).toEqual(['understand', 'i', 'ng of the']);
    });

    it('punct on anchor word (middle)', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1, trailingPunctuation: ',' }),
          tok('have', { index: 2 }),
        ]),
      ).toEqual(['So I, ', 'h', 'ave']);
    });

    it('punct on last word', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0 }),
          tok('I', { index: 1 }),
          tok('have', { index: 2, trailingPunctuation: '.' }),
        ]),
      ).toEqual(['So I ', 'h', 'ave.']);
    });

    it('punct on first word (before anchor)', () => {
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0, trailingPunctuation: ',' }),
          tok('I', { index: 1 }),
          tok('have', { index: 2 }),
        ]),
      ).toEqual(['So, ', 'I', ' have']);
    });
  });

  // --- Group 5: Chunk size 4 (anchor chosen by min-imbalance) ---

  describe('chunk size 4', () => {
    it('"the" + "quick" + "brown" + "fox" — anchor on "brown"', () => {
      // A0: 16, A1: 8, A2: 4, A3: 16 → A2 wins
      expect(
        splitChunkAtOrp([
          tok('the', { index: 0 }),
          tok('quick', { index: 1 }),
          tok('brown', { index: 2 }),
          tok('fox', { index: 3 }),
        ]),
      ).toEqual(['the quic', 'k', ' brown fox']);
    });

    it('"I" + "am" + "a" + "man" — anchor on "a"', () => {
      // A0: 9, A1: 3, A2: 1, A3: 7 → A2 wins
      expect(
        splitChunkAtOrp([
          tok('I', { index: 0 }),
          tok('am', { index: 1 }),
          tok('a', { index: 2 }),
          tok('man', { index: 3 }),
        ]),
      ).toEqual(['I am ', 'a', ' man']);
    });

    it('"with" + "deep" + "calm" + "mind" — anchor on "calm"', () => {
      // A0: 16, A1: 6, A2: 4, A3: 14 → A2 wins
      expect(
        splitChunkAtOrp([
          tok('with', { index: 0 }),
          tok('deep', { index: 1 }),
          tok('calm', { index: 2 }),
          tok('mind', { index: 3 }),
        ]),
      ).toEqual(['with dee', 'p', ' calm mind']);
    });

    it('Pāli: "Evaṁ" + "me" + "sutaṁ" + "ekaṁ" — anchor on "sutaṁ"', () => {
      // A0: 16, A1: 5, A2: 1, A3: 13 → A2 wins
      expect(
        splitChunkAtOrp([
          tok('Evaṁ', { index: 0 }),
          tok('me', { index: 1 }),
          tok('sutaṁ', { index: 2 }),
          tok('ekaṁ', { index: 3 }),
        ]),
      ).toEqual(['Evaṁ me s', 'u', 'taṁ ekaṁ']);
    });

    it('punct on pre-anchor and post-anchor words', () => {
      // A2 "have" → before "So, I h"(7), after "ve heard."(9) → imbalance 2
      expect(
        splitChunkAtOrp([
          tok('So', { index: 0, trailingPunctuation: ',' }),
          tok('I', { index: 1 }),
          tok('have', { index: 2 }),
          tok('heard', { index: 3, trailingPunctuation: '.' }),
        ]),
      ).toEqual(['So, I ha', 'v', 'e heard.']);
    });

    it('screenshot: "things." + "Listen" + "and" + "apply" — anchor on "Listen"', () => {
      // A0: 19, A1: 3, A2: 9, A3: 17 → A1 wins (imbalance 3)
      expect(
        splitChunkAtOrp([
          tok('things', { index: 0, trailingPunctuation: '.' }),
          tok('Listen', { index: 1 }),
          tok('and', { index: 2 }),
          tok('apply', { index: 3 }),
        ]),
      ).toEqual(['things. List', 'e', 'n and apply']);
    });

    it('screenshot: "Because" + "they" + "haven\'t" + "completely"', () => {
      // A2 "haven\u2019t" → before "Because they ha"(15), after "en\u2019t completely"(15) → imbalance 0!
      expect(
        splitChunkAtOrp([
          tok('Because', { index: 0 }),
          tok('they', { index: 1 }),
          tok("haven\u2019t", { index: 2 }),
          tok('completely', { index: 3 }),
        ]),
      ).toEqual(['Because they ha', 'v', "en\u2019t completely"]);
    });

    it('screenshot: "addressed" + "the" + "mendicants," + "\u201CMendicants!\u201D"', () => {
      // A2 "mendicants" → before "addressed the men"(17), after "icants, \u201CMendicants!\u201D"(21) → imbalance 4
      expect(
        splitChunkAtOrp([
          tok('addressed', { index: 0 }),
          tok('the', { index: 1 }),
          tok('mendicants', { index: 2, trailingPunctuation: ',' }),
          tok('\u201CMendicants!\u201D', { index: 3 }),
        ]),
      ).toEqual(['addressed the mendi', 'c', 'ants, \u201CMendicants!\u201D']);
    });

    it('screenshot: "\u201CTake" + "an" + "unlearned" + "ordinary"', () => {
      // A2 "unlearned" → before "\u201CTake an un"(11), after "earned ordinary"(15) → imbalance 4
      expect(
        splitChunkAtOrp([
          tok('\u201CTake', { index: 0 }),
          tok('an', { index: 1 }),
          tok('unlearned', { index: 2 }),
          tok('ordinary', { index: 3 }),
        ]),
      ).toEqual(['\u201CTake an unle', 'a', 'rned ordinary']);
    });

    it('long first two words + short last two — anchor shifts left', () => {
      // "extraordinary"(13ch,ORP 3) + "circumstances"(13ch,ORP 3) + "of" + "it"
      // A1 "circumstances" → before "extraordinary cir"(17), after "umstances of it"(15) → imbalance 2
      expect(
        splitChunkAtOrp([
          tok('extraordinary', { index: 0 }),
          tok('circumstances', { index: 1 }),
          tok('of', { index: 2 }),
          tok('it', { index: 3 }),
        ]),
      ).toEqual(['extraordinary ci', 'r', 'cumstances of it']);
    });
  });

  // --- Group 6: Pāli diacritics ---

  describe('diacritics', () => {
    it('"Evaṁ" — dotted m', () => {
      expect(splitChunkAtOrp([tok('Evaṁ')])).toEqual(['E', 'v', 'aṁ']);
    });

    it('"Mūlapariyāya" — long Pāli with macrons', () => {
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
      expect(splitChunkAtOrp([tok('Ñāṇa')])).toEqual(['Ñ', 'ā', 'ṇa']);
    });

    it('"saṅkhārā" — underdot in word', () => {
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
      expect(splitChunkAtOrp([tok("'Hello")])).toEqual(["'H", 'e', 'llo']);
    });

    it('"don\'t" — apostrophe does not interfere', () => {
      expect(splitChunkAtOrp([tok("don't")])).toEqual(['d', 'o', "n't"]);
    });

    it('"well-known" — hyphenated word (10 chars)', () => {
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
      ).toEqual(['th', 'e', ' end']);
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

    // Only one orp-char element — anchored on best-balanced word "I"
    expect(screen.getAllByTestId('orp-char')).toHaveLength(1);
    expect(screen.getByTestId('orp-char')).toHaveTextContent('I');
    expect(screen.getByTestId('orp-before')).toHaveTextContent('So');
    expect(screen.getByTestId('orp-after')).toHaveTextContent('have');
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

  it('uses smaller size scale for mono and openDyslexic families', () => {
    const { rerender } = render(
      <RSVPDisplay chunk={[tok('test')]} fontFamily="mono" fontSize="xlarge" />,
    );
    expect(screen.getByTestId('orp-grid')).toHaveClass('text-5xl');
    expect(screen.getByTestId('orp-grid')).not.toHaveClass('text-6xl');

    rerender(<RSVPDisplay chunk={[tok('test')]} fontFamily="openDyslexic" fontSize="large" />);
    expect(screen.getByTestId('orp-grid')).toHaveClass('text-4xl');
    expect(screen.getByTestId('orp-grid')).not.toHaveClass('text-5xl');
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
    const section = container.querySelector('section');
    // Top and bottom triangles + the grid = 3 children
    expect(section?.children.length).toBe(3);
  });
});
