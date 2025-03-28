// test/UniversalArbitrage.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UniversalArbitrage Contract", function() {
  let arbitrage;
  let owner;
  let user;
  let mockVault;
  let uniswapRouter;
  let sushiswapRouter;
  let weth;
  let usdc;
  
  const ZERO_ADDRESS = ethers.ZeroAddress;
  
  beforeEach(async function() {
    // Get signers
    [owner, user, mockVault] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    
    // Deploy mock routers
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    uniswapRouter = await MockRouter.deploy();
    sushiswapRouter = await MockRouter.deploy();
    
    // Set swap rates
    // On Uniswap: 1 WETH = 1200 USDC
    await uniswapRouter.setTokenSwapRate(
      await weth.getAddress(),
      await usdc.getAddress(),
      ethers.parseUnits("1200", 6)
    );
    
    // On Sushiswap: 1 WETH = 1230 USDC (2.5% higher)
    await sushiswapRouter.setTokenSwapRate(
      await weth.getAddress(),
      await usdc.getAddress(),
      ethers.parseUnits("1230", 6)
    );
    
    // Also set the reverse rates
    // On Uniswap: 1200 USDC = 1 WETH
    await uniswapRouter.setTokenSwapRate(
      await usdc.getAddress(),
      await weth.getAddress(),
      ethers.parseUnits("1", 18).div(1200)
    );
    
    // On Sushiswap: 1230 USDC = 1 WETH
    await sushiswapRouter.setTokenSwapRate(
      await usdc.getAddress(),
      await weth.getAddress(),
      ethers.parseUnits("1", 18).div(1230)
    );
    
    // Fund routers with tokens for swaps
    await weth.mint(await uniswapRouter.getAddress(), ethers.parseUnits("100", 18));
    await usdc.mint(await uniswapRouter.getAddress(), ethers.parseUnits("120000", 6));
    await weth.mint(await sushiswapRouter.getAddress(), ethers.parseUnits("100", 18));
    await usdc.mint(await sushiswapRouter.getAddress(), ethers.parseUnits("123000", 6));
    
    // Deploy mock Balancer vault
    const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
    const vault = await MockBalancerVault.deploy();
    
    // Fund vault with tokens for flash loans
    await weth.mint(await vault.getAddress(), ethers.parseUnits("1000", 18));
    await usdc.mint(await vault.getAddress(), ethers.parseUnits("1000000", 6));
    
    // Deploy the UniversalArbitrage contract
    const UniversalArbitrage = await ethers.getContractFactory("UniversalArbitrage");
    arbitrage = await UniversalArbitrage.deploy(await vault.getAddress());
    
    // Add the routers to the whitelist
    await arbitrage.addRouter(await uniswapRouter.getAddress(), "Uniswap");
    await arbitrage.addRouter(await sushiswapRouter.getAddress(), "Sushiswap");
  });
  
  describe("Deployment", function() {
    it("should set the right owner", async function() {
      expect(await arbitrage.owner()).to.equal(await owner.getAddress());
    });
    
    it("should set the vault address correctly", async function() {
      const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
      const vault = await MockBalancerVault.deploy();
      
      const UniversalArbitrage = await ethers.getContractFactory("UniversalArbitrage");
      const newArbitrage = await UniversalArbitrage.deploy(await vault.getAddress());
      
      expect(await newArbitrage.vault()).to.equal(await vault.getAddress());
    });
    
    it("should initialize with no authorized routers", async function() {
      const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
      const vault = await MockBalancerVault.deploy();
      
      const UniversalArbitrage = await ethers.getContractFactory("UniversalArbitrage");
      const newArbitrage = await UniversalArbitrage.deploy(await vault.getAddress());
      
      expect(await newArbitrage.authorizedRouters(await uniswapRouter.getAddress())).to.be.false;
      expect(await newArbitrage.authorizedRouters(await sushiswapRouter.getAddress())).to.be.false;
    });
  });
  
  describe("Router Management", function() {
    it("should authorize routers correctly", async function() {
      expect(await arbitrage.authorizedRouters(await uniswapRouter.getAddress())).to.be.true;
      expect(await arbitrage.authorizedRouters(await sushiswapRouter.getAddress())).to.be.true;
      expect(await arbitrage.routerNames(await uniswapRouter.getAddress())).to.equal("Uniswap");
      expect(await arbitrage.routerNames(await sushiswapRouter.getAddress())).to.equal("Sushiswap");
    });
    
    it("should allow owner to add new routers", async function() {
      const routerAddress = ethers.Wallet.createRandom().address;
      
      await expect(arbitrage.addRouter(routerAddress, "NewDEX"))
        .to.emit(arbitrage, "RouterAdded")
        .withArgs(routerAddress, "NewDEX");
      
      expect(await arbitrage.authorizedRouters(routerAddress)).to.be.true;
      expect(await arbitrage.routerNames(routerAddress)).to.equal("NewDEX");
    });
    
    it("should allow owner to remove routers", async function() {
      const uniswapRouterAddress = await uniswapRouter.getAddress();
      
      await expect(arbitrage.removeRouter(uniswapRouterAddress))
        .to.emit(arbitrage, "RouterRemoved")
        .withArgs(uniswapRouterAddress);
      
      expect(await arbitrage.authorizedRouters(uniswapRouterAddress)).to.be.false;
    });
    
    it("should not allow non-owners to add routers", async function() {
      const routerAddress = ethers.Wallet.createRandom().address;
      
      await expect(
        arbitrage.connect(user).addRouter(routerAddress, "NewDEX")
      ).to.be.revertedWithCustomError(arbitrage, "OwnableUnauthorizedAccount");
    });
    
    it("should not allow non-owners to remove routers", async function() {
      await expect(
        arbitrage.connect(user).removeRouter(await uniswapRouter.getAddress())
      ).to.be.revertedWithCustomError(arbitrage, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Vault Management", function() {
    it("should allow owner to update vault address", async function() {
      const newVaultAddress = ethers.Wallet.createRandom().address;
      
      await arbitrage.updateVaultAddress(newVaultAddress);
      
      expect(await arbitrage.vault()).to.equal(newVaultAddress);
    });
    
    it("should not allow non-owners to update vault address", async function() {
      const newVaultAddress = ethers.Wallet.createRandom().address;
      
      await expect(
        arbitrage.connect(user).updateVaultAddress(newVaultAddress)
      ).to.be.revertedWithCustomError(arbitrage, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Token Recovery", function() {
    it("should allow owner to recover tokens", async function() {
      // Send tokens to the contract
      const amount = ethers.parseUnits("5", 18);
      await weth.mint(await arbitrage.getAddress(), amount);
      
      // Check initial balances
      expect(await weth.balanceOf(await arbitrage.getAddress())).to.equal(amount);
      expect(await weth.balanceOf(await owner.getAddress())).to.equal(0);
      
      // Recover tokens
      await arbitrage.recoverToken(await weth.getAddress());
      
      // Check balances after recovery
      expect(await weth.balanceOf(await arbitrage.getAddress())).to.equal(0);
      expect(await weth.balanceOf(await owner.getAddress())).to.equal(amount);
    });
    
    it("should revert if there are no tokens to recover", async function() {
      await expect(
        arbitrage.recoverToken(await weth.getAddress())
      ).to.be.revertedWith("No tokens to recover");
    });
    
    it("should not allow non-owners to recover tokens", async function() {
      // Send tokens to the contract
      await weth.mint(await arbitrage.getAddress(), ethers.parseUnits("5", 18));
      
      await expect(
        arbitrage.connect(user).recoverToken(await weth.getAddress())
      ).to.be.revertedWithCustomError(arbitrage, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Trade Execution", function() {
    it("should only allow the owner to execute trades", async function() {
      await expect(
        arbitrage.connect(user).executeTrade(
          await uniswapRouter.getAddress(),
          await sushiswapRouter.getAddress(),
          await weth.getAddress(),
          await usdc.getAddress(),
          ethers.parseUnits("1", 18)
        )
      ).to.be.revertedWithCustomError(arbitrage, "OwnableUnauthorizedAccount");
    });
    
    it("should verify that routers are authorized", async function() {
      // Remove authorization for Uniswap router
      await arbitrage.removeRouter(await uniswapRouter.getAddress());
      
      await expect(
        arbitrage.executeTrade(
          await uniswapRouter.getAddress(),
          await sushiswapRouter.getAddress(),
          await weth.getAddress(),
          await usdc.getAddress(),
          ethers.parseUnits("1", 18)
        )
      ).to.be.revertedWith("Buy router not authorized");
      
      // Restore authorization for Uniswap and remove for Sushiswap
      await arbitrage.addRouter(await uniswapRouter.getAddress(), "Uniswap");
      await arbitrage.removeRouter(await sushiswapRouter.getAddress());
      
      await expect(
        arbitrage.executeTrade(
          await uniswapRouter.getAddress(),
          await sushiswapRouter.getAddress(),
          await weth.getAddress(),
          await usdc.getAddress(),
          ethers.parseUnits("1", 18)
        )
      ).to.be.revertedWith("Sell router not authorized");
      
      // Restore authorization for Sushiswap
      await arbitrage.addRouter(await sushiswapRouter.getAddress(), "Sushiswap");
    });
    
    // Note: Testing the actual flash loan execution would require mocking the receiveFlashLoan function
    // and is complex due to the callback nature of flash loans. This would be better tested with
    // a full integration test on a fork of mainnet or in a simulated environment like Foundry.
  });
});