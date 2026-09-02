"use strict";

const { ethers } = require("ethers");

const EIP712_TYPES = {
  ModeratedMessage: [
    { name: "content", type: "string" },
    { name: "author", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

function domain(chainId, verifyingContract) {
  return {
    name: "ModeratedBoard",
    version: "1",
    chainId: BigInt(chainId),
    verifyingContract,
  };
}

function createAttesterWallet(privateKey) {
  if (!privateKey) {
    throw new Error("ATTESTER_PRIVATE_KEY is required");
  }
  return new ethers.Wallet(privateKey);
}

async function signModeration(wallet, { content, author, nonce, deadline, chainId, verifyingContract }) {
  return wallet.signTypedData(domain(chainId, verifyingContract), EIP712_TYPES, {
    content,
    author,
    nonce,
    deadline,
  });
}

module.exports = {
  EIP712_TYPES,
  domain,
  createAttesterWallet,
  signModeration,
};
