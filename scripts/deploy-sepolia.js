const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

async function main() {
  const attester = process.env.ATTESTER_ADDRESS;
  if (!hre.ethers.isAddress(attester)) {
    throw new Error("Set ATTESTER_ADDRESS to the moderation service signing address.");
  }

  const Factory = await hre.ethers.getContractFactory("ModeratedBoard");
  const board = await Factory.deploy(attester);
  await board.waitForDeployment();

  const address = await board.getAddress();
  const network = await hre.ethers.provider.getNetwork();
  const payload = {
    address,
    chainId: network.chainId.toString(),
    attester,
    network: hre.network.name,
  };

  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`ModeratedBoard deployed at: ${address}`);
  console.log(`Attester: ${attester}`);
  console.log(`Wrote ${outPath}`);
  console.log("Set frontend/.env VITE_CONTRACT_ADDRESS and moderator CONTRACT_ADDRESS to this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
