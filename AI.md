# AI Assistant Guide: Multi-Chain DEX Arbitrage Bot

This document provides essential information for AI assistants working with this codebase. It explains the application's purpose, architecture, and maps files to specific functionality.

## Application Overview

This application is a comprehensive arbitrage trading system that monitors and executes profitable trades between decentralized exchanges (DEXes) across multiple EVM-compatible blockchains. The bot looks for price differences of the same token pairs on different DEXes, and when the price difference exceeds a threshold, it can automatically execute trades to capture the profit using flash loans.

### Key Features

- **Multi-Chain Support**: Monitors multiple EVM-compatible blockchains (Ethereum, Polygon, Base, etc.)
- **Multiple DEX Support**: Works with any Uniswap V2-compatible DEX
- **Database-Backed**: Uses SQLite for configuration and trade history
- **Smart Contract Integration**: Uses flash loans for arbitrage execution
- **Interactive UI**: Next.js-based dashboard for monitoring and configuration
- **Real-Time Updates**: WebSocket-based price updates and opportunity notifications

## System Architecture

The application consists of several components:

1. **Arbitrage Bot**: The core component that monitors DEXes, identifies arbitrage opportunities, and executes trades
2. **Smart Contracts**: Deployed on each blockchain to execute the actual arbitrage trades using flash loans
3. **Database**: SQLite database storing configurations, tokens, blockchains, and trading history
4. **API Server**: Express.js server exposing REST endpoints for configuration and data retrieval
5. **Web UI**: Next.js frontend providing a dashboard and configuration interface
6. **WebSocket Server**: Real-time updates for the frontend

### Architecture Diagram

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Next.js UI     │◄────►│  Express API    │◄────►│  SQLite DB      │
│  (Frontend)     │      │  (Backend)      │      │  (Data Storage) │
│                 │      │                 │      │                 │
└────────┬────────┘      └────────┬────────┘      └─────────────────┘
         │                        │
         │                        │
         │                ┌───────▼────────┐
         │                │                │
         │                │  Arbitrage Bot │
         │                │  (Core Logic)  │
         │                │                │
         │                └───────┬────────┘
         │                        │
┌────────▼────────┐      ┌───────▼────────┐
│                 │      │                │
│  WebSocket      │◄────►│  Blockchain    │
│  Server         │      │  Manager       │
│                 │      │                │
└─────────────────┘      └───────┬────────┘
                                 │
                         ┌───────▼────────┐
                         │                │
                         │  Arbitrage     │
                         │  Contracts     │
                         │                │
                         └───────┬────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
          ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼─────┐
          │              │ │           │ │            │
          │  Ethereum    │ │  Polygon  │ │  Other     │
          │  Blockchain  │ │           │ │  Chains    │
          │              │ │           │ │            │
          └──────────────┘ └───────────┘ └────────────┘
