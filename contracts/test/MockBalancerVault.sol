// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IFlashLoan.sol";

// Define a simple interface instead of importing the Balancer one
interface IFlashLoanRecipientMock {
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

contract MockBalancerVault {
    function flashLoan(
        IFlashLoanRecipient recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external {
        // Check that arrays have the same length
        require(tokens.length == amounts.length, "Array length mismatch");

        // Record balances before
        uint256[] memory balancesBefore = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balancesBefore[i] = tokens[i].balanceOf(address(this));
        }

        // Transfer tokens to recipient
        for (uint256 i = 0; i < tokens.length; i++) {
            require(
                tokens[i].transfer(address(recipient), amounts[i]),
                "Token transfer failed"
            );
        }

        // Calculate fees (use 0 for simplicity in tests)
        uint256[] memory fees = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            fees[i] = 0;
        }

        // Call recipient
        recipient.receiveFlashLoan(tokens, amounts, fees, userData);

        // Verify tokens are returned
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balanceAfter = tokens[i].balanceOf(address(this));
            require(balanceAfter >= balancesBefore[i], "Flash loan not repaid");
        }
    }
}
