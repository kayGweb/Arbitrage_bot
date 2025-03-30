// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

// contracts/test/MockUniswapV2Router02.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract MockUniswapV2Router02 {
    // Token swap rates (token0 => token1 => rate)
    mapping(address => mapping(address => uint256)) private swapRates;

    function setTokenSwapRate(
        address tokenA,
        address tokenB,
        uint256 rate
    ) external {
        swapRates[tokenA][tokenB] = rate;
    }

    function getTokenSwapRate(
        address tokenA,
        address tokenB
    ) external view returns (uint256) {
        return swapRates[tokenA][tokenB];
    }

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts) {
        require(path.length == 2, "Invalid path length");

        amounts = new uint[](2);
        amounts[0] = amountIn;

        // Calculate amountOut based on the swap rate
        // If no rate is set, use 1:1 rate
        if (swapRates[path[0]][path[1]] > 0) {
            // Convert based on decimals
            uint8 decimalsIn = 18; // Assume 18 for simplicity
            uint8 decimalsOut = 6; // Assume 6 for simplicity

            if (
                path[0] == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ) {
                // WETH has 18 decimals
                decimalsIn = 18;
            }

            if (
                path[1] == address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
            ) {
                // USDC has 6 decimals
                decimalsOut = 6;
            }

            // Calculate based on rate and decimal adjustment
            amounts[1] =
                (amountIn * swapRates[path[0]][path[1]]) /
                (10 ** (decimalsIn - decimalsOut));
        } else if (swapRates[path[1]][path[0]] > 0) {
            // Calculate inverse rate
            uint8 decimalsIn = 18;
            uint8 decimalsOut = 18;

            if (
                path[1] == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ) {
                // WETH has 18 decimals
                decimalsOut = 18;
            }

            if (
                path[0] == address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
            ) {
                // USDC has 6 decimals
                decimalsIn = 6;
            }

            // Calculate inverse rate with decimal adjustment
            amounts[1] =
                (amountIn * (10 ** (decimalsOut - decimalsIn))) /
                swapRates[path[1]][path[0]];
        } else {
            // Default 1:1 rate
            amounts[1] = amountIn;
        }
    }

    function getAmountsIn(
        uint amountOut,
        address[] calldata path
    ) external view returns (uint[] memory amounts) {
        require(path.length == 2, "Invalid path length");

        amounts = new uint[](2);
        amounts[1] = amountOut;

        // Calculate amountIn based on the swap rate
        if (swapRates[path[0]][path[1]] > 0) {
            // Convert based on decimals
            uint8 decimalsIn = 18;
            uint8 decimalsOut = 6;

            if (
                path[0] == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ) {
                // WETH has 18 decimals
                decimalsIn = 18;
            }

            if (
                path[1] == address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
            ) {
                // USDC has 6 decimals
                decimalsOut = 6;
            }

            // Calculate amount in with decimal adjustment
            amounts[0] =
                (amountOut * (10 ** (decimalsIn - decimalsOut))) /
                swapRates[path[0]][path[1]];
        } else if (swapRates[path[1]][path[0]] > 0) {
            // Calculate using inverse rate
            uint8 decimalsIn = 18;
            uint8 decimalsOut = 18;

            if (
                path[1] == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ) {
                // WETH has 18 decimals
                decimalsOut = 18;
            }

            if (
                path[0] == address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
            ) {
                // USDC has 6 decimals
                decimalsIn = 6;
            }

            // Calculate with inverse rate and decimal adjustment
            amounts[0] =
                (amountOut * swapRates[path[1]][path[0]]) /
                (10 ** (decimalsOut - decimalsIn));
        } else {
            // Default 1:1 rate
            amounts[0] = amountOut;
        }
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(path.length == 2, "Invalid path length");
        require(deadline >= block.timestamp, "Deadline expired");

        // Get token contracts
        IERC20 tokenIn = IERC20(path[0]);
        IERC20 tokenOut = IERC20(path[1]);

        // Calculate amounts
        amounts = new uint[](2);
        amounts[0] = amountIn;

        // Calculate output amount using getAmountsOut
        uint[] memory expectedAmounts = this.getAmountsOut(amountIn, path);
        amounts[1] = expectedAmounts[1];

        require(amounts[1] >= amountOutMin, "Insufficient output amount");

        // Transfer tokens from sender to this contract
        require(
            tokenIn.transferFrom(msg.sender, address(this), amountIn),
            "TransferFrom failed"
        );

        // Transfer output tokens to recipient
        require(tokenOut.transfer(to, amounts[1]), "Transfer failed");

        return amounts;
    }

    // Implement other required functions with minimal logic
    function factory() external pure returns (address) {
        return address(0);
    }

    function WETH() external pure returns (address) {
        return address(0);
    }

    // Add other required functions from IUniswapV2Router with minimal implementations
}

// contracts/test/MockBalancerVault.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";

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
