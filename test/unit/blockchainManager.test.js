// test/unit/blockchainManager.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const blockchainManager = require('../../blockchainManager');
const db = require('../../db');
const ethers = require('ethers');

describe('BlockchainManager', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Mock the database
    sandbox.stub(db, 'initialize').resolves();
    sandbox.stub(db, 'getBlockchains').resolves([
      { id: 1, name: 'Ethereum', chain_id: 1, rpc_url: 'https://example.com', ws_url: 'wss://example.com' }
    ]);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('initialize()', () => {
    it('should initialize the blockchain manager', async () => {
      // Mock provider
      sandbox.stub(ethers, 'WebSocketProvider').returns({});
      
      await blockchainManager.initialize();
      
      expect(db.initialize.calledOnce).to.be.true;
      expect(db.getBlockchains.calledOnce).to.be.true;
      expect(blockchainManager.initialized).to.be.true;
    });
    
    it('should handle initialization failure gracefully', async () => {
      // Force an error
      sandbox.stub(ethers, 'WebSocketProvider').throws(new Error('Connection failed'));
      
      try {
        await blockchainManager.initialize();
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Connection failed');
      }
    });
  });
  
  describe('getProvider()', () => {
    it('should return an existing provider if available', async () => {
      // Set up a mock provider
      const mockProvider = { getBlockNumber: sandbox.stub().resolves(1000) };
      blockchainManager.providers = { 1: mockProvider };
      
      const provider = await blockchainManager.getProvider(1);
      
      expect(provider).to.equal(mockProvider);
    });
    
    it('should initialize a new provider if not available', async () => {
      // Reset providers
      blockchainManager.providers = {};
      
      // Mock getBlockchainById
      sandbox.stub(db, 'getBlockchainById').resolves({
        id: 1, 
        name: 'Ethereum', 
        chain_id: 1, 
        rpc_url: 'https://example.com', 
        ws_url: 'wss://example.com'
      });
      
      // Mock provider
      const mockProvider = { getBlockNumber: sandbox.stub().resolves(1000) };
      sandbox.stub(ethers, 'WebSocketProvider').returns(mockProvider);
      
      const provider = await blockchainManager.getProvider(1);
      
      expect(provider).to.equal(mockProvider);
      expect(db.getBlockchainById.calledWith(1)).to.be.true;
    });
  });
  
  // Add more tests for other methods...
});

// test/unit/db.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../../db');
const sqlite = require('sqlite');
const fs = require('fs');
const path = require('path');

describe('Database', () => {
  let sandbox;
  let mockDb;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Create a mock DB object
    mockDb = {
      run: sandbox.stub().resolves({ lastID: 1 }),
      get: sandbox.stub().resolves({}),
      all: sandbox.stub().resolves([]),
      exec: sandbox.stub().resolves()
    };
    
    // Mock SQLite open
    sandbox.stub(sqlite, 'open').resolves(mockDb);
    
    // Mock fs
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'mkdirSync');
    sandbox.stub(fs, 'readFileSync').returns('-- SQL Schema');
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('initialize()', () => {
    it('should open the database connection', async () => {
      await db.initialize();
      
      expect(sqlite.open.calledOnce).to.be.true;
      expect(db.db).to.equal(mockDb);
    });
    
    it('should create data directory if it does not exist', async () => {
      fs.existsSync.returns(false);
      
      await db.initialize();
      
      expect(fs.mkdirSync.calledOnce).to.be.true;
    });
    
    it('should initialize the schema if database is empty', async () => {
      mockDb.all.resolves([]);
      
      await db.initialize();
      
      expect(fs.readFileSync.calledOnce).to.be.true;
      expect(mockDb.exec.calledOnce).to.be.true;
    });
  });
  
  describe('getBlockchains()', () => {
    it('should return all blockchains when activeOnly is false', async () => {
      const mockBlockchains = [
        { id: 1, name: 'Ethereum' },
        { id: 2, name: 'Polygon', is_active: 0 }
      ];
      mockDb.all.resolves(mockBlockchains);
      
      db.db = mockDb;
      const result = await db.getBlockchains(false);
      
      expect(result).to.deep.equal(mockBlockchains);
      expect(mockDb.all.calledWith('SELECT * FROM blockchains')).to.be.true;
    });
    
    it('should return only active blockchains when activeOnly is true', async () => {
      const mockBlockchains = [
        { id: 1, name: 'Ethereum', is_active: 1 }
      ];
      mockDb.all.resolves(mockBlockchains);
      
      db.db = mockDb;
      const result = await db.getBlockchains(true);
      
      expect(result).to.deep.equal(mockBlockchains);
      expect(mockDb.all.calledWith('SELECT * FROM blockchains WHERE is_active = 1')).to.be.true;
    });
  });
  
  // Add more tests for other DB methods...
});

