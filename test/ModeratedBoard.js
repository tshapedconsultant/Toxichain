const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const EIP712_TYPES = {
  ModeratedMessage: [
    { name: "content", type: "string" },
    { name: "author", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

async function domainFor(board, chainIdOverride, verifyingOverride) {
  const network = await ethers.provider.getNetwork();
  return {
    name: "ModeratedBoard",
    version: "1",
    chainId: chainIdOverride ?? network.chainId,
    verifyingContract: verifyingOverride ?? (await board.getAddress()),
  };
}

async function signAttestation(signer, board, content, author, nonce, deadline, domainOverrides = {}) {
  const domain = await domainFor(
    board,
    domainOverrides.chainId,
    domainOverrides.verifyingContract
  );
  return signer.signTypedData(domain, EIP712_TYPES, {
    content,
    author,
    nonce,
    deadline,
  });
}

async function futureDeadline(seconds = 3600) {
  const latest = await ethers.provider.getBlock("latest");
  return BigInt(latest.timestamp + seconds);
}

describe("ModeratedBoard", function () {
  async function deployFixture() {
    const [owner, attester, author, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ModeratedBoard");
    const board = await Factory.deploy(attester.address);
    await board.waitForDeployment();
    return { board, owner, attester, author, other };
  }

  it("accepts a valid attester signature and emits MessagePosted without storing content", async function () {
    const { board, attester, author } = await loadFixture(deployFixture);
    const content = "Constructive proposal for the DAO";
    const nonce = 1n;
    const deadline = await futureDeadline();
    const signature = await signAttestation(attester, board, content, author.address, nonce, deadline);

    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));
    const digest = await board.attestationDigest(content, author.address, nonce, deadline);

    await expect(board.connect(author).postMessage(content, nonce, deadline, signature))
      .to.emit(board, "MessagePosted")
      .withArgs(author.address, content, contentHash, digest);

    expect(await board.usedNonces(author.address, nonce)).to.equal(true);
  });

  it("rejects a signature from a signer that is not the attester", async function () {
    const { board, author, other } = await loadFixture(deployFixture);
    const content = "Looks fine";
    const nonce = 1n;
    const deadline = await futureDeadline();
    const signature = await signAttestation(other, board, content, author.address, nonce, deadline);

    await expect(
      board.connect(author).postMessage(content, nonce, deadline, signature)
    ).to.be.revertedWithCustomError(board, "InvalidAttestation");
  });

  it("rejects a signature bound to a different message", async function () {
    const { board, attester, author } = await loadFixture(deployFixture);
    const nonce = 1n;
    const deadline = await futureDeadline();
    const signature = await signAttestation(
      attester,
      board,
      "Approved text",
      author.address,
      nonce,
      deadline
    );

    await expect(
      board.connect(author).postMessage("Swapped toxic payload", nonce, deadline, signature)
    ).to.be.revertedWithCustomError(board, "InvalidAttestation");
  });

  it("rejects replay of the same author nonce", async function () {
    const { board, attester, author } = await loadFixture(deployFixture);
    const content = "First post";
    const nonce = 7n;
    const deadline = await futureDeadline();
    const signature = await signAttestation(attester, board, content, author.address, nonce, deadline);

    await board.connect(author).postMessage(content, nonce, deadline, signature);

    await expect(
      board.connect(author).postMessage(content, nonce, deadline, signature)
    ).to.be.revertedWithCustomError(board, "NonceAlreadyUsed");
  });

  it("rejects an expired deadline", async function () {
    const { board, attester, author } = await loadFixture(deployFixture);
    const content = "Late post";
    const nonce = 1n;
    const latest = await ethers.provider.getBlock("latest");
    const deadline = BigInt(latest.timestamp - 1);
    const signature = await signAttestation(attester, board, content, author.address, nonce, deadline);

    await expect(
      board.connect(author).postMessage(content, nonce, deadline, signature)
    ).to.be.revertedWithCustomError(board, "DeadlineExpired");
  });

  it("rejects a signature whose EIP-712 domain chainId does not match", async function () {
    const { board, attester, author } = await loadFixture(deployFixture);
    const content = "Wrong chain";
    const nonce = 1n;
    const deadline = await futureDeadline();
    const signature = await signAttestation(
      attester,
      board,
      content,
      author.address,
      nonce,
      deadline,
      { chainId: 999n }
    );

    await expect(
      board.connect(author).postMessage(content, nonce, deadline, signature)
    ).to.be.revertedWithCustomError(board, "InvalidAttestation");
  });

  it("rejects a signature whose EIP-712 verifyingContract does not match", async function () {
    const { board, attester, author, other } = await loadFixture(deployFixture);
    const content = "Wrong board";
    const nonce = 1n;
    const deadline = await futureDeadline();
    const signature = await signAttestation(
      attester,
      board,
      content,
      author.address,
      nonce,
      deadline,
      { verifyingContract: other.address }
    );

    await expect(
      board.connect(author).postMessage(content, nonce, deadline, signature)
    ).to.be.revertedWithCustomError(board, "InvalidAttestation");
  });

  it("allows only the owner to rotate the attester", async function () {
    const { board, owner, attester, other } = await loadFixture(deployFixture);

    await expect(board.connect(other).setAttester(other.address))
      .to.be.revertedWithCustomError(board, "OwnableUnauthorizedAccount")
      .withArgs(other.address);

    await expect(board.connect(owner).setAttester(other.address))
      .to.emit(board, "AttesterUpdated")
      .withArgs(attester.address, other.address);

    expect(await board.attester()).to.equal(other.address);
  });

  it("rejects empty content, oversized content, and a zero attester", async function () {
    const { board, attester, author, owner } = await loadFixture(deployFixture);
    const nonce = 1n;
    const deadline = await futureDeadline();
    const emptySig = await signAttestation(attester, board, "", author.address, nonce, deadline);

    await expect(
      board.connect(author).postMessage("", nonce, deadline, emptySig)
    ).to.be.revertedWithCustomError(board, "EmptyContent");

    const tooLong = "x".repeat(513);
    const longSig = await signAttestation(attester, board, tooLong, author.address, nonce, deadline);
    await expect(
      board.connect(author).postMessage(tooLong, nonce, deadline, longSig)
    ).to.be.revertedWithCustomError(board, "ContentTooLong");

    await expect(board.connect(owner).setAttester(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      board,
      "ZeroAttester"
    );
  });
});
