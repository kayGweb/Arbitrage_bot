// multiChainBot.js
require('dotenv').config();
const ethers = require('ethers');
const Big = require('big.js');

const db = require('./database/db');
const blockchainManager = require('./helpers/blockchainManager');
const { getReserves, calculatePrice, simulate } = require('./helpers/helpers');

// Set Big.js configuration for decimal precision
Big.DP = 18;

class ArbitrageBot {
    constructor() {
        this.isExecuting = {};
        this.activeMonitors = {};
        this.arbitrageOpportunities = [];
    }

    async initialize() {
        // Initialize database and blockchain connections
        await db.initialize();
        await blockchainManager.initialize();
        
        // Load configuration
        this.gasLimitMultiplier = parseFloat(await db.getConfig('gas_limit_multiplier') || '1.1');
        this.minProfitThreshold = parseFloat(await db.getConfig('min_profit_threshold') || '0.1');
        this.executionEnabled = (await db.getConfig('execution_enabled') || 'false') === 'true';
        
        console.log(`Bot initialized with execution ${this.executionEnabled ? 'enabled' : 'disabled'}`);
        return this;
    }

    async startMonitoring() {
        // Get all active token pairs to monitor
        const tokenPairs = await db.getTokenPairs(null, true);
        
        if (tokenPairs.length === 0) {
            console.log('No active token pairs configured for monitoring');
            return;
        }
        
        console.log(`Starting monitoring for ${tokenPairs.length} active token pairs`);
        
        for (const tokenPair of tokenPairs) {
            await this.monitorTokenPair(tokenPair);
        }
    }

    async monitorTokenPair(tokenPair) {
        const { id: tokenPairId, blockchain_id, token0_address, token1_address } = tokenPair;
        
        // Get all active DEXes for this blockchain
        const dexes = await db.getDexes(blockchain_id, true);
        
        if (dexes.length < 2) {
            console.log(`Skipping token pair ${tokenPairId} - need at least 2 DEXes on blockchain ${blockchain_id}`);
            return;
        }
        
        console.log(`Setting up monitoring for token pair ${tokenPair.token0_symbol}/${tokenPair.token1_symbol} on blockchain ${blockchain_id}`);
        
        // Initialize pair contracts for all DEXes
        for (const dex of dexes) {
            try {
                const { factory } = await blockchainManager.getDexContracts(blockchain_id, dex.id);
                const pairContract = await blockchainManager.getPairContract(blockchain_id, dex.id, token0_address, token1_address);
                
                // Set up swap event monitoring
                const listenerKey = await blockchainManager.monitorSwapEvents(
                    blockchain_id,
                    pairContract,
                    tokenPairId,
                    dex.id,
                    this.handleSwapEvent.bind(this)
                );
                
                // Track active monitors
                if (!this.activeMonitors[blockchain_id]) {
                    this.activeMonitors[blockchain_id] = {};
                }
                
                if (!this.activeMonitors[blockchain_id][tokenPairId]) {
                    this.activeMonitors[blockchain_id][tokenPairId] = {};
                }
                
                this.activeMonitors[blockchain_id][tokenPairId][dex.id] = {
                    listenerKey,
                    pairContract
                };
                
                console.log(`Monitoring ${dex.name} for ${tokenPair.token0_symbol}/${tokenPair.token1_symbol} swaps`);
            } catch (error) {
                console.error(`Failed to set up monitoring for DEX ${dex.name}:`, error.message);
            }
        }
    }