// test/unit/multiChainBot.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const arbitrageBot = require('../../multiChainBot');
const blockchainManager = require('../../blockchainManager');
const db = require('../../db');
const ethers = require('ethers');
const Big = require('big.js');

describe('ArbitrageBot', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock dependencies
    sandbox.stub(db, 'initialize').resolves();
    sandbox.stub(blockchainManager, 'initialize').resolves();
    sandbox.stub(db, 'getConfig').callsFake(async (name) => {
      const configs = {
        'gas_limit_multiplier': '1.1',
        'min_profit_threshold': '0.1',
        'execution_enabled': 'false'
      };
      return configs[name] || null;
    });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('initialize()', () => {
    it('should initialize the arbitrage bot with correct config', async () => {
      await arbitrageBot.initialize();
      
      expect(db.initialize.calledOnce).to.be.true;
      expect(blockchainManager.initialize.calledOnce).to.be.true;
      expect(arbitrageBot.gasLimitMultiplier).to.equal(1.1);
      expect(arbitrageBot.minProfitThreshold).to.equal(0.1);
      expect(arbitrageBot.executionEnabled).to.be.false;
    });
  });
  
  describe('startMonitoring()', () => {
    beforeEach(async () => {
      // Initialize the bot
      await arbitrageBot.initialize();
      
      // Mock getTokenPairs
      sandbox.stub(db, 'getTokenPairs').resolves([
        { 
          id: 1, 
          blockchain_id: 1, 
          token0_id: 1, 
          token1_id: 2,
          token0_address: '0x111',
          token1_address: '0x222',
          token0_symbol: 'WETH',
          token1_symbol: 'USDC'
        }
      ]);
      
      // Mock getDexes
      sandbox.stub(db, 'getDexes').resolves([
        { id: 1, name: 'Uniswap' },
        { id: 2, name: 'Sushiswap' }
      ]);
      
      // Mock getPairContract
      sandbox.stub(blockchainManager, 'getPairContract').resolves({
        getAddress: sandbox.stub().resolves('0xpair'),
        on: sandbox.stub()
      });
      
      // Mock monitorSwapEvents
      sandbox.stub(blockchainManager, 'monitorSwapEvents').resolves('listener-key');
    });
    
    it('should set up monitoring for all active token pairs', async () => {
      await arbitrageBot.startMonitoring();
      
      expect(db.getTokenPairs.calledOnce).to.be.true;
      expect(db.getDexes.calledOnce).to.be.true;
      expect(blockchainManager.getPairContract.calledTwice).to.be.true;
      expect(blockchainManager.monitorSwapEvents.calledTwice).to.be.true;
      
      // Check that activeMonitors was populated
      expect(arbitrageBot.activeMonitors[1][1][1]).to.exist;
      expect(arbitrageBot.activeMonitors[1][1][2]).to.exist;
    });
    
    it('should skip token pairs with less than 2 DEXes', async () => {
      // Change getDexes to return only one DEX
      db.getDexes.resolves([{ id: 1, name: 'Uniswap' }]);
      
      await arbitrageBot.startMonitoring();
      
      expect(blockchainManager.getPairContract.called).to.be.false;
      expect(blockchainManager.monitorSwapEvents.called).to.be.false;
    });
  });
  
  describe('findArbitrageOpportunity()', () => {
    beforeEach(async () => {
      // Initialize the bot
      await arbitrageBot.initialize();
      
      // Mock checkPrices
      sandbox.stub(arbitrageBot, 'checkPrices').resolves([
        { 
          dexId: 1, 
          dex: { id: 1, name: 'Uniswap' }, 
          price: Big('1000'), 
          pairContract: {} 
        },
        { 
          dexId: 2, 
          dex: { id: 2, name: 'Sushiswap' }, 
          price: Big('1020'), 
          pairContract: {} 
        }
      ]);
      
      // Mock token pair
      sandbox.stub(db, 'getTokenPairs').callsFake(async () => {
        return [{
          id: 1,
          blockchain_id: 1,
          token0_symbol: 'WETH',
          token1_symbol: 'USDC',
          min_price_difference: 1.0
        }];
      });
    });
    
    it('should identify arbitrage opportunity when price difference exceeds threshold', async () => {
      const opportunity = await arbitrageBot.findArbitrageOpportunity(1, 1);
      
      expect(opportunity).to.exist;
      expect(opportunity.buyDex.name).to.equal('Uniswap');
      expect(opportunity.sellDex.name).to.equal('Sushiswap');
      expect(opportunity.priceDifference).to.be.closeTo(2.0, 0.01);
    });
    
    it('should return null when price difference is below threshold', async () => {
      // Update token pair to have higher threshold
      db.getTokenPairs.resolves([{
        id: 1,
        blockchain_id: 1,
        token0_symbol: 'WETH',
        token1_symbol: 'USDC',
        min_price_difference: 3.0
      }]);
      
      const opportunity = await arbitrageBot.findArbitrageOpportunity(1, 1);
      
      expect(opportunity).to.be.null;
    });
  });
  
  // Add more tests for other methods...
});

