const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const code = await provider.getCode(address);
  
  if (code === "0x") {
    console.log("❌ Contract NOT deployed at", address);
    console.log("Deploying now...");
    
    const MiContrato = await ethers.getContractFactory("MiContrato");
    const contrato = await MiContrato.deploy("Eureka");
    await contrato.waitForDeployment();
    const newAddress = await contrato.getAddress();
    
    console.log("✅ Contract deployed to:", newAddress);
    console.log("⚠️  Update frontend/index.html with this address!");
  } else {
    console.log("✅ Contract IS deployed at", address);
    
    // Try to read the message
    try {
      const contract = new ethers.Contract(
        address,
        [
          {
            inputs: [],
            name: "mensaje",
            outputs: [{ internalType: "string", name: "", type: "string" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        provider
      );
      const mensaje = await contract.mensaje();
      console.log("✅ Current message:", mensaje);
    } catch (error) {
      console.log("❌ Error reading message:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