    async handleSwapEvent(blockchainId, tokenPairId, dexId, ...eventArgs) {
        // Generate execution key to prevent concurrent executions for the same token pair
        const executionKey = `${blockchainId}_${tokenPairId}`;
        
        if (this.isExecuting[executionKey]) {
            console.log(`Already processing an arbitrage for ${executionKey}, skipping`);
            return;
        }
        
        try {
            this.isExecuting[executionKey] = true;
            
            // Get token pair details
            const tokenPair = await db.getTokenPairs(blockchainId).then(pairs => 
                pairs.find(p => p.id === tokenPairId)
            );
            
            if (!tokenPair) {
                throw new Error(`Token pair ${tokenPairId} not found`);
            }
            
            const triggerDex = await db.getDexById(dexId);
            console.log(`\nSwap detected on ${triggerDex.name} for ${tokenPair.token0_symbol}/${tokenPair.token1_symbol}`);
            
            // Check prices across all DEXes
            await this.checkPrices(blockchainId, tokenPairId);
            
            // Look for arbitrage opportunities
            const opportunity = await this.findArbitrageOpportunity(blockchainId, tokenPairId);
            
            if (!opportunity) {
                console.log(`No arbitrage opportunity found for ${tokenPair.token0_symbol}/${tokenPair.token1_symbol}\n`);
                console.log('------------------------------------------------------\n');
                return;
            }
            
            // Check if the opportunity is profitable
            const isProfitable = await this.checkProfitability(blockchainId, tokenPairId, opportunity);
            
            if (!isProfitable) {
                console.log(`Opportunity found but not profitable for ${tokenPair.token0_symbol}/${tokenPair.token1_symbol}\n`);
                console.log('------------------------------------------------------\n');
                return;
            }
            
            // Execute the trade if enabled
            if (this.executionEnabled) {
                await this.executeTrade(blockchainId, tokenPairId, opportunity);
            } else {
                console.log(`\nProfitable opportunity found but execution is disabled`);
                console.log(`Buy on: ${opportunity.buyDex.name}, Sell on: ${opportunity.sellDex.name}`);
                console.log(`Estimated profit: ${opportunity.estimatedProfit}%\n`);
                
                // Save opportunity for the UI to display
                this.arbitrageOpportunities.push({
                    ...opportunity,
                    timestamp: Date.now(),
                    blockchain_id: blockchainId,
                    token_pair_id: tokenPairId
                });
                
                // Keep only the latest 100 opportunities
                if (this.arbitrageOpportunities.length > 100) {
                    this.arbitrageOpportunities.shift();
                }
                
                console.log('------------------------------------------------------\n');
            }
        } catch (error) {
            console.error(`Error processing swap event for ${executionKey}:`, error);
        } finally {
            this.isExecuting[executionKey] = false;
        }
    }

    async checkPrices(blockchainId, tokenPairId) {
        const monitors = this.activeMonitors[blockchainId]?.[tokenPairId];
        if (!monitors) return [];
        
        const tokenPair = await db.getTokenPairs(blockchainId).then(pairs => 
            pairs.find(p => p.id === tokenPairId)
        );
        
        if (!tokenPair) {
            throw new Error(`Token pair ${tokenPairId} not found`);
        }
        
        console.log(`\nChecking prices for ${tokenPair.token0_symbol}/${tokenPair.token1_symbol}...\n`);
        
        const currentBlock = await blockchainManager.getProvider(blockchainId).then(provider => 
            provider.getBlockNumber()
        );
        
        console.log(`Current Block: ${currentBlock}`);
        console.log(`-----------------------------------------`);
        
        const prices = [];
        
        for (const dexId in monitors) {
            try {
                const dex = await db.getDexById(parseInt(dexId));
                const { pairContract } = monitors[dexId];
                
                const price = await calculatePrice(pairContract);
                const formattedPrice = Number(price).toFixed(6);
                
                console.log(`${dex.name.padEnd(15)} | ${tokenPair.token1_symbol}/${tokenPair.token0_symbol}\t | ${formattedPrice}`);
                
                // Log price to database
                await db.logPrice({
                    blockchain_id: blockchainId,
                    token_pair_id: tokenPairId,
                    dex_id: parseInt(dexId),
                    price: formattedPrice
                });
                
                prices.push({
                    dexId: parseInt(dexId),
                    dex,
                    price: Big(price),
                    pairContract
                });
            } catch (error) {
                console.error(`Error getting price for DEX ${dexId}:`, error.message);
            }
        }
        
        console.log('');
        return prices;
    }

