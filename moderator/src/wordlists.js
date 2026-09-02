"use strict";

const SPANISH_PHRASES = [
  "hijo de puta",
  "hijos de puta",
  "hija de puta",
  "concha de tu madre",
  "la concha de tu madre",
  "vete a la mierda",
  "que te jodan",
  "que te follen",
  "me cago en",
  "chinga tu madre",
  "andate a la mierda",
  "que te den",
];

const ENGLISH_PHRASES = [
  "son of a bitch",
  "piece of shit",
  "fuck you",
  "go to hell",
  "screw you",
  "motherfucker",
  "shut the fuck up",
];

const SPANISH_WORDS = [
  "puta",
  "puto",
  "pendejo",
  "pendeja",
  "mierda",
  "cabron",
  "cabrona",
  "gilipollas",
  "imbecil",
  "idiota",
  "estupido",
  "estupida",
  "zorra",
  "perra",
  "maricon",
  "malparido",
  "gonorrea",
  "boludo",
  "tarado",
  "culero",
  "forro",
  "pelotudo",
];

const ENGLISH_WORDS = [
  "bastard",
  "shit",
  "fuck",
  "bitch",
  "asshole",
  "cunt",
  "prick",
  "wanker",
  "twat",
  "bollocks",
  "dick",
  "dipshit",
  "shithead",
  "scumbag",
  "motherfucker",
];

const OBFUSCATION_PATTERNS = [
  /f[^a-z0-9]{0,4}c[^a-z0-9]{0,4}k/i,
  /f[^a-z0-9]{0,4}u[^a-z0-9]{0,4}c[^a-z0-9]{0,4}k/i,
  /s[^a-z0-9]{0,4}h[^a-z0-9]{0,4}i[^a-z0-9]{0,4}t/i,
  /b[^a-z0-9]{0,4}i[^a-z0-9]{0,4}t[^a-z0-9]{0,4}c[^a-z0-9]{0,4}h/i,
  /a[^a-z0-9]{0,4}s[^a-z0-9]{0,4}s[^a-z0-9]{0,4}h[^a-z0-9]{0,4}o[^a-z0-9]{0,4}l[^a-z0-9]{0,4}e/i,
  /m[^a-z0-9]{0,4}o[^a-z0-9]{0,4}t[^a-z0-9]{0,4}h[^a-z0-9]{0,4}e[^a-z0-9]{0,4}r[^a-z0-9]{0,4}f/i,
  /p[^a-z0-9]{0,4}u[^a-z0-9]{0,4}t[^a-z0-9]{0,4}a/i,
  /c[^a-z0-9]{0,4}a[^a-z0-9]{0,4}b[^a-z0-9]{0,4}r[^a-z0-9]{0,4}o[^a-z0-9]{0,4}n/i,
  /m[^a-z0-9]{0,4}a[^a-z0-9]{0,4}r[^a-z0-9]{0,4}i[^a-z0-9]{0,4}c[^a-z0-9]{0,4}o[^a-z0-9]{0,4}n/i,
];

module.exports = {
  SPANISH_PHRASES,
  ENGLISH_PHRASES,
  SPANISH_WORDS,
  ENGLISH_WORDS,
  OBFUSCATION_PATTERNS,
};
