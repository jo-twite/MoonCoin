// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MoonCoin is ERC20 {
    constructor() ERC20("MoonCoin", "MCN") {
        _mint(msg.sender, 1_000_001 * 10 ** decimals());
    }
}