```

### Component Interactions

1. **Frontend to Backend**: The Next.js frontend communicates with the Express API via HTTP requests and WebSocket connections.
   - HTTP for configuration actions and data retrieval
   - WebSockets for real-time updates on prices and opportunities

2. **Backend to Database**: The Express API and arbitrage bot interact with the SQLite database for:
   - Reading configuration (blockchains, DEXes, tokens, pairs)
   - Storing transaction history and price data
   - Updating settings and status information

3. **Bot to Blockchain**: The arbitrage bot connects to various blockchain networks through the blockchain manager:
   - Sets up WebSocket connections to nodes
   - Listens for swap events on configured DEXes
   - Reads token prices and reserves
   - Executes transactions through the arbitrage contracts

4. **Arbitrage Contract to DEXes**: When an opportunity is found, the smart contract:
   - Takes a flash loan from Balancer
   - Executes swaps on different DEXes
   - Repays the flash loan with interest
   - Returns the profit to the owner

## File Structure and Functionality Map

### Core Bot Logic

| File | Purpose |
|------|---------|
| `bot.js` | Original simplified bot implementation focused on Uniswap/Sushiswap |
| `multiChainBot.js` | Enhanced multi-chain implementation supporting any DEX on any EVM chain |
| `helpers/helpers.js` | Utility functions for blockchain interactions, price calculations |
| `helpers/initialization.js` | Sets up blockchain connections and contract instances |

### Smart Contracts

| File | Purpose |
|------|---------|
| `contracts/Arbitrage.sol` | Original arbitrage contract for Ethereum (Uniswap/Sushiswap) |
| `Universal Arbitrage Smart Contract.txt` | Enhanced contract supporting any DEX on any chain |
| `scripts/deploy.js` | Deployment script for the original Arbitrage contract |
| `scripts/deployArbitrage.js` | Deployment script for the universal arbitrage contract |
| `scripts/manipulate.js` | Test script to manipulate prices for testing arbitrage opportunities |

### Database and Data Access

| File | Purpose |
|------|---------|
| `db.js` / `Database Interface Module.txt` | Database interface and query methods |
| `SQLite Database Schema.txt` / `SQL Schema File.txt` | Database schema definition |
| `schema.sql` | SQL schema initialization file |

### Blockchain Integration

| File | Purpose |
|------|---------|
| `blockchainManager.js` / `Blockchain Connection Manager.txt` | Manages connections to multiple blockchains |
| `config.json` | Configuration for DEXes, routers, factories |
| `hardhat.config.js` | Hardhat configuration for contract deployment and testing |

### API Server

| File | Purpose |
|------|---------|
| `server.js` / `Server Setup for API and Bot Control.txt` | Express server setup with API routes and WebSocket |
| `api/index.js` / `Express API Routes.txt` | API route definitions |
| `helpers/server.js` | Basic Express server setup |

### Frontend (Next.js)

| File | Purpose |
|------|---------|
| `frontend/src/app/layout.js` / `Next.js Frontend Layout.txt` | Main layout component |
| `frontend/src/app/page.js` / `Dashboard Page.txt` | Dashboard page component |
| `frontend/src/app/blockchains/page.js` / `Blockchain Management Page.txt` | Blockchain management page |
| `frontend/src/app/dexes/page.js` / `DEX Management Page.txt` | DEX management page |
| `frontend/src/app/tokens/page.js` / `Token Management Page.txt` | Token management page |
| `frontend/src/app/token-pairs/page.js` / `Token Pair Management Page.txt` | Token pair management page |
| `frontend/src/lib/api.js` / `Frontend API Client Library.txt` | API client and WebSocket integration |

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` / `Environment Configuration Files.txt` | Environment variable template |
| `package.json` / `Updated package.json.txt` | Project dependencies and scripts |
| `Frontend Configuration Reference.md` | Configuration reference for frontend |

## Key Concepts

### Arbitrage Process

1. **Monitoring**: The bot listens for swap events on configured DEXes
2. **Price Checking**: When a swap occurs, it checks prices across DEXes
3. **Opportunity Detection**: It calculates if the price difference exceeds the threshold
4. **Profitability Check**: It simulates the trade to ensure gas costs don't exceed profits
5. **Execution**: If profitable, it executes the trade using flash loans

### Technical Implementation Details

#### Event Listening Mechanism

The system uses WebSocket connections to blockchain nodes to listen for swap events. In `blockchainManager.js`, the `monitorSwapEvents` method sets up these listeners:

```javascript
async monitorSwapEvents(blockchainId, pairContract, tokenPairId, dexId, callback) {
    // Generate a unique key for this listener
    const listenerKey = `${blockchainId}_${await pairContract.getAddress()}_${dexId}_${tokenPairId}`;
    
    // Register the event listener
    pairContract.on('Swap', async (...args) => {
        try {
            await callback(blockchainId, tokenPairId, dexId, ...args);
        } catch (error) {
            console.error(`Error in swap event callback for ${listenerKey}:`, error);
        }
    });
    
    // Store reference to the listener for later removal
    eventListeners[listenerKey] = { contract: pairContract, event: 'Swap', listener };
    
    return listenerKey;
}
```

#### Price Calculation Logic

In `helpers/helpers.js`, the `calculatePrice` function determines token prices:

```javascript
async function calculatePrice(_pairContract) {
    const [x, y] = await getReserves(_pairContract);
    return Big(x).div(Big(y));
}
```

This uses the reserves from Uniswap V2-compatible liquidity pools to determine the current exchange rate.

#### Profitability Determination

The `determineProfitability` function in `multiChainBot.js` runs a thorough analysis:

1. It fetches current token reserves from both DEXes
2. Calculates a safe trade amount (usually a small percentage of available liquidity)
3. Uses router contracts to simulate the trades
4. Accounts for gas costs based on current network conditions
5. Determines if the net profit exceeds the configured minimum threshold

### Flash Loan Arbitrage

The arbitrage contract uses these steps:
1. Borrow tokens via Balancer flash loan
2. Buy tokens on the DEX with lower price
3. Sell tokens on the DEX with higher price
4. Repay flash loan
5. Keep the profit

### DEX Monitoring

The bot uses event listeners to detect swaps:
1. It sets up listeners for the `Swap` event on trading pairs
2. When a swap occurs, it calculates prices on all monitored DEXes
3. It compares prices to find opportunities

