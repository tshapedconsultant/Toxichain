"use strict";

function logDecision(entry) {
  const line = {
    ts: new Date().toISOString(),
    event: "moderation_decision",
    ...entry,
  };
  // Never log raw content — callers must pass contentHash only.
  delete line.content;
  process.stdout.write(`${JSON.stringify(line)}\n`);
}

function logInfo(event, extra = {}) {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...extra })}\n`);
}

module.exports = { logDecision, logInfo };
