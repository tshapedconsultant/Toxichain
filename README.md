# ToxiChain AI

A decentralized application (dApp) that prevents toxic or offensive content from being permanently stored on the blockchain using real-time AI content moderation.

## Overview

**ToxiChain AI** is a full-stack Web3 application that combines AI-powered sentiment analysis with Ethereum smart contracts to ensure only appropriate messages are immutably recorded on-chain. The system filters messages in real-time before blockchain submission, supporting multi-language detection (English + Spanish) and handling obfuscation patterns and leetspeak.

## Features

- ✅ **AI-Powered Content Moderation**: Real-time toxicity detection using TensorFlow.js
- ✅ **Multi-Language Support**: English + Spanish profanity filtering
- ✅ **Advanced Pattern Detection**: Handles obfuscated text and leetspeak
- ✅ **Blockchain Integration**: Ethereum smart contract for immutable message storage
- ✅ **MetaMask Wallet**: Seamless Web3 wallet connectivity
- ✅ **Responsive UI**: Modern, user-friendly interface

## Tech Stack

- **AI/ML**: TensorFlow.js · Toxicity Model
- **Blockchain**: Solidity · Hardhat · Ethers.js
- **Frontend**: HTML5 · CSS3 · JavaScript (ES6+)
- **Wallet**: MetaMask
- **Development**: Node.js · npm

## Innovation

Bridges AI moderation and decentralized ledgers, demonstrating how responsible GenAI can enhance Web3 trust and compliance. This project showcases the integration of AI content filtering at the application layer to prevent inappropriate content from being permanently stored on immutable blockchains.

## Project Structure

```
working-dapp/
├── contracts/
│   └── MiContrato.sol          # Solidity smart contract
├── frontend/
│   └── index.html              # Web interface with AI filtering
├── scripts/
│   └── deploy.js               # Deployment script
├── test/
│   └── Lock.js                 # Test files
├── hardhat.config.js            # Hardhat configuration
└── package.json                # Dependencies
```

## Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- MetaMask browser extension

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd working-dapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local blockchain (Terminal 1)**
   ```bash
   npx hardhat node
   ```

4. **Deploy contract (Terminal 2)**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

5. **Update frontend with contract address** ⚠️ **REQUIRED**
   - Copy the deployed contract address from the deployment output (e.g., `Contrato desplegado en: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)
   - Open `frontend/index.html` in a text editor
   - Find the line: `const contractAddress = "0x...";` (around line 142)
   - Replace the address with your deployed contract address
   - Save the file

   **Why this is important:** The frontend contract address **must match** the deployed contract address. If they don't match, you'll get errors like "could not decode result data" or "BAD_DATA" when trying to interact with the contract.

6. **Open the dApp**
   - Open `frontend/index.html` in your browser
   - Connect MetaMask to localhost network (Chain ID: 31337)
   - Import a test account from the Hardhat node output

## Usage

1. **View Current Message**: Click "View current message" to read the message stored on the blockchain
2. **Update Message**: Enter a new message and click "Send" to update the contract
3. **AI Filtering**: The system automatically filters toxic or offensive content before submission

## MetaMask Configuration

**Network Settings:**
- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency Symbol: `ETH`

**Import Test Account:**
Copy any private key from the Hardhat node terminal output.

⚠️ **NEVER use test accounts on mainnet!**

## Troubleshooting

### Contract Address Mismatch Error

**Error:** `could not decode result data (value="0x", info={ "method": "mensaje" })` or `BAD_DATA`

**Solution:** The contract address in `frontend/index.html` doesn't match your deployed contract.

1. Deploy the contract: `npx hardhat run scripts/deploy.js --network localhost`
2. Copy the contract address from the output
3. Update `frontend/index.html` line 142: `const contractAddress = "YOUR_DEPLOYED_ADDRESS";`
4. Refresh your browser

**Note:** Each time you restart the Hardhat node, you need to redeploy and update the address. The contract address changes with each new deployment.

### MetaMask Connection Issues

- Ensure you're connected to the Hardhat Local network (Chain ID: 31337)
- Make sure the Hardhat node is running (`npx hardhat node`)
- Try resetting your MetaMask account: Settings → Advanced → Reset Account

## Development

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```

### Clean Build Artifacts
```bash
npx hardhat clean
```

## Role & Implementation

**End-to-end development:**
- Designed and implemented AI toxicity filter using TensorFlow.js
- Developed Solidity smart contract for on-chain message storage
- Built responsive front-end with MetaMask integration
- Integrated real-time content moderation before blockchain submission

## License

MIT License - feel free to use this project for learning and development.



---

**Built as a demonstration of AI-powered content moderation in Web3 ecosystems.**