## Database Schema

### Main Tables

- **blockchains**: Configured blockchain networks
- **dexes**: DEX router and factory addresses
- **tokens**: Token addresses and metadata
- **token_pairs**: Pairs to monitor for arbitrage
- **arbitrage_contracts**: Deployed arbitrage contracts
- **arbitrage_history**: Record of executed trades
- **price_logs**: Historical price data
- **bot_configs**: Bot configuration settings

### Detailed Schema

#### blockchains
```sql
CREATE TABLE blockchains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    chain_id INTEGER NOT NULL UNIQUE,
    rpc_url TEXT NOT NULL,
    ws_url TEXT,
    explorer_url TEXT,
    native_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    gas_multiplier FLOAT DEFAULT 1.1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### dexes
```sql
CREATE TABLE dexes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockchain_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    router_address TEXT NOT NULL,
    factory_address TEXT NOT NULL,
    version TEXT DEFAULT 'v2',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    UNIQUE(blockchain_id, router_address)
);
```

#### tokens
```sql
CREATE TABLE tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockchain_id INTEGER NOT NULL,
    address TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    decimals INTEGER DEFAULT 18,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    UNIQUE(blockchain_id, address)
);
```

#### token_pairs
```sql
CREATE TABLE token_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockchain_id INTEGER NOT NULL,
    token0_id INTEGER NOT NULL,
    token1_id INTEGER NOT NULL,
    min_price_difference FLOAT DEFAULT 0.5,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    FOREIGN KEY (token0_id) REFERENCES tokens (id),
    FOREIGN KEY (token1_id) REFERENCES tokens (id),
    UNIQUE(blockchain_id, token0_id, token1_id)
);
```

#### arbitrage_contracts
```sql
CREATE TABLE arbitrage_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockchain_id INTEGER NOT NULL,
    address TEXT NOT NULL,
    flash_loan_provider TEXT NOT NULL,
    flash_loan_provider_address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    UNIQUE(blockchain_id, address)
);
```

#### arbitrage_history
```sql
CREATE TABLE arbitrage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockchain_id INTEGER NOT NULL,
    token_pair_id INTEGER NOT NULL,
    buy_dex_id INTEGER NOT NULL,
    sell_dex_id INTEGER NOT NULL,
    tx_hash TEXT,
    amount_in TEXT NOT NULL,
    amount_out TEXT NOT NULL,
    profit TEXT NOT NULL,
    gas_used TEXT,
    gas_price TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    FOREIGN KEY (token_pair_id) REFERENCES token_pairs (id),
    FOREIGN KEY (buy_dex_id) REFERENCES dexes (id),
    FOREIGN KEY (sell_dex_id) REFERENCES dexes (id)
);
```

#### price_logs
```sql
CREATE TABLE price_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockchain_id INTEGER NOT NULL,
    token_pair_id INTEGER NOT NULL,
    dex_id INTEGER NOT NULL,
    price TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    FOREIGN KEY (token_pair_id) REFERENCES token_pairs (id),
    FOREIGN KEY (dex_id) REFERENCES dexes (id)
);
```

#### bot_configs
```sql
CREATE TABLE bot_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key DB Queries

#### Get active token pairs for monitoring
```javascript
const tokenPairs = await db.getTokenPairs(null, true);
```

#### Log a profitable trade
```javascript
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
```

#### Get configuration value
```javascript
const minProfitThreshold = parseFloat(await db.getConfig('min_profit_threshold') || '0.1');
```

#### Get DEX information
```javascript
const dexes = await db.getDexes(blockchain_id, true);
```

## Common Workflows

### Adding a New Blockchain

1. Add blockchain to the `blockchains` table
2. Deploy arbitrage contract to the blockchain
3. Add the contract address to `arbitrage_contracts` table
4. Add DEXes for that blockchain
5. Add tokens and token pairs

### Adding Arbitrage Pairs

1. Add tokens to the `tokens` table
2. Create token pairs in the `token_pairs` table
3. Set minimum price difference threshold
4. Toggle active status

### Executing Trades

1. Bot detects price difference exceeding threshold
2. It calculates potential profit accounting for gas
3. If profitable, it calls the arbitrage contract
4. Contract executes flash loan arbitrage
5. Results are logged in the `arbitrage_history` table

## Common Issues and Troubleshooting

### RPC Connection Issues

- Check API keys in environment variables
- Verify RPC endpoints in the blockchain configuration
- Check network connectivity

**Code reference**: In `blockchainManager.js`, RPC connection issues might occur in the `initProvider` method:

```javascript
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
        
        console.log(`Initialized provider for ${blockchain.name}`);
        return providers[id];
    } catch (error) {
        console.error(`Failed to initialize provider for ${blockchain.name}:`, error);
        throw error;
    }
}
```

Common errors include:
- Invalid API keys
- Rate limiting by RPC providers
- Network connectivity issues
- Incorrect URL format

### No Arbitrage Opportunities

- Verify price difference thresholds are reasonable
- Check that token pairs are active and configured correctly
- Ensure DEXes have sufficient liquidity

**Debug steps**:

1. Check the logs for price comparisons in `multiChainBot.js`:
   ```
   // Log output example
   Current Block: 12345678
   -----------------------------------------
   Uniswap   | SHIB/WETH  | 123456789.123
   Sushiswap | SHIB/WETH  | 123456000.456
   
   Percentage Difference: 0.06%
   ```

2. Compare with the configured threshold in the database:
   ```sql
   SELECT min_price_difference FROM token_pairs WHERE id = ?
   ```

3. Verify both DEXes have sufficient liquidity by checking reserves:
   ```javascript
   const reserves = await getReserves(pairContract);
   console.log(`Reserves: ${reserves[0]} / ${reserves[1]}`);
   ```

### Failed Transactions

- Check gas price settings
- Verify wallet has sufficient funds for gas
- Check contract approvals
- Review flash loan provider availability

**Debugging transaction errors**:

1. Look for error messages in the transaction receipt:
   ```javascript
   try {
       const tx = await arbitrageContract.executeTrade(...);
       const receipt = await tx.wait();
       console.log("Transaction succeeded:", receipt);
   } catch (error) {
       console.error("Transaction failed:", error);
       // Extract revert reason if available
       if (error.data) {
           const reason = ethers.utils.toUtf8String(error.data);
           console.error("Revert reason:", reason);
       }
   }
   ```

2. Common error patterns:
   - "gas required exceeds allowance" - Gas limit too low
   - "insufficient funds" - Not enough ETH for gas
   - "execution reverted" - Contract logic failed
   - "nonce too low" - Transaction nonce issues

3. Check the Balancer Vault for flash loan availability using the explorer for the relevant blockchain.

### Database Issues

- Check SQLite file permissions
- Verify schema initialization
- Check for database locking issues if multiple processes access it

**Debugging database issues**:

1. Verify the SQLite file exists and has correct permissions:
   ```bash
   ls -la ./data/arbitrage.db
   ```

2. Try to open it directly with the SQLite CLI:
   ```bash
   sqlite3 ./data/arbitrage.db
   ```

3. For locking issues, check if multiple processes are accessing the database:
   ```bash
   lsof ./data/arbitrage.db
   ```

4. Ensure proper initialization in `db.js`:
   ```javascript
   async initialize() {
       // Create directory if it doesn't exist
       if (!fs.existsSync(path.dirname(this.dbPath))) {
           fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
       }
       
       // Open database connection
       this.db = await open({
           filename: this.dbPath,
           driver: sqlite3.Database
       });
       
       // Check if we need to initialize schema
       const tables = await this.db.all("SELECT name FROM sqlite_master WHERE type='table'");
       if (tables.length === 0) {
           console.log('Initializing database schema...');
           const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
           await this.db.exec(schema);
       }
   }
   ```

### Frontend Connection Issues

- Check that API URL is correctly set in the frontend environment
- Verify CORS settings in the backend
- Check WebSocket connection status

**Debugging frontend connection issues**:

