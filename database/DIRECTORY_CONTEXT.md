# [database]

## Purpose

This directory contains the database implementation and schema for the Multi-Chain DEX Arbitrage Bot. It provides persistent storage of configuration data, blockchain information, token data, DEX information, and trading history to facilitate the application's operation. The project uses SQLite for its lightweight, serverless database needs.

## Key Files

- `db.js`: Singleton Database class that provides a consistent interface for database operations throughout the application
- `schema.sql`: SQL schema definition file containing table structures, relationships, and initial seed data
- `arbitrage.db`: The SQLite database file that stores all persistent data (auto-generated when the application runs)
- `migrations/`: Directory containing database migration scripts (if applicable)

## Architecture

The database layer follows a repository pattern to abstract database operations from the business logic. The `db.js` file exports a singleton instance that can be imported throughout the application to perform standardized database operations.

Key components of the architecture:

1. **Database Interface**: The `Database` class in `db.js` provides methods for common operations like:
   - Fetching blockchain information
   - Managing DEXes, tokens, and token pairs
   - Logging price information and arbitrage opportunities
   - Tracking transaction history
   - Managing configuration settings

2. **Schema Design**: The database schema is organized into the following main tables:
   - `blockchains`: Stores information about supported blockchain networks
   - `dexes`: Stores DEX configurations for each blockchain
   - `tokens`: Stores token information by blockchain
   - `token_pairs`: Maps token pairs for arbitrage monitoring
   - `arbitrage_contracts`: Stores deployed arbitrage contract addresses
   - `arbitrage_history`: Logs completed arbitrage transactions
   - `price_logs`: Records historical price data for analysis
   - `bot_configs`: Stores configuration settings for the application

3. **Initialization Process**: The database is automatically initialized when the application starts, creating the necessary tables if they don't exist and adding seed data for common blockchains and DEXes.

## Usage Examples

### Initializing the Database

```javascript
const db = require('./database/db');

async function initializeApp() {
  await db.initialize();
  console.log('Database initialized');
}
```

### Fetching Blockchain Information

```javascript
// Get all active blockchains
const activeBlockchains = await db.getBlockchains(true);
console.log(`Found ${activeBlockchains.length} active blockchains`);

// Get blockchain by chain ID
const ethereum = await db.getBlockchainByChainId(1);
console.log(`Ethereum RPC URL: ${ethereum.rpc_url}`);
```

### Managing Token Pairs

```javascript
// Add a new token pair to monitor
const newPairId = await db.addTokenPair({
  blockchain_id: 1,
  token0_id: 1, // WETH
  token1_id: 2, // USDC
  min_price_difference: 0.5,
  is_active: true
});

// Get all active token pairs
const activePairs = await db.getTokenPairs(null, true);
```

### Logging Arbitrage Transactions

```javascript
// Log a completed arbitrage transaction
await db.logArbitrageTransaction({
  blockchain_id: 1,
  token_pair_id: 3,
  buy_dex_id: 1,
  sell_dex_id: 2,
  tx_hash: '0x123...',
  amount_in: '1.0',
  amount_out: '1.05',
  profit: '0.05',
  gas_used: '250000',
  gas_price: '20000000000',
  status: 'completed'
});
```

### Managing Configuration

```javascript
// Update minimum profit threshold
await db.setConfig('min_profit_threshold', '0.2', 'Minimum profit percentage to execute trades');

// Get current gas limit
const gasLimit = await db.getConfig('default_gas_limit');
console.log(`Current gas limit: ${gasLimit}`);
```

### Data Export/Import

```javascript
// Export database for backup
const data = await db.exportData();
fs.writeFileSync('backup.json', JSON.stringify(data));

// Import data from backup
const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
await db.importData(backupData);
```
