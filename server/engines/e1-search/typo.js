/**
 * E1 · typo-tolerant search (DAA). Not part of authorization, but owned by E1.
 *
 * vocabulary: every word in APPROVED product names/descriptions, rebuilt at most once a minute.
 * candidates: trigram index (word -> set of 3-letter chunks) narrows the vocabulary to words that share chunks.
 * distance:   Damerau-Levenshtein (insert, delete, substitute, swap neighbours), O(m·n) per pair.
 * A word is corrected only if the best match is within 1 edit (words ≤ 5 letters) or 2 edits (longer words).
 */
const data = require('../e3-data');

let vocab = new Set(); let grams = new Map(); let builtAt = 0;

const trigrams = (w) => { const s = `  ${w} `; const out = new Set(); for (let i = 0; i < s.length - 2; i += 1) out.add(s.slice(i, i + 3)); return out; };

function dl(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

async function ensureVocab() {
  if (Date.now() - builtAt < 60000 && vocab.size) return;
  const rows = await data.catalog.storefront({ limit: 1000 });
  vocab = new Set(rows.flatMap((p) => `${p.name} ${p.description} ${p.categoryName}`.toLowerCase().match(/[a-z]{3,}/g) || []));
  grams = new Map();
  vocab.forEach((w) => trigrams(w).forEach((g) => { if (!grams.has(g)) grams.set(g, new Set()); grams.get(g).add(w); }));
  builtAt = Date.now();
}

/** Returns the corrected query, or null if every word is already known or nothing is close enough. */
async function correct(query) {
  await ensureVocab();
  const words = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  let changed = false;
  const fixed = words.map((w) => {
    if (w.length < 3 || vocab.has(w)) return w;
    const shared = new Map();
    trigrams(w).forEach((g) => (grams.get(g) || []).forEach((c) => shared.set(c, (shared.get(c) || 0) + 1)));
    const max = w.length <= 5 ? 1 : 2;
    let best = null; let bestD = Infinity;
    [...shared.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([c]) => {
      const dist = dl(w, c);
      if (dist < bestD) { best = c; bestD = dist; }
    });
    if (best && bestD <= max) { changed = true; return best; }
    return w;
  });
  return changed ? fixed.join(' ') : null;
}

module.exports = { correct, dl };
