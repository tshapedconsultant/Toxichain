"use strict";

const { createHash } = require("node:crypto");
const { evaluateDeterministic, evaluateToxicity } = require("./pipeline");
const { signModeration } = require("./eip712");
const { nextNonce } = require("./nonces");
const { logDecision } = require("./logger");

function contentHash(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("moderation_timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runPipeline(content, classify, threshold) {
  const deterministic = evaluateDeterministic(content);
  if (deterministic.blocked) {
    return { allowed: false, reason: deterministic.reason, scores: {}, layer: deterministic.layer };
  }
  const toxicity = await evaluateToxicity(content, { classify, threshold });
  if (toxicity.blocked) {
    return { allowed: false, reason: toxicity.reason, scores: toxicity.scores, layer: "toxicity" };
  }
  return { allowed: true, reason: "accept", scores: toxicity.scores, layer: "attestation" };
}

/**
 * Fail-closed moderation. Signs only after both layers pass, inside the timeout.
 */
async function moderate({ content, author, wallet, chainId, verifyingContract, classify, timeoutMs, ttlSeconds, threshold }) {
  const hash = contentHash(content);
  const started = Date.now();

  try {
    const result = await withTimeout(runPipeline(content, classify, threshold), timeoutMs);
    if (!result.allowed) {
      logDecision({
        decision: "reject",
        reason: result.reason,
        contentHash: hash,
        author,
        scores: result.scores,
        latencyMs: Date.now() - started,
      });
      return { allowed: false, reason: result.reason, contentHash: hash };
    }

    const nonce = nextNonce(author);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlSeconds);
    const signature = await signModeration(wallet, {
      content,
      author,
      nonce,
      deadline,
      chainId,
      verifyingContract,
    });

    logDecision({
      decision: "accept",
      reason: "attested",
      contentHash: hash,
      author,
      scores: result.scores,
      latencyMs: Date.now() - started,
    });

    return {
      allowed: true,
      signature,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      contentHash: hash,
    };
  } catch (err) {
    logDecision({
      decision: "reject",
      reason: err.message === "moderation_timeout" ? "timeout" : "service_error",
      contentHash: hash,
      author,
      scores: {},
      latencyMs: Date.now() - started,
    });
    return { allowed: false, reason: "contenido no verificado", contentHash: hash };
  }
}

module.exports = { moderate, contentHash, withTimeout };
