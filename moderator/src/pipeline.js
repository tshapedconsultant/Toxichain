"use strict";

const {
  SPANISH_PHRASES,
  ENGLISH_PHRASES,
  SPANISH_WORDS,
  ENGLISH_WORDS,
  OBFUSCATION_PATTERNS,
} = require("./wordlists");

const HOMOGLYPHS = new Map([
  ["а", "a"],
  ["е", "e"],
  ["о", "o"],
  ["р", "p"],
  ["с", "c"],
  ["у", "y"],
  ["х", "x"],
  ["і", "i"],
  ["ї", "i"],
  ["ј", "j"],
  ["ԁ", "d"],
  ["α", "a"],
  ["ο", "o"],
  ["ρ", "p"],
  ["τ", "t"],
  ["υ", "y"],
  ["χ", "x"],
  ["ι", "i"],
  ["κ", "k"],
  ["ν", "n"],
  ["ß", "ss"],
  ["æ", "ae"],
]);

const LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapHomoglyphs(text) {
  let out = "";
  for (const ch of text) {
    out += HOMOGLYPHS.get(ch) || ch;
  }
  return out;
}

/**
 * Deterministic first stage: NFKC, homoglyph fold, accent strip, leetspeak,
 * separator collapse. Returns both a spaced form (word boundaries) and a
 * compact form (letter-spacing / punctuation attacks).
 */
function normalize(text) {
  const nfkc = text.normalize("NFKC").toLowerCase();
  const folded = mapHomoglyphs(nfkc)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n");
  const leet = folded.replace(/[0134578@$!]/g, (c) => LEET[c] || c);
  const spaced = leet
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/([a-z0-9])\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
  const compact = spaced.replace(/\s+/g, "");
  return { rawLower: nfkc, spaced, compact };
}

function evaluateDeterministic(content) {
  if (typeof content !== "string" || content.trim().length === 0) {
    return { blocked: true, reason: "empty", layer: "deterministic" };
  }

  const { rawLower, spaced, compact } = normalize(content);

  for (const rx of OBFUSCATION_PATTERNS) {
    if (rx.test(rawLower) || rx.test(spaced)) {
      return { blocked: true, reason: "obfuscation_pattern", layer: "deterministic" };
    }
  }

  const phrases = [...SPANISH_PHRASES, ...ENGLISH_PHRASES].map((p) => normalize(p).spaced);
  for (const phrase of phrases) {
    if (phrase && (spaced.includes(phrase) || compact.includes(phrase.replace(/\s+/g, "")))) {
      return { blocked: true, reason: "phrase_list", layer: "deterministic" };
    }
  }

  const words = [...SPANISH_WORDS, ...ENGLISH_WORDS].map((w) => normalize(w).compact);
  for (const word of words) {
    if (!word) continue;
    const boundary = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    if (boundary.test(spaced)) {
      return { blocked: true, reason: "word_list", layer: "deterministic" };
    }
    // Compact match only for tokens long enough to avoid "class"/"assume" FPs.
    if (word.length >= 4 && compact.includes(word)) {
      return { blocked: true, reason: "word_list_compact", layer: "deterministic" };
    }
  }

  return { blocked: false, reason: "pass", layer: "deterministic", normalized: spaced };
}

/**
 * @param {string} content
 * @param {{ classify?: Function, threshold?: number }} [opts]
 */
async function evaluateToxicity(content, opts = {}) {
  const classify = opts.classify;
  if (!classify) {
    return { blocked: false, reason: "toxicity_skipped", scores: {} };
  }
  const predictions = await classify(content);
  const scores = {};
  let blocked = false;
  for (const pred of predictions) {
    const match = pred.results?.[0]?.match === true;
    const prob = pred.results?.[0]?.probabilities?.[1] ?? 0;
    scores[pred.label] = { match, probability: prob };
    if (match) blocked = true;
  }
  return {
    blocked,
    reason: blocked ? "toxicity_model" : "pass",
    scores,
  };
}

module.exports = {
  normalize,
  evaluateDeterministic,
  evaluateToxicity,
};
