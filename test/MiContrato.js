const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MiContrato", function () {
  let miContrato;
  let owner;
  let addr1;
  let addr2;

  const MAX_MESSAGE_LENGTH = 280;
  const INITIAL_MESSAGE = "Eureka";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MiContrato = await ethers.getContractFactory("MiContrato");
    miContrato = await MiContrato.deploy(INITIAL_MESSAGE);
    await miContrato.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the initial message correctly", async function () {
      expect(await miContrato.mensaje()).to.equal(INITIAL_MESSAGE);
    });

    it("Should set MAX_MESSAGE_LENGTH constant", async function () {
      expect(await miContrato.MAX_MESSAGE_LENGTH()).to.equal(MAX_MESSAGE_LENGTH);
    });

    it("Should revert with empty message in constructor", async function () {
      const MiContrato = await ethers.getContractFactory("MiContrato");
      await expect(MiContrato.deploy("")).to.be.revertedWith("Message cannot be empty");
    });

    it("Should revert with message too long in constructor", async function () {
      const MiContrato = await ethers.getContractFactory("MiContrato");
      const longMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
      await expect(MiContrato.deploy(longMessage)).to.be.revertedWith("Message too long");
    });
  });

  describe("setMensaje", function () {
    it("Should update message successfully", async function () {
      const newMessage = "Hello World";
      await miContrato.setMensaje(newMessage);
      expect(await miContrato.mensaje()).to.equal(newMessage);
    });

    it("Should allow any address to update message", async function () {
      const newMessage = "Updated by addr1";
      await miContrato.connect(addr1).setMensaje(newMessage);
      expect(await miContrato.mensaje()).to.equal(newMessage);
    });

    it("Should revert with empty message", async function () {
      await expect(miContrato.setMensaje("")).to.be.revertedWith("Message cannot be empty");
    });

    it("Should revert with message too long", async function () {
      const longMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
      await expect(miContrato.setMensaje(longMessage)).to.be.revertedWith("Message too long");
    });

    it("Should accept message at maximum length", async function () {
      const maxMessage = "a".repeat(MAX_MESSAGE_LENGTH);
      await miContrato.setMensaje(maxMessage);
      expect(await miContrato.mensaje()).to.equal(maxMessage);
    });

    it("Should handle special characters", async function () {
      const specialMessage = "Hello! @#$%^&*() 123";
      await miContrato.setMensaje(specialMessage);
      expect(await miContrato.mensaje()).to.equal(specialMessage);
    });

    it("Should handle unicode characters", async function () {
      const unicodeMessage = "Hola mundo! 你好世界";
      await miContrato.setMensaje(unicodeMessage);
      expect(await miContrato.mensaje()).to.equal(unicodeMessage);
    });
  });

  describe("Gas optimization", function () {
    it("Should use reasonable gas for message update", async function () {
      const tx = await miContrato.setMensaje("Test message");
      const receipt = await tx.wait();
      // Gas should be reasonable (less than 100k for simple string update)
      expect(receipt.gasUsed).to.be.lessThan(100000n);
    });
  });
});

