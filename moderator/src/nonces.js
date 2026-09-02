"use strict";

const counters = new Map();

function nextNonce(author) {
  const key = author.toLowerCase();
  const current = counters.get(key) ?? (BigInt(Date.now()) * 1000n);
  const next = current + 1n;
  counters.set(key, next);
  return next;
}

function resetNonces() {
  counters.clear();
}

module.exports = { nextNonce, resetNonces };
