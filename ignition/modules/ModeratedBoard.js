const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * Deploys ModeratedBoard with a configurable attester.
 * Default attester is the first Ignition account (local/dev).
 * Override on Sepolia with:
 *   npx hardhat ignition deploy ignition/modules/ModeratedBoard.js \
 *     --network sepolia --parameters '{"ModeratedBoardModule":{"attester":"0x..."}}'
 */
module.exports = buildModule("ModeratedBoardModule", (m) => {
  const attester = m.getParameter("attester", m.getAccount(0));
  const board = m.contract("ModeratedBoard", [attester]);
  return { board };
});
