"use strict";

const { logInfo } = require("./logger");

let modelPromise;

async function loadToxicityModel(threshold) {
  if (!modelPromise) {
    modelPromise = (async () => {
      // Pure-JS backend so Windows / CI do not need native tfjs-node bindings.
      require("@tensorflow/tfjs");
      const toxicity = require("@tensorflow-models/toxicity");
      const model = await toxicity.load(threshold);
      logInfo("toxicity_model_loaded", { threshold });
      return model;
    })().catch((err) => {
      modelPromise = undefined;
      throw err;
    });
  }
  return modelPromise;
}

function createClassifier(threshold) {
  return async function classify(content) {
    const model = await loadToxicityModel(threshold);
    return model.classify([content]);
  };
}

module.exports = { loadToxicityModel, createClassifier };
