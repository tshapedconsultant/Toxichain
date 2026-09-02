// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title ModeratedBoard
 * @author Andrés Lage (tshapedconsultant)
 * @notice Public message board that accepts posts only when accompanied by a valid
 *         EIP-712 moderation attestation from an authorized off-chain attester.
 *
 * @dev Security model
 *      Client-side-only filters (TensorFlow.js in the browser, word lists, etc.)
 *      cannot enforce moderation: anyone can call a public `setMensaje`-style
 *      function directly with eth_sendTransaction and bypass the UI. This contract
 *      closes that bypass. `postMessage` recovers an EIP-712 signature over
 *      (content, author, nonce, deadline) whose domain already binds `chainId` and
 *      `address(this)`. The recovered signer MUST equal `attester`. Without a
 *      fresh attestation from the moderation service, the transaction reverts.
 *
 *      Storage decision: message bodies are NOT written to contract storage.
 *      They are emitted on `MessagePosted` so indexers / the frontend can rebuild
 *      history from logs. This avoids unbounded SSTORE costs and keeps the board
 *      from becoming a paid data dump. Calldata is still capped at `MAX_CONTENT_LENGTH`
 *      (512 bytes) to bound gas used by hashing and log data.
 *
 *      Replay protection: each (author, nonce) pair may be consumed once.
 *      Attestations also expire at `deadline`. The attester address is rotatable
 *      by the owner so a compromised key can be replaced without redeploying.
 */
contract ModeratedBoard is Ownable, EIP712 {
    /// @notice EIP-712 typehash for a moderated post. Domain separator binds chainId + verifyingContract.
    bytes32 public constant MODERATED_MESSAGE_TYPEHASH = keccak256(
        "ModeratedMessage(string content,address author,uint256 nonce,uint256 deadline)"
    );

    /// @notice Maximum content size in bytes. Caps log/calldata cost; bodies are not stored.
    uint256 public constant MAX_CONTENT_LENGTH = 512;

    /// @notice Address whose EIP-712 signatures the contract will accept.
    address public attester;

    /// @notice Replay set: author => nonce => already consumed.
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    /// @notice Emitted for every accepted post. Indexers reconstruct the feed from this log.
    /// @param author The msg.sender who posted (must match the attested author).
    /// @param content The accepted message body (not stored in contract storage).
    /// @param contentHash keccak256 of the UTF-8 content bytes.
    /// @param attestationUsed The EIP-712 digest that was consumed.
    event MessagePosted(
        address indexed author,
        string content,
        bytes32 indexed contentHash,
        bytes32 attestationUsed
    );

    /// @notice Emitted when the owner rotates the authorized attester.
    event AttesterUpdated(address indexed previousAttester, address indexed newAttester);

    error EmptyContent();
    error ContentTooLong();
    error DeadlineExpired();
    error NonceAlreadyUsed();
    error InvalidAttestation();
    error AuthorMismatch();
    error ZeroAttester();

    /**
     * @param initialAttester Address of the moderation service signing key.
     */
    constructor(address initialAttester) Ownable(msg.sender) EIP712("ModeratedBoard", "1") {
        _setAttester(initialAttester);
    }

    /**
     * @notice Post a message that has already been approved by the attester.
     * @param content Message body. Must be non-empty and <= MAX_CONTENT_LENGTH bytes.
     * @param nonce Unique nonce for `msg.sender`; cannot be reused.
     * @param deadline Unix timestamp after which the attestation is invalid.
     * @param signature EIP-712 signature from `attester` over the typed data.
     */
    function postMessage(
        string calldata content,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        uint256 contentLength = bytes(content).length;
        if (contentLength == 0) revert EmptyContent();
        if (contentLength > MAX_CONTENT_LENGTH) revert ContentTooLong();
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed();

        bytes32 digest = _attestationDigest(content, msg.sender, nonce, deadline);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != attester) revert InvalidAttestation();

        usedNonces[msg.sender][nonce] = true;

        bytes32 contentHash = keccak256(bytes(content));
        emit MessagePosted(msg.sender, content, contentHash, digest);
    }

    /**
     * @notice Replace the attester. Only the owner may rotate a compromised key.
     * @param newAttester Address of the new moderation signing key.
     */
    function setAttester(address newAttester) external onlyOwner {
        _setAttester(newAttester);
    }

    /**
     * @notice EIP-712 digest the attester must sign for a given payload.
     * @dev Domain separator includes name, version, chainId, and address(this),
     *      so a signature produced for another chain or another board is rejected.
     */
    function attestationDigest(
        string calldata content,
        address author,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _attestationDigest(content, author, nonce, deadline);
    }

    /**
     * @notice EIP-712 domain separator (exposes chainId + verifyingContract binding).
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _attestationDigest(
        string memory content,
        address author,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                MODERATED_MESSAGE_TYPEHASH,
                keccak256(bytes(content)),
                author,
                nonce,
                deadline
            )
        );
        return _hashTypedDataV4(structHash);
    }

    function _setAttester(address newAttester) internal {
        if (newAttester == address(0)) revert ZeroAttester();
        address previous = attester;
        attester = newAttester;
        emit AttesterUpdated(previous, newAttester);
    }
}
