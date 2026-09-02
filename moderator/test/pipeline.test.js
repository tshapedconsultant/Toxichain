"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");
const { evaluateDeterministic } = require("../src/pipeline");
const { moderate, contentHash } = require("../src/moderate");
const { createAttesterWallet, domain, EIP712_TYPES } = require("../src/eip712");
const { resetNonces } = require("../src/nonces");

const MALICIOUS = [
  "fuck you",
  "f u c k",
  "f.u.c.k",
  "fück",
  "fuсk", // Cyrillic 'с' (U+0441)
  "f*ck this",
  "motherfucker",
  "m0th3rfuck3r",
  "shit",
  "sh1t",
  "puta",
  "p u t a",
  "maricón",
  "hijo de puta",
  "cabrón",
  "a$$hole",
  "gilipollas",
];

const BENIGN = [
  "Hello world",
  "Good morning everyone",
  "Let's discuss the proposal",
  "The weather is nice today",
  "Thank you for your help",
  "I agree with this approach",
  "Please review my code",
  "Looking forward to the meeting",
  "Great work on the presentation",
  "Can we schedule a call?",
  "The contract looks correct",
  "Shipping update: package delivered",
  "Happy birthday",
  "See you tomorrow",
  "This is a constructive comment",
  "Class starts at nine",
  "Please assume good faith",
];

describe("deterministic moderation pipeline", () => {
  it("has at least 15 malicious and 15 benign fixtures", () => {
    assert.ok(MALICIOUS.length >= 15, `expected >=15 malicious, got ${MALICIOUS.length}`);
    assert.ok(BENIGN.length >= 15, `expected >=15 benign, got ${BENIGN.length}`);
  });

  it("blocks leetspeak, letter-spacing, and homoglyph payloads (FN rate)", () => {
    let falseNegatives = 0;
    const misses = [];
    for (const payload of MALICIOUS) {
      const result = evaluateDeterministic(payload);
      if (!result.blocked) {
        falseNegatives += 1;
        misses.push(payload);
      }
    }
    const fnRate = falseNegatives / MALICIOUS.length;
    process.stdout.write(
      `${JSON.stringify({ event: "pipeline_metrics", kind: "fn", fnRate, falseNegatives, total: MALICIOUS.length, misses })}\n`
    );
    assert.equal(falseNegatives, 0, `false negatives: ${misses.join(" | ")}`);
    assert.equal(fnRate, 0);
  });

  it("does not block benign messages (FP rate)", () => {
    let falsePositives = 0;
    const hits = [];
    for (const payload of BENIGN) {
      const result = evaluateDeterministic(payload);
      if (result.blocked) {
        falsePositives += 1;
        hits.push(payload);
      }
    }
    const fpRate = falsePositives / BENIGN.length;
    process.stdout.write(
      `${JSON.stringify({ event: "pipeline_metrics", kind: "fp", fpRate, falsePositives, total: BENIGN.length, hits })}\n`
    );
    assert.equal(falsePositives, 0, `false positives: ${hits.join(" | ")}`);
    assert.equal(fpRate, 0);
  });

  it("never includes raw content in a content hash helper", () => {
    const text = "secret payload";
    const hash = contentHash(text);
    assert.equal(hash.length, 64);
    assert.notEqual(hash, text);
  });
});

describe("attestation signing", () => {
  it("returns a recoverable EIP-712 signature only after both layers pass", async () => {
    resetNonces();
    const wallet = createAttesterWallet(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    );
    const author = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const chainId = 31337;
    const verifyingContract = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const classify = async () => [{ label: "toxicity", results: [{ match: false, probabilities: [0.9, 0.1] }] }];

    const accepted = await moderate({
      content: "A thoughtful governance comment",
      author,
      wallet,
      chainId,
      verifyingContract,
      classify,
      timeoutMs: 1500,
      ttlSeconds: 300,
    });

    assert.equal(accepted.allowed, true);
    assert.ok(accepted.signature);
    const recovered = ethers.verifyTypedData(
      domain(chainId, verifyingContract),
      EIP712_TYPES,
      {
        content: "A thoughtful governance comment",
        author,
        nonce: accepted.nonce,
        deadline: accepted.deadline,
      },
      accepted.signature
    );
    assert.equal(recovered.toLowerCase(), wallet.address.toLowerCase());
  });

  it("rejects toxic model matches without signing", async () => {
    const wallet = createAttesterWallet(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    );
    const classify = async () => [{ label: "toxicity", results: [{ match: true, probabilities: [0.1, 0.9] }] }];
    const result = await moderate({
      content: "A thoughtful governance comment",
      author: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      wallet,
      chainId: 31337,
      verifyingContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      classify,
      timeoutMs: 1500,
      ttlSeconds: 300,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "toxicity_model");
  });

  it("fails closed on timeout with contenido no verificado", async () => {
    const wallet = createAttesterWallet(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    );
    const classify = () => new Promise((resolve) => setTimeout(resolve, 50));
    const result = await moderate({
      content: "A thoughtful governance comment",
      author: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      wallet,
      chainId: 31337,
      verifyingContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      classify,
      timeoutMs: 5,
      ttlSeconds: 300,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "contenido no verificado");
  });
});