// test/unit/helpers.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const ethers = require('ethers');
const {
  getTokenAndContract,
  getPairAddress,
  getPairContract,
  getReserves,
  calculatePrice,
  calculateDifference,
  simulate
} = require('../../helpers/helpers');

describe('Helper Functions', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('getTokenAndContract()', () => {
    it('should return token contracts and details', async () => {
      // Mock token contracts
      const mockToken0Contract = {
        symbol: sandbox.stub().resolves('WETH'),
        name: sandbox.stub().resolves('Wrapped Ether')
      };
      
      const mockToken1Contract = {
        symbol: sandbox.stub().resolves('USDC'),
        name: sandbox.stub().resolves('USD Coin')
      };
      
      // Mock ethers.Contract
      sandbox.stub(ethers, 'Contract')
        .onFirstCall().returns(mockToken0Contract)
        .onSecondCall().returns(mockToken1Contract);
      
      const mockProvider = {};
      const token0Address = '0x111';
      const token1Address = '0x222';
      
      const result = await getTokenAndContract(token0Address, token1Address, mockProvider);
      
      expect(result.token0Contract).to.equal(mockToken0Contract);
      expect(result.token1Contract).to.equal(mockToken1Contract);
      expect(result.token0.symbol).to.equal('WETH');
      expect(result.token1.symbol).to.equal('USDC');
      expect(result.token0.address).to.equal(token0Address);
      expect(result.token1.address).to.equal(token1Address);
    });
  });
  
  describe('calculatePrice()', () => {
    it('should calculate token price correctly', async () => {
      // Mock pair contract with reserves
      const mockPairContract = {
        getReserves: sandbox.stub().resolves({
          reserve0: ethers.parseUnits('100', 18),
          reserve1: ethers.parseUnits('120000', 6)
        })
      };
      
      // Mock getReserves to use our mock contract
      sandbox.stub({ getReserves }).resolves([
        ethers.parseUnits('100', 18),
        ethers.parseUnits('120000', 6)
      ]);
      
      const price = await calculatePrice(mockPairContract);
      
      // WETH/USDC price should be approximately 1200
      expect(parseFloat(price.toString())).to.be.closeTo(0.000833, 0.0001);
    });
  });
  
  describe('simulate()', () => {
    it('should correctly simulate a trade path', async () => {
      // Mock routers
      const mockRouterPath = [
        {
          getAmountsOut: sandbox.stub().resolves([
            ethers.parseUnits('1', 18),
            ethers.parseUnits('1200', 6)
          ])
        },
        {
          getAmountsOut: sandbox.stub().resolves([
            ethers.parseUnits('1200', 6),
            ethers.parseUnits('1.01', 18)
          ])
        }
      ];
      
      const mockToken0 = { address: '0x111' };
      const mockToken1 = { address: '0x222' };
      
      const result = await simulate(
        ethers.parseUnits('1', 18),
        mockRouterPath,
        mockToken0,
        mockToken1
      );
      
      expect(parseFloat(result.amountIn)).to.equal(1);
      expect(parseFloat(result.amountOut)).to.be.closeTo(1.01, 0.001);
    });
  });
  
  // Add more tests for other helper functions...
});