    async findArbitrageOpportunity(blockchainId, tokenPairId) {
        const prices = await this.checkPrices(blockchainId, tokenPairId);
        
        if (prices.length < 2) {
            return null;
        }
        
        const tokenPair = await db.getTokenPairs(blockchainId).then(pairs => 
            pairs.find(p => p.id === tokenPairId)
        );
        
        // Find min and max prices
        let minPrice = prices[0];
        let maxPrice = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i].price.lt(minPrice.price)) {
                minPrice = prices[i];
            }
            
            if (prices[i].price.gt(maxPrice.price)) {
                maxPrice = prices[i];
            }
        }
        
        // Calculate price difference percentage
        const priceDifference = maxPrice.price.minus(minPrice.price).div(minPrice.price).times(100).toNumber();
        
        console.log(`Price difference: ${priceDifference.toFixed(2)}%`);
        
        // Check if difference exceeds minimum threshold
        if (priceDifference <= parseFloat(tokenPair.min_price_difference)) {
            console.log(`Price difference below minimum threshold of ${tokenPair.min_price_difference}%`);
            return null;
        }
        
        console.log(`\nPotential Arbitrage Direction:`);
        console.log(`Buy\t -->\t ${minPrice.dex.name} (${minPrice.price.toFixed(6)})`);
        console.log(`Sell\t -->\t ${maxPrice.dex.name} (${maxPrice.price.toFixed(6)})\n`);
        
        return {
            buyDex: minPrice.dex,
            sellDex: maxPrice.dex,
            buyPairContract: minPrice.pairContract,
            sellPairContract: maxPrice.pairContract,
            priceDifference,
            estimatedProfit: priceDifference // Initial estimate, will be refined
        };
    }

    async checkProfitability(blockchainId, tokenPairId, opportunity) {
        console.log(`Determining Profitability...\n`);
        
        const { buyDex, sellDex, buyPairContract, sellPairContract } = opportunity;
        
        const tokenPair = await db.getTokenPairs(blockchainId).then(pairs => 
            pairs.find(p => p.id === tokenPairId)
        );
        
        // Get token contracts
        const token0Contract = await blockchainManager.getTokenByAddress(blockchainId, tokenPair.token0_address);
        const token1Contract = await blockchainManager.getTokenByAddress(blockchainId, tokenPair.token1_address);
        
        // Get DEX router contracts
        const { router: buyRouter } = await blockchainManager.getDexContracts(blockchainId, buyDex.id);
        const { router: sellRouter } = await blockchainManager.getDexContracts(blockchainId, sellDex.id);
        
        // Get reserves for both pairs
        const buyReserves = await getReserves(buyPairContract);
        const sellReserves = await getReserves(sellPairContract);
        
        // Determine a safe amount to trade (e.g., 1% of the smallest reserve)
        let minAmount;
        if (buyReserves[0] > sellReserves[0]) {
            minAmount = BigInt(sellReserves[0]) / BigInt(100); // 1% of smaller reserve
        } else {
            minAmount = BigInt(buyReserves[0]) / BigInt(100); // 1% of smaller reserve
        }
        
        try {
            // This returns the amount of token0 needed to swap for X amount of token1
            const token0ToToken1 = await buyRouter.getAmountsIn(minAmount, [
                tokenPair.token0_address,
                tokenPair.token1_address
            ]);
            
            // This returns the amount of token0 for swapping X amount of token1
            const token1ToToken0 = await sellRouter.getAmountsOut(token0ToToken1[1], [
                tokenPair.token1_address,
                tokenPair.token0_address
            ]);
            
            console.log(`Estimated amount of ${tokenPair.token0_symbol} needed to buy ${tokenPair.token1_symbol} on ${buyDex.name}: ${ethers.formatUnits(token0ToToken1[0], 'ether')}`);
            console.log(`Estimated amount of ${tokenPair.token0_symbol} returned after selling ${tokenPair.token1_symbol} on ${sellDex.name}: ${ethers.formatUnits(token1ToToken0[1], 'ether')}\n`);
            
            // Simulate the trade to calculate expected profit
            const { amountIn, amountOut } = await simulate(
                token0ToToken1[0],
                [buyRouter, sellRouter],
                { address: tokenPair.token0_address },
                { address: tokenPair.token1_address }
            );
            
            const amountInNumber = parseFloat(amountIn);
            const amountOutNumber = parseFloat(amountOut);
            const amountDifference = amountOutNumber - amountInNumber;
            
            // Get blockchain for gas price estimates
            const blockchain = await db.getBlockchainById(blockchainId);
            
            // Estimate gas costs
            const gasLimit = await db.getConfig('default_gas_limit') || '400000';
            const gasPrice = await blockchainManager.getProvider(blockchainId).then(provider => 
                provider.getFeeData().then(data => data.gasPrice)
            );
            
            const gasCostInWei = BigInt(gasLimit) * gasPrice;
            
            // Convert gas cost to token's native currency (like ETH)
            const gasCostInEth = parseFloat(ethers.formatUnits(gasCostInWei, 'ether'));
            
            console.log(`Estimated gas cost: ${gasCostInEth} ${blockchain.native_token}\n`);
            
            // Get the token0 price in the native currency if needed
            // This is a simplified approach - in a real app you'd use an oracle or price feed
            // For now we'll assume token0 is the native token (like WETH) for simplicity
            const token0PriceInNative = 1; // 1:1 if token0 is wrapped native token
            
            const profitInToken = amountDifference;
            const profitInNative = profitInToken * token0PriceInNative;
            const netProfitInNative = profitInNative - gasCostInEth;
            
            // Calculate profit as percentage
            const profitPercentage = (profitInToken / amountInNumber) * 100;
            const netProfitPercentage = ((profitInNative - gasCostInEth) / (amountInNumber * token0PriceInNative)) * 100;
            
            const data = {
                "Token Amount In": amountInNumber.toFixed(6),
                "Token Amount Out": amountOutNumber.toFixed(6),
                "Gross Profit (tokens)": profitInToken.toFixed(6),
                "Gross Profit %": profitPercentage.toFixed(2) + "%",
                "Gas Cost (native)": gasCostInEth.toFixed(6),
                "Net Profit (native)": netProfitInNative.toFixed(6),
                "Net Profit %": netProfitPercentage.toFixed(2) + "%"
            };
            
            console.table(data);
            
            // Update the opportunity with more accurate profit estimates
            opportunity.estimatedProfit = netProfitPercentage;
            opportunity.amountIn = token0ToToken1[0];
            opportunity.netProfit = netProfitInNative;
            opportunity.gasCost = gasCostInEth;
            
            // Determine if trade is profitable
            const isProfitable = netProfitPercentage > this.minProfitThreshold;
            
            if (isProfitable) {
                console.log(`Trade is profitable with ${netProfitPercentage.toFixed(2)}% net profit\n`);
            } else {
                console.log(`Trade is not profitable. Minimum profit threshold is ${this.minProfitThreshold}%\n`);
            }
            
            return isProfitable;
        } catch (error) {
            console.error(`Error calculating profitability:`, error.message);
            console.log(`\nError occurred while trying to determine profitability...\n`);
            console.log(`This can typically happen because of liquidity issues or price impact.\n`);
            return false;
        }
    }

    async executeTrade(blockchainId, tokenPairId, opportunity) {
        console.log(`\nAttempting Arbitrage...\n`);
        
        const { buyDex, sellDex, amountIn } = opportunity;
        
        const tokenPair = await db.getTokenPairs(blockchainId).then(pairs => 
            pairs.find(p => p.id === tokenPairId)
        );
        
        // Get token contracts
        const token0Contract = await blockchainManager.getTokenByAddress(blockchainId, tokenPair.token0_address);
        const token1Contract = await blockchainManager.getTokenByAddress(blockchainId, tokenPair.token1_address);
        
        // Find the arbitrage contract to use
        const arbitrageContracts = await db.getArbitrageContracts(blockchainId, true);
        if (arbitrageContracts.length === 0) {
            console.log(`No active arbitrage contract found for blockchain ${blockchainId}`);
            return;
        }
        
        const arbitrageContract = await blockchainManager.getArbitrageContract(
            blockchainId, 
            arbitrageContracts[0].id
        );
        
        try {
            // Create signer
            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('Private key not configured');
            }
            
            const signer = await blockchainManager.getSigner(blockchainId, privateKey);
            const wallet = signer.address;
            
            // Fetch token balances before
            const tokenBalanceBefore = await token0Contract.balanceOf(wallet);
            const nativeBalanceBefore = await blockchainManager.getProvider(blockchainId)
                .then(provider => provider.getBalance(wallet));
            
            // Determine which DEX to start with
            const startOnFirstDex = buyDex.id === 1; // Simplified for the example, adjust as needed
            
            console.log(`Executing trade: ${startOnFirstDex ? buyDex.name : sellDex.name} -> ${startOnFirstDex ? sellDex.name : buyDex.name}`);
            
            // Execute the trade
            const tx = await arbitrageContract.connect(signer).executeTrade(
                startOnFirstDex,
                await token0Contract.getAddress(),
                await token1Contract.getAddress(),
                amountIn,
                { gasLimit: BigInt(await db.getConfig('default_gas_limit') || '400000') }
            );
            
            console.log(`Transaction sent: ${tx.hash}`);
            console.log(`Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            
            // Fetch token balances after
            const tokenBalanceAfter = await token0Contract.balanceOf(wallet);
            const nativeBalanceAfter = await blockchainManager.getProvider(blockchainId)
                .then(provider => provider.getBalance(wallet));
            
            const tokenBalanceDifference = tokenBalanceAfter - tokenBalanceBefore;
            const nativeBalanceDifference = nativeBalanceBefore - nativeBalanceAfter;
            
            const blockchain = await db.getBlockchainById(blockchainId);
            
            const data = {
                [`${blockchain.native_token} Balance Before`]: ethers.formatUnits(nativeBalanceBefore, 'ether'),
                [`${blockchain.native_token} Balance After`]: ethers.formatUnits(nativeBalanceAfter, 'ether'),
                [`${blockchain.native_token} Spent (gas)`]: ethers.formatUnits(nativeBalanceDifference.toString(), 'ether'),
                "-": {},
                [`${tokenPair.token0_symbol} Balance BEFORE`]: ethers.formatUnits(tokenBalanceBefore, 'ether'),
                [`${tokenPair.token0_symbol} Balance AFTER`]: ethers.formatUnits(tokenBalanceAfter, 'ether'),
                [`${tokenPair.token0_symbol} Gained/Lost`]: ethers.formatUnits(tokenBalanceDifference.toString(), 'ether'),
                "--": {},
                "Total Gained/Lost": `${ethers.formatUnits((tokenBalanceDifference - nativeBalanceDifference).toString(), 'ether')} ${blockchain.native_token}`
            };
            
            console.table(data);
            
            // Log the trade in the database
            await db.logArbitrageTransaction({
                blockchain_id: blockchainId,
                token_pair_id: tokenPairId,
                buy_dex_id: buyDex.id,
                sell_dex_id: sellDex.id,
                tx_hash: tx.hash,
                amount_in: ethers.formatUnits(amountIn, 'ether'),
                amount_out: ethers.formatUnits(tokenBalanceAfter, 'ether'),
                profit: ethers.formatUnits(tokenBalanceDifference.toString(), 'ether'),
                gas_used: receipt.gasUsed.toString(),
                gas_price: receipt.gasPrice.toString(),
                status: 'completed'
            });
            
            console.log(`Trade completed and logged in database`);
            
        } catch (error) {
            console.error(`Error executing arbitrage:`, error);
            
            // Log failed transaction
            await db.logArbitrageTransaction({
                blockchain_id: blockchainId,
                token_pair_id: tokenPairId,
                buy_dex_id: buyDex.id,
                sell_dex_id: sellDex.id,
                tx_hash: null,
                amount_in: ethers.formatUnits(amountIn, 'ether'),
                amount_out: '0',
                profit: '0',
                gas_used: '0',
                gas_price: '0',
                status: 'failed'
            });
        }
    }

    // Add or update a token pair to monitor
    async addTokenPair(tokenPair) {
        const newPairId = await db.addTokenPair(tokenPair);
        const newPair = await db.getTokenPairs(tokenPair.blockchain_id)
            .then(pairs => pairs.find(p => p.id === newPairId));
            
        if (newPair) {
            await this.monitorTokenPair(newPair);
        }
        
        return newPairId;
    }

    // Add or update a DEX
    async addDex(dex) {
        const newDexId = await db.addDex(dex);
        
        // Update monitoring for all token pairs on this blockchain
        const tokenPairs = await db.getTokenPairs(dex.blockchain_id, true);
        for (const tokenPair of tokenPairs) {
            // Refresh monitoring for this token pair to include the new DEX
            await this.monitorTokenPair(tokenPair);
        }
        
        return newDexId;
    }

    // Toggle execution mode
    async setExecutionEnabled(enabled) {
        await db.setConfig('execution_enabled', enabled.toString());
        this.executionEnabled = enabled;
        console.log(`Execution mode ${enabled ? 'enabled' : 'disabled'}`);
        return enabled;
    }

    // Stop monitoring and clean up
    async stop() {
        console.log('Stopping arbitrage bot...');
        
        // Remove all event listeners
        blockchainManager.removeAllEventListeners();
        
        // Reset state
        this.isExecuting = {};
        this.activeMonitors = {};
        
        // Close blockchain connections
        await blockchainManager.closeAll();
        
        console.log('Arbitrage bot stopped');
    }

    // Get recent arbitrage opportunities detected
    getOpportunities() {
        return this.arbitrageOpportunities;
    }
}

// Export a singleton instance
const arbitrageBot = new ArbitrageBot();
module.exports = arbitrageBot;

// If running directly, start the bot
if (require.main === module) {
    console.log('Starting Multi-Chain Arbitrage Bot...');
    
    arbitrageBot.initialize()
        .then(() => arbitrageBot.startMonitoring())
        .then(() => {
            console.log('Bot is running and monitoring for arbitrage opportunities');
            
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                console.log('Received SIGINT, shutting down...');
                await arbitrageBot.stop();
                process.exit(0);
            });
        })
        .catch(error => {
            console.error('Failed to start arbitrage bot:', error);
            process.exit(1);
        });
}