1. Verify environment variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   ```

2. Check browser console for API or WebSocket errors

3. Verify CORS settings in `server.js`:
   ```javascript
   app.use(cors({
       origin: '*',
       methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
   }));
   ```

4. Test API endpoints directly using a tool like curl or Postman:
   ```bash
   curl http://localhost:5000/api/blockchains
   ```

## Development Guidelines

1. Always check profitability including gas costs before executing trades
2. Use WebSocket providers for real-time event monitoring when available
3. Implement proper error handling to prevent bot crashes
4. Log all transactions and errors for auditing
5. Test new strategies in simulation mode before enabling automatic execution

## Critical Files for AI Understanding

The most important files to understand the system are:
1. `multiChainBot.js` - Core arbitrage logic
2. `Universal Arbitrage Smart Contract.txt` - Smart contract for execution
3. `Database Interface Module.txt` - Database structure and queries
4. `Blockchain Connection Manager.txt` - Blockchain interaction
5. `Express API Routes.txt` - API endpoints
6. `Dashboard Page.txt` - Main UI structure

## Project Structure

The project follows a structured organization as documented in `PROJECT_STRUCTURE.md` in the root directory. Below is a detailed overview of the directory structure:

```
multi-chain-dex-arbitrage/
├── contracts/                    # Smart contracts
│   ├── Arbitrage.sol             # Original arbitrage contract
│   └── UniversalArbitrage.sol    # Enhanced multi-chain arbitrage contract
├── scripts/                      # Deployment and utility scripts
│   ├── deploy.js                 # Original deployment script
│   ├── deployArbitrage.js        # Universal arbitrage deployment script
│   └── manipulate.js             # Test script for price manipulation
├── helpers/                      # Helper utilities
│   ├── helpers.js                # Blockchain interaction utilities
│   ├── initialization.js         # Contract initialization
│   └── server.js                 # Basic server setup
├── data/                         # Data storage
│   └── arbitrage.db              # SQLite database
├── logs/                         # Application logs
├── frontend/                     # Next.js web interface
│   ├── src/
│   │   ├── app/                  # Next.js app directory
│   │   │   ├── blockchains/      # Blockchain management page
│   │   │   ├── dexes/            # DEX management page
│   │   │   ├── tokens/           # Token management page
│   │   │   ├── token-pairs/      # Token pair management page
│   │   │   ├── globals.css       # Global styles
│   │   │   ├── layout.js         # Root layout
│   │   │   └── page.js           # Dashboard page
│   │   ├── components/           # React components
│   │   │   ├── ui/               # Shadcn UI components
│   │   │   ├── Header.jsx        # Application header
│   │   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   │   ├── StatsCards.jsx    # Dashboard stats
│   │   │   ├── OpportunityList.jsx # Arbitrage opportunities list
│   │   │   └── PriceChart.jsx    # Price visualization
│   │   └── lib/                  # Frontend utilities
│   │       ├── api.js            # API client
│   │       └── utils.js          # Utility functions
│   ├── public/                   # Static assets
│   ├── package.json              # Frontend dependencies
│   └── next.config.js            # Next.js configuration
├── api/                          # API routes
│   └── index.js                  # API endpoints
├── db.js                         # Database interface
├── blockchainManager.js          # Blockchain connection manager
├── multiChainBot.js              # Enhanced arbitrage bot
├── bot.js                        # Original arbitrage bot
├── server.js                     # Express server with API and WebSocket
├── schema.sql                    # Database schema
├── config.json                   # Application configuration
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Backend dependencies
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── README.md                     # Project documentation
├── PROJECT_STRUCTURE.md          # Detailed project structure
└── AI.md                         # This guide for AI assistants
```

### Key Directories and Their Purpose

1. **contracts/**: Contains all Solidity smart contracts
   - The original contract is simpler and focused on Ethereum
   - The UniversalArbitrage contract works across multiple chains and DEXes

2. **scripts/**: Contains deployment and utility scripts
   - Used for deploying contracts to different blockchains
   - Contains test utilities for simulating arbitrage conditions

3. **helpers/**: Contains utility functions and modules
   - Provides blockchain interaction abstractions
   - Sets up contract instances and providers

4. **data/**: Contains the SQLite database
   - Stores all configuration and historical data
   - Created automatically on first run

5. **frontend/**: Contains the Next.js web application
   - Uses Shadcn UI components
   - Organized by page and feature

6. **api/**: Contains API route definitions
   - Exposes endpoints for configuration and data retrieval
   - Used by the frontend to interact with the bot

## Module Dependencies

The application has several interdependent modules:

1. **Database Layer**
   - `db.js` → `schema.sql` → `data/arbitrage.db`

2. **Blockchain Interaction**
   - `blockchainManager.js` → `helpers/initialization.js` → `helpers/helpers.js`

3. **Bot Logic**
   - `multiChainBot.js` → `blockchainManager.js` → `db.js`

4. **API Layer**
   - `server.js` → `api/index.js` → `multiChainBot.js`

5. **Frontend**
   - `frontend/src/lib/api.js` → API endpoints → WebSocket events

6. **Smart Contracts**
   - `contracts/UniversalArbitrage.sol` → Deployed to blockchains → Called by `multiChainBot.js`

## Extending the System

### Adding Support for New DEXes

1. Add DEX information to the database
2. Verify the DEX uses a Uniswap V2-compatible interface
3. Register the router with the arbitrage contract

### Supporting New Blockchains

1. Add blockchain information to the database
2. Ensure a Balancer Vault or compatible flash loan provider exists
3. Deploy the arbitrage contract
4. Add tokens and DEXes for that blockchain

