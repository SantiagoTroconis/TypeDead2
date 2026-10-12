// Fuzzy matching between what the speech recognizer heard and the words on screen.
// Recognizers rarely return exactly what was said ("but" for "bat", "cook he"
// for "cookie"), so a spoken span is scored both by spelling and by a coarse phonetic key, and
// accepted above a similarity threshold. Words that could be mistaken for each
// other are never on screen together (see confusable), which is what makes
// this leniency safe.
const WordMatcher = (() => {
  const MAX_SPAN = 4; // a single target may be heard as up to 4 recognizer tokens

  // Fillers and particles that never count as an attempt on their own.
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'of', 'to', 'is', 'it', 'its', 'i', 'im', 'in', 'on', 'so',
    'uh', 'um', 'umm', 'uhm', 'ah', 'oh', 'eh', 'er', 'hmm', 'mm', 'huh', 'okay', 'ok', 'yeah'
  ]);

  // Minimum similarity to accept, by target length. Interim (still changing)
  // transcripts and the recognizer's backup guesses must clear a stricter bar.
  function threshold(len, isFinal, isBackup) {
    const base = len <= 4 ? 0.6 : len <= 7 ? 0.55 : 0.5;
    return base + (isFinal ? 0 : 0.15) + (isBackup ? 0.1 : 0);
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z\s]/g, '')   // "jack-o'-lantern" -> "jackolantern"
      .trim();
  }

  function tokenize(text) {
    const n = normalize(text);
    return n ? n.split(/\s+/) : [];
  }

  function compact(text) {
    return normalize(text).replace(/\s/g, '');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Coarse phonetic skeleton: English spellings that sound alike — or that
  // recognizers commonly swap — collapse to the same key. Uppercase letters are
  // internal placeholders (input is lowercase a-z only).
  function soundKey(word) {
    let w = String(word || '').replace(/[^a-z]/g, '');
    if (!w) return '';
    w = w
      .replace(/^(kn|gn|pn|wr|ps)/, m => m[1])
      .replace(/^h(?=[aeiou])/, '')              // recognizers drop it: "happily" ~ "apple"
      .replace(/^wh/, 'w').replace(/^gh/, 'g').replace(/^x/, 's')
      .replace(/ght/g, 'T').replace(/gh/g, '')
      .replace(/ph/g, 'F')
      .replace(/t?ch/g, 'C').replace(/sh/g, 'X')
      .replace(/ck|q/g, 'K')
      .replace(/c(?=[eiy])/g, 'S').replace(/c/g, 'K')
      .replace(/x/g, 'KS')
      .replace(/dg(?=[eiy])/g, 'J')
      .replace(/th/g, 'T')
      .replace(/[dt]/g, 'T')                     // d ~ t ("bread" heard as "bret")
      .replace(/k/g, 'K')
      .replace(/[sz]/g, 'S')                     // s ~ z (plurals, "sneeze")
      .replace(/f/g, 'F')
      .replace(/j/g, 'J');
    // Initial vowel collapses to one placeholder; later vowels (and h/w/y) drop.
    const head = /^[aeiou]/.test(w) ? 'A' : w[0];
    const key = head + w.slice(1).replace(/[aeiouhwy]/g, '');
    return key.replace(/(.)\1+/g, '$1');
  }

  /** Similarity in [0, 1] between two compact (space-free) words. */
  function similarity(heard, target) {
    if (!heard || !target) return 0;
    if (heard === target) return 1;
    const letters = 1 - levenshtein(heard, target) / Math.max(heard.length, target.length);
    const kh = soundKey(heard), kt = soundKey(target);
    let sounds = 0;
    if (kh.length >= 2 && kt.length >= 2) {
      sounds = 1 - levenshtein(kh, kt) / Math.max(kh.length, kt.length);
    } else if (kh === kt) {
      sounds = 0.8; // one-consonant keys: equal, but weak evidence on their own
    }
    // A wildly different length means a different word, even if consonants line up.
    const lengthRatio = Math.min(heard.length, target.length) / Math.max(heard.length, target.length);
    const score = Math.max(letters, sounds * 0.95 * (0.5 + 0.5 * lengthRatio));
    // Recognizers almost always get the opening sound right; a different one
    // means a different word ("bread" vs "party", "sand" vs "island").
    return kh[0] === kt[0] ? score : score * 0.8;
  }

  // Strict mode: the recognizer must have written the word itself, so a badly
  // pronounced word (heard as something else) doesn't count. Only formatting
  // differences ("choco late", "Pizza") and a trailing plural "s" are forgiven.
  function strictScore(heard, target) {
    if (heard === target) return 1;
    if (heard === target + 's' || heard + 's' === target) return 0.9;
    return 0;
  }

  /**
   * Finds the earliest, best match for any candidate inside tokens[from..].
   * candidates: [{ target }] where target is a compact (space-free) word.
   * isFinal: the transcript won't change any more (interim needs a stricter bar).
   * isBackup: tokens come from one of the recognizer's lower-ranked guesses.
   * lenient: accept similar-sounding words instead of only the exact word.
   * Returns { candidate, start, end, score } or null.
   */
  function findBest(tokens, from, candidates, { isFinal = true, isBackup = false, lenient = false } = {}) {
    for (let i = from; i < tokens.length; i++) {
      let best = null;
      let span = '';
      for (let j = i; j < Math.min(tokens.length, i + MAX_SPAN); j++) {
        span += tokens[j];
        for (const c of candidates) {
          // Joined spans only make sense while they stay near the target length.
          if (j > i && span.length > c.target.length + 3) continue;
          // Spans may not start with a filler ("uh bottle" must not become "uhbottle"),
          // unless the filler is literally the target.
          if (STOP_WORDS.has(tokens[i]) && span !== c.target) continue;
          const s = lenient ? similarity(span, c.target) : strictScore(span, c.target);
          const min = lenient ? threshold(c.target.length, isFinal, isBackup) : 0.9;
          if (s >= min && (!best || s > best.score)) {
            best = { candidate: c, start: i, end: j + 1, score: s };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  // True when two on-screen words could be mistaken for each other by voice.
  function confusable(a, b) {
    a = compact(a);
    b = compact(b);
    if (!a || !b) return false;
    if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
    return similarity(a, b) >= 0.5;
  }

  return { normalize, tokenize, compact, findBest, confusable, similarity, soundKey };
})();
