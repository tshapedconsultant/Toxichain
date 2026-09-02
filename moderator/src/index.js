"use strict";

require("dotenv").config({ path: require("node:path").resolve(__dirname, "../../.env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const { createAttesterWallet } = require("./eip712");
const { createClassifier } = require("./toxicity");
const { moderate } = require("./moderate");
const { logInfo } = require("./logger");

const PORT = Number(process.env.PORT || 3001);
const CHAIN_ID = process.env.CHAIN_ID || "31337";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const TOXICITY_THRESHOLD = Number(process.env.TOXICITY_THRESHOLD || 0.7);
const TIMEOUT_MS = Number(process.env.MODERATION_TIMEOUT_MS || 1800);
const TTL_SECONDS = Number(process.env.ATTESTATION_TTL_SECONDS || 300);
const SKIP_TOXICITY = process.env.SKIP_TOXICITY === "1";

if (!process.env.ATTESTER_PRIVATE_KEY) {
  console.error("ATTESTER_PRIVATE_KEY is required");
  process.exit(1);
}
if (!ethers.isAddress(CONTRACT_ADDRESS)) {
  console.error("CONTRACT_ADDRESS must be a valid Ethereum address");
  process.exit(1);
}

const wallet = createAttesterWallet(process.env.ATTESTER_PRIVATE_KEY);
const classify = SKIP_TOXICITY ? undefined : createClassifier(TOXICITY_THRESHOLD);

const authorHits = new Map();
const AUTHOR_WINDOW_MS = 60_000;
const AUTHOR_MAX = 10;

function authorLimited(author) {
  const now = Date.now();
  const key = author.toLowerCase();
  const stamps = (authorHits.get(key) || []).filter((t) => now - t < AUTHOR_WINDOW_MS);
  if (stamps.length >= AUTHOR_MAX) {
    authorHits.set(key, stamps);
    return true;
  }
  stamps.push(now);
  authorHits.set(key, stamps);
  return false;
}

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: "4kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    attester: wallet.address,
    chainId: CHAIN_ID,
    contract: CONTRACT_ADDRESS,
  });
});

app.post("/moderate", async (req, res) => {
  const content = req.body?.content;
  const author = req.body?.author;

  if (typeof content !== "string" || typeof author !== "string" || !ethers.isAddress(author)) {
    return res.status(400).json({ allowed: false, reason: "invalid_request" });
  }
  if (Buffer.byteLength(content, "utf8") > 512) {
    return res.status(400).json({ allowed: false, reason: "content_too_long" });
  }
  if (authorLimited(author)) {
    return res.status(429).json({ allowed: false, reason: "rate_limited" });
  }

  const result = await moderate({
    content,
    author,
    wallet,
    chainId: CHAIN_ID,
    verifyingContract: CONTRACT_ADDRESS,
    classify,
    timeoutMs: TIMEOUT_MS,
    ttlSeconds: TTL_SECONDS,
    threshold: TOXICITY_THRESHOLD,
  });

  if (!result.allowed) {
    const status = result.reason === "contenido no verificado" ? 503 : 403;
    return res.status(status).json({
      allowed: false,
      reason: result.reason,
    });
  }

  return res.json({
    allowed: true,
    signature: result.signature,
    nonce: result.nonce,
    deadline: result.deadline,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logInfo("moderator_listening", {
      port: PORT,
      attester: wallet.address,
      skipToxicity: SKIP_TOXICITY,
    });
  });
}

module.exports = { app };
