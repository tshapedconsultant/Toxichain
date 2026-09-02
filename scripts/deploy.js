const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const attester = process.env.ATTESTER_ADDRESS || deployer.address;
  if (!hre.ethers.isAddress(attester)) {
    throw new Error("Set ATTESTER_ADDRESS to a valid address.");
  }

  const Factory = await hre.ethers.getContractFactory("ModeratedBoard");
  const board = await Factory.deploy(attester);
  await board.waitForDeployment();

  console.log(`ModeratedBoard deployed at: ${board.target}`);
  console.log(`Attester: ${attester}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
