// test/integration/system.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const ethers = require('ethers');
const arbitrageBot = require('../../multiChainBot');
const blockchainManager = require('../../blockchainManager');
const db = require('../../db');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

describe('System Integration Tests', function() {
  // These tests might take longer
  this.timeout(10000);
  
  let sandbox;
  let testDbPath;
  
  before(async () => {
    // Create a test database
    testDbPath = path.join(__dirname, '../temp/test.db');
    
    // Ensure directory exists
    const dir = path.dirname(testDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Remove existing test DB if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Override DB path
    Object.defineProperty(db, 'dbPath', {
      value: testDbPath
    });
    
    // Initialize database
    await db.initialize();
    
    // Load test schema
    const schemaPath = path.join(__dirname, '../../schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema (this creates tables and test data)
    await db.db.exec(schema);
  });
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock ethers providers to avoid actual RPC calls
    sandbox.stub(ethers, 'WebSocketProvider').returns({
      getBlockNumber: sandbox.stub().resolves(1000),
      getBalance: sandbox.stub().resolves(ethers.parseEther('10')),
      getFeeData: sandbox.stub().resolves({
        gasPrice: ethers.parseUnits('50', 'gwei')
      })
    });
    
    sandbox.stub(ethers, 'JsonRpcProvider').returns({
      getBlockNumber: sandbox.stub().resolves(1000),
      getBalance: sandbox.stub().resolves(ethers.parseEther('10')),
      getFeeData: sandbox.stub().resolves({
        gasPrice: ethers.parseUnits('50', 'gwei')
      })
    });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  after(async () => {
    // Clean up
    try {
      await blockchainManager.closeAll();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });
  
  describe('End-to-End Bot Initialization and Monitoring', () => {
    it('should initialize the system and start monitoring', async () => {
      // Mock contract methods to avoid real blockchain calls
      const mockPairContract = {
        getAddress: sandbox.stub().resolves('0xpair'),
        on: sandbox.stub(),
        getReserves: sandbox.stub().resolves({
          reserve0: ethers.parseUnits('100', 18),
          reserve1: ethers.parseUnits('120000', 6)
        })
      };
      
      sandbox.stub(blockchainManager, 'getPairContract').resolves(mockPairContract);
      
      // Mock router contract methods
      const mockRouterContract = {
        getAddress: sandbox.stub().resolves('0xrouter'),
        getAmountsIn: sandbox.stub().resolves([
          ethers.parseUnits('1', 18),
          ethers.parseUnits('1200', 6)
        ]),
        getAmountsOut: sandbox.stub().resolves([
          ethers.parseUnits('1200', 6),
          ethers.parseUnits('1.01', 18)
        ])
      };
      
      sandbox.stub(blockchainManager, 'getDexContracts').resolves({
        router: mockRouterContract,
        factory: {
          getPair: sandbox.stub().resolves('0xpair')
        }
      });
      
      // Mock token contracts
      const mockTokenContract = {
        getAddress: sandbox.stub().resolves('0xtoken'),
        balanceOf: sandbox.stub().resolves(ethers.parseUnits('1000', 18))
      };
      
      sandbox.stub(blockchainManager, 'getTokenByAddress').resolves(mockTokenContract);
      
      // Initialize the system
      await arbitrageBot.initialize();
      
      // Start monitoring
      await arbitrageBot.startMonitoring();
      
      // Verify that monitoring is set up
      expect(blockchainManager.getPairContract.called).to.be.true;
      expect(mockPairContract.on.called).to.be.true;
      
      // Ensure we have active monitors
      expect(Object.keys(arbitrageBot.activeMonitors).length).to.be.greaterThan(0);
    });
  });
  
  describe('Price Calculation', () => {
    it('should correctly calculate price differences between DEXes', async () => {
      // Set up mock pair contracts with different prices
      const uniswapPair = {
        getAddress: sandbox.stub().resolves('0xunipair'),
        getReserves: sandbox.stub().resolves({
          reserve0: ethers.parseUnits('100', 18),
          reserve1: ethers.parseUnits('120000', 6)
        })
      };
      
      const sushiswapPair = {
        getAddress: sandbox.stub().resolves('0xsushipair'),
        getReserves: sandbox.stub().resolves({
          reserve0: ethers.parseUnits('100', 18),
          reserve1: ethers.parseUnits('123000', 6)
        })
      };
      
      // Mock active monitors
      arbitrageBot.activeMonitors = {
        1: {
          1: {
            1: { pairContract: uniswapPair },
            2: { pairContract: sushiswapPair }
          }
        }
      };
      
      // Get DEX info
      sandbox.stub(db, 'getDexById')
        .withArgs(1).resolves({ id: 1, name: 'Uniswap' })
        .withArgs(2).resolves({ id: 2, name: 'Sushiswap' });
      
      // Get token pair info
      sandbox.stub(db, 'getTokenPairs').resolves([{
        id: 1,
        blockchain_id: 1,
        token0_id: 1,
        token1_id: 2,
        token0_symbol: 'WETH',
        token1_symbol: 'USDC',
        min_price_difference: 1.0
      }]);
      
      // Mock logging
      sandbox.stub(db, 'logPrice').resolves();
      
      // Check prices
      const prices = await arbitrageBot.checkPrices(1, 1);
      
      // Verify prices were calculated
      expect(prices.length).to.equal(2);
      
      // Calculate the expected price difference (about 2.5%)
      const uniPrice = parseFloat(prices[0].price);
      const sushiPrice = parseFloat(prices[1].price);
      const priceDiff = Math.abs((sushiPrice - uniPrice) / uniPrice * 100);
      
      expect(priceDiff).to.be.closeTo(2.5, 0.1);
      
      // Now try to find an arbitrage opportunity
      const opportunity = await arbitrageBot.findArbitrageOpportunity(1, 1);
      
      expect(opportunity).to.exist;
      expect(opportunity.priceDifference).to.be.closeTo(priceDiff, 0.1);
      
      // The buy should be on the cheaper exchange (Uniswap in this case)
      expect(opportunity.buyDex.name).to.equal('Uniswap');
      expect(opportunity.sellDex.name).to.equal('Sushiswap');
    });
  });
  
  describe('Profitability Calculation', () => {
    beforeEach(async () => {
      // Initialize the bot
      await arbitrageBot.initialize();
      
      // Mock token pair
      sandbox.stub(db, 'getTokenPairs').resolves([{
        id: 1,
        blockchain_id: 1,
        token0_id: 1,
        token1_id: 2,
        token0_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        token1_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        token0_symbol: 'WETH',
        token1_symbol: 'USDC',
        min_price_difference: 1.0
      }]);
      
      // Mock blockchain
      sandbox.stub(db, 'getBlockchainById').resolves({
        id: 1,
        name: 'Ethereum',
        native_token: 'ETH'
      });
      
      // Mock token contracts
      const mockToken0Contract = {
        getAddress: sandbox.stub().resolves('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
        balanceOf: sandbox.stub().resolves(ethers.parseUnits('1000', 18))
      };
      
      const mockToken1Contract = {
        getAddress: sandbox.stub().resolves('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
        balanceOf: sandbox.stub().resolves(ethers.parseUnits('1000000', 6))
      };
      
      sandbox.stub(blockchainManager, 'getTokenByAddress')
        .withArgs(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2').resolves(mockToken0Contract)
        .withArgs(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48').resolves(mockToken1Contract);
      
      // Mock pair contracts
      const uniswapPair = {
        getAddress: sandbox.stub().resolves('0xunipair'),
        getReserves: sandbox.stub().resolves({
          reserve0: ethers.parseUnits('100', 18),
          reserve1: ethers.parseUnits('120000', 6)
        })
      };
      
      const sushiswapPair = {
        getAddress: sandbox.stub().resolves('0xsushipair'),
        getReserves: sandbox.stub().resolves({
          reserve0: ethers.parseUnits('100', 18),
          reserve1: ethers.parseUnits('123000', 6)
        })
      };
      
      // Mock router contracts
      const uniswapRouter = {
        getAddress: sandbox.stub().resolves('0xunirouter'),
        getAmountsIn: sandbox.stub().resolves([
          ethers.parseUnits('1', 18),
          ethers.parseUnits('1200', 6)
        ]),
        getAmountsOut: sandbox.stub().resolves([
          ethers.parseUnits('1200', 6),
          ethers.parseUnits('1.01', 18)
        ])
      };
      
      const sushiswapRouter = {
        getAddress: sandbox.stub().resolves('0xsushirouter'),
        getAmountsIn: sandbox.stub().resolves([
          ethers.parseUnits('1', 18),
          ethers.parseUnits('1200', 6)
        ]),
        getAmountsOut: sandbox.stub().resolves([
          ethers.parseUnits('1200', 6),
          ethers.parseUnits('1.02', 18)
        ])
      };
      
      // Mock DEX contracts
      sandbox.stub(blockchainManager, 'getDexContracts')
        .withArgs(1, 1).resolves({ router: uniswapRouter, factory: {} })
        .withArgs(1, 2).resolves({ router: sushiswapRouter, factory: {} });
      
      // Mock config
      sandbox.stub(db, 'getConfig').callsFake(async (name) => {
        const configs = {
          'default_gas_limit': '400000',
          'min_profit_threshold': '0.1'
        };
        return configs[name] || null;
      });
    });
    
    it('should calculate profitability correctly for a potential arbitrage', async () => {
      // Create an arbitrage opportunity
      const opportunity = {
        buyDex: { id: 1, name: 'Uniswap' },
        sellDex: { id: 2, name: 'Sushiswap' },
        buyPairContract: {
          getReserves: sandbox.stub().resolves({
            reserve0: ethers.parseUnits('100', 18),
            reserve1: ethers.parseUnits('120000', 6)
          })
        },
        sellPairContract: {
          getReserves: sandbox.stub().resolves({
            reserve0: ethers.parseUnits('100', 18),
            reserve1: ethers.parseUnits('123000', 6)
          })
        },
        priceDifference: 2.5,
        estimatedProfit: 2.5,
        amountIn: ethers.parseUnits('1', 18)
      };
      
      // Check profitability
      const isProfitable = await arbitrageBot.checkProfitability(1, 1, opportunity);
      
      // Since we've mocked the router to give a 1% return (amountOut > amountIn),
      // this should be profitable
      expect(isProfitable).to.be.true;
      
      // The opportunity should now have more accurate profit estimates
      expect(opportunity.netProfit).to.exist;
      expect(opportunity.gasCost).to.exist;
      expect(opportunity.estimatedProfit).to.be.greaterThan(0);
    });
    
    it('should handle unprofitable opportunities', async () => {
      // Update the mock router to return less than we put in
      const uniswapRouter = {
        getAddress: sandbox.stub().resolves('0xunirouter'),
        getAmountsIn: sandbox.stub().resolves([
          ethers.parseUnits('1', 18),
          ethers.parseUnits('1200', 6)
        ]),
        getAmountsOut: sandbox.stub().resolves([
          ethers.parseUnits('1200', 6),
          ethers.parseUnits('0.99', 18) // Return less than we put in
        ])
      };
      
      blockchainManager.getDexContracts
        .withArgs(1, 1).resolves({ router: uniswapRouter, factory: {} });
      
      // Create an arbitrage opportunity
      const opportunity = {
        buyDex: { id: 1, name: 'Uniswap' },
        sellDex: { id: 2, name: 'Sushiswap' },
        buyPairContract: {
          getReserves: sandbox.stub().resolves({
            reserve0: ethers.parseUnits('100', 18),
            reserve1: ethers.parseUnits('120000', 6)
          })
        },
        sellPairContract: {
          getReserves: sandbox.stub().resolves({
            reserve0: ethers.parseUnits('100', 18),
            reserve1: ethers.parseUnits('123000', 6)
          })
        },
        priceDifference: 2.5,
        estimatedProfit: 2.5,
        amountIn: ethers.parseUnits('1', 18)
      };
      
      // Check profitability
      const isProfitable = await arbitrageBot.checkProfitability(1, 1, opportunity);
      
      // This should not be profitable since we get less back than we put in
      expect(isProfitable).to.be.false;
    });
  });
  
  describe('Swap Event Handling', () => {
    beforeEach(async () => {
      // Initialize the bot
      await arbitrageBot.initialize();
      
      // Mock methods to avoid real calls
      sandbox.stub(arbitrageBot, 'checkPrices').resolves([
        { 
          dexId: 1, 
          dex: { id: 1, name: 'Uniswap' }, 
          price: new Big('0.000833'), 
          pairContract: {} 
        },
        { 
          dexId: 2, 
          dex: { id: 2, name: 'Sushiswap' }, 
          price: new Big('0.000854'), 
          pairContract: {} 
        }
      ]);
      
      sandbox.stub(arbitrageBot, 'findArbitrageOpportunity').resolves({
        buyDex: { id: 1, name: 'Uniswap' },
        sellDex: { id: 2, name: 'Sushiswap' },
        priceDifference: 2.5,
        estimatedProfit: 2.5,
        amountIn: ethers.parseUnits('1', 18)
      });
      
      sandbox.stub(arbitrageBot, 'checkProfitability').resolves(true);
      sandbox.stub(arbitrageBot, 'executeTrade').resolves();
      
      // Mock token pair
      sandbox.stub(db, 'getTokenPairs').resolves([{
        id: 1,
        blockchain_id: 1,
        token0_id: 1,
        token1_id: 2,
        token0_symbol: 'WETH',
        token1_symbol: 'USDC',
        min_price_difference: 1.0
      }]);
      
      // Mock DEX
      sandbox.stub(db, 'getDexById').resolves({ id: 1, name: 'Uniswap' });
    });
    
    it('should handle swap events and check for arbitrage opportunities', async () => {
      // Trigger a swap event
      await arbitrageBot.handleSwapEvent(1, 1, 1, 'event args');
      
      // Verify the flow was followed
      expect(arbitrageBot.checkPrices.calledWith(1, 1)).to.be.true;
      expect(arbitrageBot.findArbitrageOpportunity.calledWith(1, 1)).to.be.true;
      expect(arbitrageBot.checkProfitability.called).to.be.true;
      
      // Execution should not happen because executionEnabled is false by default
      expect(arbitrageBot.executeTrade.called).to.be.false;
      
      // The opportunity should be in the list
      expect(arbitrageBot.arbitrageOpportunities.length).to.equal(1);
    });
    
    it('should execute trades when execution is enabled', async () => {
      // Enable execution
      arbitrageBot.executionEnabled = true;
      
      // Trigger a swap event
      await arbitrageBot.handleSwapEvent(1, 1, 1, 'event args');
      
      // Verify that execution was triggered
      expect(arbitrageBot.executeTrade.called).to.be.true;
    });
    
    it('should not attempt another arbitrage if already executing', async () => {
      // Set isExecuting flag
      arbitrageBot.isExecuting['1_1'] = true;
      
      // Trigger a swap event
      await arbitrageBot.handleSwapEvent(1, 1, 1, 'event args');
      
      // Verify that no methods were called
      expect(arbitrageBot.checkPrices.called).to.be.false;
      expect(arbitrageBot.findArbitrageOpportunity.called).to.be.false;
      expect(arbitrageBot.checkProfitability.called).to.be.false;
      expect(arbitrageBot.executeTrade.called).to.be.false;
    });
  });
});

// test/integration/smartContract.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Universal Arbitrage Smart Contract', function() {
  let universalArbitrage;
  let owner;
  let user;
  let mockVault;
  let mockRouter1;
  let mockRouter2;
  let mockToken0;
  let mockToken1;
  
  beforeEach(async function() {
    // Get signers
    [owner, user, mockVault] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory('MockERC20');
    mockToken0 = await MockToken.deploy('Wrapped Ether', 'WETH', 18);
    mockToken1 = await MockToken.deploy('USD Coin', 'USDC', 6);
    
    // Deploy mock routers
    const MockRouter = await ethers.getContractFactory('MockUniswapV2Router02');
    mockRouter1 = await MockRouter.deploy();
    mockRouter2 = await MockRouter.deploy();
    
    // Configure mock routers
    await mockRouter1.setTokenSwapRate(
      mockToken0.getAddress(),
      mockToken1.getAddress(),
      ethers.parseUnits('1200', 6) // 1 ETH = 1200 USDC
    );
    
    await mockRouter2.setTokenSwapRate(
      mockToken0.getAddress(),
      mockToken1.getAddress(),
      ethers.parseUnits('1230', 6) // 1 ETH = 1230 USDC (2.5% higher)
    );
    
    // Deploy the Universal Arbitrage contract
    const UniversalArbitrage = await ethers.getContractFactory('UniversalArbitrage');
    universalArbitrage = await UniversalArbitrage.deploy(await mockVault.getAddress());
    
    // Add routers
    await universalArbitrage.addRouter(await mockRouter1.getAddress(), 'Uniswap');
    await universalArbitrage.addRouter(await mockRouter2.getAddress(), 'Sushiswap');
    
    // Fund tokens for testing
    await mockToken0.mint(await mockVault.getAddress(), ethers.parseUnits('1000', 18));
    await mockToken1.mint(await mockRouter1.getAddress(), ethers.parseUnits('1000000', 6));
    await mockToken1.mint(await mockRouter2.getAddress(), ethers.parseUnits('1000000', 6));
  });
  
  describe('Router Management', function() {
    it('should allow owner to add routers', async function() {
      // Add another router
      const tx = await universalArbitrage.addRouter(ethers.ZeroAddress, 'TestDEX');
      
      // Verify router was added
      expect(await universalArbitrage.authorizedRouters(ethers.ZeroAddress)).to.be.true;
      expect(await universalArbitrage.routerNames(ethers.ZeroAddress)).to.equal('TestDEX');
      
      // Verify event was emitted
      await expect(tx).to.emit(universalArbitrage, 'RouterAdded')
        .withArgs(ethers.ZeroAddress, 'TestDEX');
    });
    
    it('should allow owner to remove routers', async function() {
      const routerAddress = await mockRouter1.getAddress();
      const tx = await universalArbitrage.removeRouter(routerAddress);
      
      // Verify router was removed
      expect(await universalArbitrage.authorizedRouters(routerAddress)).to.be.false;
      
      // Verify event was emitted
      await expect(tx).to.emit(universalArbitrage, 'RouterRemoved')
        .withArgs(routerAddress);
    });
    
    it('should not allow non-owners to manage routers', async function() {
      // Connect as non-owner
      const nonOwnerContract = universalArbitrage.connect(user);
      
      // Attempt to add router
      await expect(
        nonOwnerContract.addRouter(ethers.ZeroAddress, 'TestDEX')
      ).to.be.revertedWithCustomError(nonOwnerContract, 'OwnableUnauthorizedAccount');
      
      // Attempt to remove router
      await expect(
        nonOwnerContract.removeRouter(await mockRouter1.getAddress())
      ).to.be.revertedWithCustomError(nonOwnerContract, 'OwnableUnauthorizedAccount');
    });
  });
  
  describe('Vault Management', function() {
    it('should allow owner to update the vault address', async function() {
      const newVaultAddress = await user.getAddress();
      await universalArbitrage.updateVaultAddress(newVaultAddress);
      
      expect(await universalArbitrage.vault()).to.equal(newVaultAddress);
    });
    
    it('should not allow non-owners to update the vault address', async function() {
      const nonOwnerContract = universalArbitrage.connect(user);
      const newVaultAddress = await user.getAddress();
      
      await expect(
        nonOwnerContract.updateVaultAddress(newVaultAddress)
      ).to.be.revertedWithCustomError(nonOwnerContract, 'OwnableUnauthorizedAccount');
    });
  });
  
  describe('Token Recovery', function() {
    it('should allow owner to recover tokens', async function() {
      // Send tokens to the contract
      const amount = ethers.parseUnits('5', 18);
      await mockToken0.mint(await universalArbitrage.getAddress(), amount);
      
      // Recover tokens
      await universalArbitrage.recoverToken(await mockToken0.getAddress());
      
      // Verify tokens were recovered
      expect(await mockToken0.balanceOf(await owner.getAddress())).to.equal(amount);
      expect(await mockToken0.balanceOf(await universalArbitrage.getAddress())).to.equal(0);
    });
    
    it('should not allow recovery if there are no tokens', async function() {
      await expect(
        universalArbitrage.recoverToken(await mockToken0.getAddress())
      ).to.be.revertedWith('No tokens to recover');
    });
    
    it('should not allow non-owners to recover tokens', async function() {
      // Send tokens to the contract
      await mockToken0.mint(await universalArbitrage.getAddress(), ethers.parseUnits('5', 18));
      
      // Attempt to recover tokens as non-owner
      const nonOwnerContract = universalArbitrage.connect(user);
      
      await expect(
        nonOwnerContract.recoverToken(await mockToken0.getAddress())
      ).to.be.revertedWithCustomError(nonOwnerContract, 'OwnableUnauthorizedAccount');
    });
  });
  
  describe('Trade Execution', function() {
    it('should only allow the owner to execute trades', async function() {
      const nonOwnerContract = universalArbitrage.connect(user);
      
      await expect(
        nonOwnerContract.executeTrade(
          await mockRouter1.getAddress(),
          await mockRouter2.getAddress(),
          await mockToken0.getAddress(),
          await mockToken1.getAddress(),
          ethers.parseUnits('1', 18)
        )
      ).to.be.revertedWithCustomError(nonOwnerContract, 'OwnableUnauthorizedAccount');
    });
    
    it('should verify that routers are authorized', async function() {
      // Remove authorization for router1
      await universalArbitrage.removeRouter(await mockRouter1.getAddress());
      
      await expect(
        universalArbitrage.executeTrade(
          await mockRouter1.getAddress(),
          await mockRouter2.getAddress(),
          await mockToken0.getAddress(),
          await mockToken1.getAddress(),
          ethers.parseUnits('1', 18)
        )
      ).to.be.revertedWith('Buy router not authorized');
      
      // Restore authorization for router1 and remove for router2
      await universalArbitrage.addRouter(await mockRouter1.getAddress(), 'Uniswap');
      await universalArbitrage.removeRouter(await mockRouter2.getAddress());
      
      await expect(
        universalArbitrage.executeTrade(
          await mockRouter1.getAddress(),
          await mockRouter2.getAddress(),
          await mockToken0.getAddress(),
          await mockToken1.getAddress(),
          ethers.parseUnits('1', 18)
        )
      ).to.be.revertedWith('Sell router not authorized');
    });
  });
});
    