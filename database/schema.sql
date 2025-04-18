-- schema.sql
-- Database schema for multi-chain DEX arbitrage

-- Blockchains table
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

-- DEXes table
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

-- Tokens table
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

-- Token pairs to monitor
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

-- Arbitrage contracts
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

-- Wallet configurations
CREATE TABLE wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    blockchain_id INTEGER NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blockchain_id) REFERENCES blockchains (id),
    UNIQUE(blockchain_id, address)
);

-- Bot configurations
CREATE TABLE bot_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Arbitrage transactions history
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

-- Price monitoring logs
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

-- Insert some initial data for common EVM chains
INSERT INTO blockchains (name, chain_id, rpc_url, ws_url, explorer_url, native_token)
VALUES 
    ('Ethereum', 1, 'https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}', 'wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}', 'https://etherscan.io', 'ETH'),
    ('Polygon', 137, 'https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}', 'wss://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}', 'https://polygonscan.com', 'MATIC'),
    ('Base', 8453, 'https://mainnet.base.org', 'wss://mainnet.base.org', 'https://basescan.org', 'ETH'),
    ('PulseChain', 369, 'https://rpc.pulsechain.com', 'wss://rpc.pulsechain.com', 'https://scan.pulsechain.com', 'PLS');

-- Insert initial DEX data for Ethereum
INSERT INTO dexes (blockchain_id, name, router_address, factory_address)
VALUES
    (1, 'Uniswap', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
    (1, 'Sushiswap', '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac');

-- Add some common tokens for Ethereum
INSERT INTO tokens (blockchain_id, address, symbol, name, decimals)
VALUES
    (1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 'Wrapped Ether', 18),
    (1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 'USD Coin', 6),
    (1, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 'Tether USD', 6),
    (1, '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', 'SHIB', 'Shiba Inu', 18);

-- Add some common tokens for Polygon
INSERT INTO tokens (blockchain_id, address, symbol, name, decimals)
VALUES
    (2, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 'WMATIC', 'Wrapped Matic', 18),
    (2, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'USDC', 'USD Coin', 6),
    (2, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 'USDT', 'Tether USD', 6);

-- Add Balancer Vault address for Ethereum
INSERT INTO arbitrage_contracts (blockchain_id, address, flash_loan_provider, flash_loan_provider_address)
VALUES
    (1, '0x0000000000000000000000000000000000000000', 'Balancer', '0xBA12222222228d8Ba445958a75a0704d566BF2C8');

-- Add some default bot configs
INSERT INTO bot_configs (name, value, description)
VALUES
    ('default_gas_limit', '400000', 'Default gas limit for transactions'),
    ('default_slippage', '1.0', 'Default slippage tolerance in percentage'),
    ('monitor_interval', '1000', 'Monitoring interval in milliseconds'),
    ('min_profit_threshold', '0.1', 'Minimum profit threshold in percentage'),
    ('execution_enabled', 'false', 'Whether to execute trades automatically'),
    ('auto_start_monitoring', 'false', 'Whether to start monitoring automatically on server start');
