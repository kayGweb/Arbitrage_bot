// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Universal DEX Arbitrage
 * @notice Contract that performs arbitrage between any two Uniswap V2 compatible DEXes
 * @dev Uses Balancer flash loans to fund the arbitrage
 */
contract UniversalArbitrage is IFlashLoanRecipient, Ownable {
    // Balancer Vault address for flash loans - different per blockchain
    IVault public vault;
    
    // Mapping to store authorized DEX router addresses
    mapping(address => bool) public authorizedRouters;
    
    // DEX router address to name mapping
    mapping(address => string) public routerNames;
    
    // Events
    event ArbitrageExecuted(
        address indexed token0,
        address indexed token1,
        address buyRouter,
        address sellRouter,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit
    );
    
    event RouterAdded(address indexed router, string name);
    event RouterRemoved(address indexed router);
    
    /**
     * @notice Initialize the contract with a Balancer Vault address
     * @param _vaultAddress Address of the Balancer Vault on the current chain
     */
    constructor(address _vaultAddress) Ownable(msg.sender) {
        vault = IVault(_vaultAddress);
    }
    
    /**
     * @notice Add a DEX router to the authorized list
     * @param _router Address of the router
     * @param _name Name of the DEX
     */
    function addRouter(address _router, string calldata _name) external onlyOwner {
        authorizedRouters[_router] = true;
        routerNames[_router] = _name;
        emit RouterAdded(_router, _name);
    }
    
    /**
     * @notice Remove a DEX router from the authorized list
     * @param _router Address of the router to remove
     */
    function removeRouter(address _router) external onlyOwner {
        authorizedRouters[_router] = false;
        emit RouterRemoved(_router);
    }
    
    /**
     * @notice Update the Balancer Vault address (needed when deploying to different chains)
     * @param _newVaultAddress New Balancer Vault address
     */
    function updateVaultAddress(address _newVaultAddress) external onlyOwner {
        vault = IVault(_newVaultAddress);
    }
    
    /**
     * @notice Execute an arbitrage trade between two DEXes
     * @param _buyRouter Router address for the buy side
     * @param _sellRouter Router address for the sell side
     * @param _token0 Address of the token used for flash loan (e.g., WETH)
     * @param _token1 Address of the other token in the pair
     * @param _flashAmount Amount of _token0 to flash loan
     */
    function executeTrade(
        address _buyRouter,
        address _sellRouter,
        address _token0,
        address _token1,
        uint256 _flashAmount
    ) external onlyOwner {
        // Verify routers are authorized
        require(authorizedRouters[_buyRouter], "Buy router not authorized");
        require(authorizedRouters[_sellRouter], "Sell router not authorized");
        
        bytes memory data = abi.encode(_buyRouter, _sellRouter, _token0, _token1);
        
        // Token to flash loan
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(_token0);
        
        // Flash loan amount
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _flashAmount;
        
        // Execute flash loan
        vault.flashLoan(this, tokens, amounts, data);
    }
    
    /**
     * @notice Callback function for Balancer flash loans
     * @dev This function is called by the Balancer Vault during the flash loan
     */
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(vault), "Only Balancer Vault can call");
        
        uint256 flashAmount = amounts[0];
        
        // Decode user data
        (address buyRouter, address sellRouter, address token0, address token1) = abi.decode(
            userData,
            (address, address, address, address)
        );
        
        // Setup path arrays for the swaps
        address[] memory buyPath = new address[](2);
        buyPath[0] = token0;
        buyPath[1] = token1;
        
        address[] memory sellPath = new address[](2);
        sellPath[0] = token1;
        sellPath[1] = token0;
        
        // Initial balance
        uint256 initialBalance = IERC20(token0).balanceOf(address(this));
        
        // 1. Buy token1 with token0 on the first DEX
        _swap(buyRouter, buyPath, flashAmount, 0);
        
        // Get token1 balance after first swap
        uint256 token1Balance = IERC20(token1).balanceOf(address(this));
        
        // 2. Sell token1 for token0 on the second DEX
        _swap(sellRouter, sellPath, token1Balance, 0);
        
        // Calculate final balance and profit
        uint256 finalBalance = IERC20(token0).balanceOf(address(this));
        uint256 profit = finalBalance - initialBalance;
        
        // Pay back the flash loan
        IERC20(token0).transfer(address(vault), flashAmount);
        
        // Transfer profit to owner
        if (profit > 0) {
            IERC20(token0).transfer(owner(), profit);
        }
        
        // Emit event with details
        emit ArbitrageExecuted(
            token0,
            token1,
            buyRouter,
            sellRouter,
            flashAmount,
            finalBalance,
            profit
        );
    }
    
    /**
     * @notice Execute a swap on a DEX
     * @param _router Router address to use for the swap
     * @param _path Token path for the swap
     * @param _amountIn Amount of input token
     * @param _amountOutMin Minimum amount of output token expected
     */
    function _swap(
        address _router,
        address[] memory _path,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal {
        // Approve the router to spend the token
        require(
            IERC20(_path[0]).approve(_router, _amountIn),
            "Router approval failed"
        );
        
        // Execute the swap
        IUniswapV2Router02(_router).swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            address(this),
            block.timestamp + 300 // 5 minute deadline
        );
    }
    
    /**
     * @notice Recover tokens accidentally sent to the contract
     * @param _token Address of the token to recover
     */
    function recoverToken(address _token) external onlyOwner {
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to recover");
        token.transfer(owner(), balance);
    }
}
