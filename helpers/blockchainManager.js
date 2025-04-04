// blockchainManager.js
const ethers = require('ethers');
const db = require('../database/db');
const IUniswapV2Router02 = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');
const IUniswapV2Factory = require('@uniswap/v2-core/build/IUniswapV2Factory.json');
const IERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const IArbitrage = require('../artifacts/contracts/Arbitrage.sol/Arbitrage.json');

// Memory cache for providers and contracts
let providers = {};
let contracts = {};
let eventListeners = {};

class BlockchainManager {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Ensure DB is initialized
        await db.initialize();
        
        // Initialize providers for all active blockchains
        const blockchains = await db.getBlockchains(true);
        
        for (const blockchain of blockchains) {
            await this.initProvider(blockchain);
        }
        
        this.initialized = true;
        return this;
    }

    async initProvider(blockchain) {
        const { id, chain_id, ws_url, rpc_url } = blockchain;
        
        try {
            // Prefer WebSocket providers for event handling
            if (ws_url) {
                providers[id] = new ethers.WebSocketProvider(
                    this._replaceEnvVars(ws_url)
                );
            } else {
                providers[id] = new ethers.JsonRpcProvider(
                    this._replaceEnvVars(rpc_url)
                );
            }
            
            // Initialize contracts cache for this blockchain
            contracts[id] = {};
            
            console.log(`Initialized provider for ${blockchain.name} (Chain ID: ${chain_id})`);
            return providers[id];
        } catch (error) {
            console.error(`Failed to initialize provider for ${blockchain.name}:`, error);
            throw error;
        }
    }

    async getProvider(blockchainId) {
        if (!providers[blockchainId]) {
            const blockchain = await db.getBlockchainById(blockchainId);
            if (!blockchain) {
                throw new Error(`Blockchain with ID ${blockchainId} not found`);
            }
            await this.initProvider(blockchain);
        }
        return providers[blockchainId];
    }

    async getArbitrageContract(blockchainId, contractId) {
        const key = `arbitrage_${contractId}`;
        
        if (!contracts[blockchainId]?.[key]) {
            const contract = await db.getArbitrageContractById(contractId);
            if (!contract) {
                throw new Error(`Arbitrage contract with ID ${contractId} not found`);
            }
            
            const provider = await this.getProvider(blockchainId);
            contracts[blockchainId][key] = new ethers.Contract(
                contract.address,
                IArbitrage.abi,
                provider
            );
        }
        
        return contracts[blockchainId][key];
    }

    async getDexContracts(blockchainId, dexId) {
        const routerKey = `router_${dexId}`;
        const factoryKey = `factory_${dexId}`;
        
        if (!contracts[blockchainId]?.[routerKey] || !contracts[blockchainId]?.[factoryKey]) {
            const dex = await db.getDexById(dexId);
            if (!dex) {
                throw new Error(`DEX with ID ${dexId} not found`);
            }
            
            const provider = await this.getProvider(blockchainId);
            
            // Initialize router
            contracts[blockchainId][routerKey] = new ethers.Contract(
                dex.router_address,
                IUniswapV2Router02.abi,
                provider
            );
            
            // Initialize factory
            contracts[blockchainId][factoryKey] = new ethers.Contract(
                dex.factory_address,
                IUniswapV2Factory.abi,
                provider
            );
        }
        
        return {
            router: contracts[blockchainId][routerKey],
            factory: contracts[blockchainId][factoryKey]
        };
    }

    async getTokenContract(blockchainId, tokenId) {
        const key = `token_${tokenId}`;
        
        if (!contracts[blockchainId]?.[key]) {
            const token = await db.getTokenById(tokenId);
            if (!token) {
                throw new Error(`Token with ID ${tokenId} not found`);
            }
            
            const provider = await this.getProvider(blockchainId);
            contracts[blockchainId][key] = new ethers.Contract(
                token.address,
                IERC20.abi,
                provider
            );
        }
        
        return contracts[blockchainId][key];
    }

    async getTokenByAddress(blockchainId, address) {
        const key = `token_address_${address.toLowerCase()}`;
        
        if (!contracts[blockchainId]?.[key]) {
            const provider = await this.getProvider(blockchainId);
            contracts[blockchainId][key] = new ethers.Contract(
                address,
                IERC20.abi,
                provider
            );
        }
        
        return contracts[blockchainId][key];
    }

    async getPairContract(blockchainId, dexId, token0Address, token1Address) {
        const key = `pair_${dexId}_${token0Address}_${token1Address}`.toLowerCase();
        
        if (!contracts[blockchainId]?.[key]) {
            const { factory } = await this.getDexContracts(blockchainId, dexId);
            const pairAddress = await factory.getPair(token0Address, token1Address);
            
            if (pairAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error(`No pair exists for tokens ${token0Address} and ${token1Address} on DEX ${dexId}`);
            }
            
            const provider = await this.getProvider(blockchainId);
            const IUniswapV2Pair = require('@uniswap/v2-core/build/IUniswapV2Pair.json');
            
            contracts[blockchainId][key] = new ethers.Contract(
                pairAddress,
                IUniswapV2Pair.abi,
                provider
            );
        }
        
        return contracts[blockchainId][key];
    }

    async monitorSwapEvents(blockchainId, pairContract, tokenPairId, dexId, callback) {
        const listenerKey = `${blockchainId}_${await pairContract.getAddress()}_${dexId}_${tokenPairId}`;
        
        // Remove existing listener if there is one
        this.removeSwapEventListener(listenerKey);
        
        console.log(`Setting up swap event monitoring for ${await pairContract.getAddress()} on DEX ${dexId}`);
        
        // Set up new listener
        const listener = async (...args) => {
            try {
                await callback(blockchainId, tokenPairId, dexId, ...args);
            } catch (error) {
                console.error(`Error in swap event callback for ${listenerKey}:`, error);
            }
        };
        
        // Register the listener
        pairContract.on('Swap', listener);
        
        // Store reference to the listener for later removal
        eventListeners[listenerKey] = { contract: pairContract, event: 'Swap', listener };
        
        return listenerKey;
    }

    removeSwapEventListener(listenerKey) {
        const listener = eventListeners[listenerKey];
        if (listener) {
            listener.contract.off(listener.event, listener.listener);
            delete eventListeners[listenerKey];
            console.log(`Removed swap event listener for ${listenerKey}`);
        }
    }

    removeAllEventListeners() {
        for (const key in eventListeners) {
            this.removeSwapEventListener(key);
        }
    }

    // Helper method to sign transactions with a private key
    async getSigner(blockchainId, privateKey) {
        const provider = await this.getProvider(blockchainId);
        return new ethers.Wallet(privateKey, provider);
    }

    // Replace environment variables in URLs
    _replaceEnvVars(url) {
        return url.replace(/\${(.+?)}/g, (match, p1) => process.env[p1] || match);
    }

    // Close all providers when shutting down
    async closeAll() {
        this.removeAllEventListeners();
        
        for (const blockchainId in providers) {
            const provider = providers[blockchainId];
            if (provider && typeof provider.destroy === 'function') {
                await provider.destroy();
            }
        }
        
        providers = {};
        contracts = {};
        this.initialized = false;
        
        console.log('All blockchain connections closed');
    }
}

// Export a singleton instance
const blockchainManager = new BlockchainManager();
module.exports = blockchainManager;
