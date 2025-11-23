// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MiContrato {
    string public mensaje;
    uint256 public constant MAX_MESSAGE_LENGTH = 280; // Reasonable limit to prevent gas griefing

    constructor(string memory _mensaje) {
        require(bytes(_mensaje).length > 0, "Message cannot be empty");
        require(bytes(_mensaje).length <= MAX_MESSAGE_LENGTH, "Message too long");
        mensaje = _mensaje;
    }

    function setMensaje(string memory _mensaje) public {
        require(bytes(_mensaje).length > 0, "Message cannot be empty");
        require(bytes(_mensaje).length <= MAX_MESSAGE_LENGTH, "Message too long");
        mensaje = _mensaje;
    }
}