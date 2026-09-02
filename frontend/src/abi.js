export const MODERATED_BOARD_ABI = [
  "function postMessage(string content, uint256 nonce, uint256 deadline, bytes signature)",
  "function attester() view returns (address)",
  "function MAX_CONTENT_LENGTH() view returns (uint256)",
  "event MessagePosted(address indexed author, string content, bytes32 indexed contentHash, bytes32 attestationUsed)",
];
