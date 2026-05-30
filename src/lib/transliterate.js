/**
 * Tamil phonetic transliteration engine.
 *
 * Case-sensitive uppercase keys for retroflex / Grantha sounds:
 *   N → ண   T → ட   L → ள   R → ற   S → ஸ (Grantha sa)
 *
 * Case-insensitive patterns (multi-char matched before single-char):
 *   aa      → ஆ/ா     ee / ii → ஈ/ீ     oo / uu → ஊ/ூ
 *   ae      → ஏ/ே     ai      → ஐ/ை     au      → ஔ/ௌ
 *   oa      → ஓ/ோ     ng      → ங       ny / nj → ஞ
 *   zh      → ழ       sh      → ஷ       th      → த
 *   rr      → ற       ll      → ள       nn      → ண
 *   tt      → ட       ch      → ச       ksh     → க்ஷ (composed)
 *
 * Vada Mozhi (Grantha) letters:
 *   j  → ஜ    sh → ஷ    S  → ஸ    h  → ஹ
 *
 * Examples:
 *   PoosaNi    → பூசணி       (N = ண)
 *   thakkaLi   → தக்காளி     (L = ள)
 *   vengaayam  → வெங்காயம்
 *   Sree       → ஸ்ரீ         (S = ஸ)
 *   jangal     → ஜங்கல்
 *   shakthi    → ஷக்தி
 */

const VIRAMA = '்'  // ்

// Consonant rules: [pattern, tamilBase, caseSensitive]
// Sorted: uppercase-specials first, then longest patterns, then single-char
const CONSONANTS = [
  // ── Uppercase case-sensitive specials ──────────────────────
  ['N',   'ண',  true],   // retroflex n
  ['T',   'ட',  true],   // retroflex t
  ['L',   'ள',  true],   // retroflex l
  ['R',   'ற',  true],   // Tamil ற (different from ர)
  ['S',   'ஸ',  true],   // Grantha sa (வட மொழி ஸ)

  // ── Multi-char case-insensitive (longest first) ─────────────
  ['ksh', 'க்ஷ', false], // Sanskrit ksha cluster — pre-composed
  ['ng',  'ங',  false],
  ['ny',  'ஞ',  false],
  ['nj',  'ஞ',  false],
  ['zh',  'ழ',  false],
  ['sh',  'ஷ',  false],  // Grantha sha
  ['ch',  'ச',  false],
  ['th',  'த',  false],
  ['rr',  'ற',  false],
  ['ll',  'ள',  false],
  ['nn',  'ண',  false],
  ['tt',  'ட',  false],
  ['nh',  'ந',  false],

  // ── Single-char case-insensitive ────────────────────────────
  ['k',   'க',  false],
  ['g',   'க',  false],
  ['c',   'ச',  false],
  ['j',   'ஜ',  false],  // Grantha ja
  ['s',   'ச',  false],
  ['t',   'த',  false],
  ['d',   'த',  false],
  ['n',   'ன',  false],
  ['p',   'ப',  false],
  ['b',   'ப',  false],
  ['m',   'ம',  false],
  ['y',   'ய',  false],
  ['r',   'ர',  false],
  ['l',   'ல',  false],
  ['v',   'வ',  false],
  ['w',   'வ',  false],
  ['z',   'ழ',  false],
  ['h',   'ஹ',  false],  // Grantha ha
  ['f',   'ஃப', false],
]

// Vowel rules: [pattern, standalone, mark, caseSensitive]
// standalone = Tamil letter used when vowel appears at word-start / after another vowel
// mark = Tamil vowel sign attached to a preceding consonant
//        '' means inherent 'a' — just the base consonant, no sign needed
const VOWELS = [
  // Multi-char (case-insensitive) — longest first
  ['aa',  'ஆ',  'ா',  false],
  ['ee',  'ஈ',  'ீ',  false],
  ['ii',  'ஈ',  'ீ',  false],
  ['oo',  'ஊ',  'ூ',  false],
  ['uu',  'ஊ',  'ூ',  false],
  ['ae',  'ஏ',  'ே',  false],
  ['ai',  'ஐ',  'ை',  false],
  ['au',  'ஔ',  'ௌ',  false],
  ['oa',  'ஓ',  'ோ',  false],
  // Single-char (case-insensitive)
  ['a',   'அ',  '',   false],  // inherent — no explicit sign
  ['i',   'இ',  'ி',  false],
  ['u',   'உ',  'ு',  false],
  ['e',   'எ',  'ெ',  false],
  ['o',   'ஒ',  'ொ',  false],
]

/** Tokenise an English phonetic string into consonant/vowel/other tokens. */
function tokenise(input) {
  const tokens = []
  let i = 0

  while (i < input.length) {
    let matched = false

    // Try consonants first (upstream order is already priority-sorted)
    for (const [pat, tamil, cs] of CONSONANTS) {
      const slice = input.substr(i, pat.length)
      const eq = cs ? (slice === pat) : (slice.toLowerCase() === pat)
      if (eq) {
        tokens.push({ type: 'C', tamil })
        i += pat.length
        matched = true
        break
      }
    }

    if (!matched) {
      // Try vowels
      for (const [pat, standalone, mark] of VOWELS) {
        const slice = input.substr(i, pat.length).toLowerCase()
        if (slice === pat) {
          tokens.push({ type: 'V', standalone, mark })
          i += pat.length
          matched = true
          break
        }
      }
    }

    if (!matched) {
      // Pass through (space, digits, punctuation, already-Tamil chars …)
      tokens.push({ type: 'O', ch: input[i] })
      i++
    }
  }

  return tokens
}

/**
 * Convert tokenised stream → Tamil Unicode string.
 *
 * Rules:
 *  C  followed by V  →  consonant-base + vowel-mark  (inherent 'a' = no mark)
 *  C  not followed by V  →  consonant-base + virama (்)
 *  V  not preceded by C  →  standalone vowel letter
 *  O  →  pass through as-is
 */
function renderTokens(tokens) {
  let out = ''
  let j = 0

  while (j < tokens.length) {
    const tok = tokens[j]

    if (tok.type === 'C') {
      const next = tokens[j + 1]
      if (next && next.type === 'V') {
        // Consonant + vowel
        out += tok.tamil + next.mark   // mark is '' for inherent 'a' ← just the base char
        j += 2
      } else {
        // Consonant with no following vowel → add virama
        out += tok.tamil + VIRAMA
        j++
      }
    } else if (tok.type === 'V') {
      // Standalone vowel (beginning of word or after another vowel/other)
      out += tok.standalone
      j++
    } else {
      out += tok.ch
      j++
    }
  }

  return out
}

/** Public API: transliterate an English phonetic string to Tamil Unicode. */
export function transliterate(input) {
  if (!input) return ''
  return renderTokens(tokenise(input))
}

/**
 * Remove the last logical Tamil character from a Unicode string.
 * Tamil combining marks (vowel signs U+0BBE–U+0BCC, virama U+0BCD)
 * attach to the preceding base consonant — removing "one char" means
 * removing the mark AND the preceding base consonant.
 */
export function removeLastTamilChar(str) {
  if (!str) return ''
  const cp = str.codePointAt(str.length - 1)
  // Vowel signs: 0BBE–0BCC; virama: 0BCD — these are combining
  if ((cp >= 0x0BBE && cp <= 0x0BCC) || cp === 0x0BCD) {
    return str.slice(0, -2)   // remove combining mark + base consonant
  }
  return str.slice(0, -1)
}
