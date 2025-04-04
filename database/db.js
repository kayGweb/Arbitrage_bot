// db.js - Database interface module
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'arbitrage.db');
    }

    async initialize() {
        // No need to create data dir anymore since we're using the root database dir

        // Open database connection
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });

        // Enable foreign keys
        await this.db.run('PRAGMA foreign_keys = ON');

        // Check if database is initialized
        const tables = await this.db.all("SELECT name FROM sqlite_master WHERE type='table'");
        if (tables.length === 0) {
            console.log('Initializing database schema...');
            const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
            await this.db.exec(schema);
        }

        console.log('Database initialized');
        return this.db;
    }

    // Blockchain methods
    async getBlockchains(activeOnly = true) {
        const query = activeOnly 
            ? 'SELECT * FROM blockchains WHERE is_active = 1'
            : 'SELECT * FROM blockchains';
        return this.db.all(query);
    }

    async getBlockchainById(id) {
        return this.db.get('SELECT * FROM blockchains WHERE id = ?', id);
    }

    async getBlockchainByChainId(chainId) {
        return this.db.get('SELECT * FROM blockchains WHERE chain_id = ?', chainId);
    }

    async addBlockchain(blockchain) {
        const { name, chain_id, rpc_url, ws_url, explorer_url, native_token, is_active, gas_multiplier } = blockchain;
        const result = await this.db.run(
            'INSERT INTO blockchains (name, chain_id, rpc_url, ws_url, explorer_url, native_token, is_active, gas_multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, chain_id, rpc_url, ws_url, explorer_url, native_token, is_active, gas_multiplier]
        );
        return result.lastID;
    }

    async updateBlockchain(id, blockchain) {
        const { name, chain_id, rpc_url, ws_url, explorer_url, native_token, is_active, gas_multiplier } = blockchain;
        await this.db.run(
            'UPDATE blockchains SET name = ?, chain_id = ?, rpc_url = ?, ws_url = ?, explorer_url = ?, native_token = ?, is_active = ?, gas_multiplier = ? WHERE id = ?',
            [name, chain_id, rpc_url, ws_url, explorer_url, native_token, is_active, gas_multiplier, id]
        );
        return this.getBlockchainById(id);
    }

    // DEX methods
    async getDexes(blockchainId = null, activeOnly = true) {
        if (blockchainId) {
            const query = activeOnly 
                ? 'SELECT * FROM dexes WHERE blockchain_id = ? AND is_active = 1'
                : 'SELECT * FROM dexes WHERE blockchain_id = ?';
            return this.db.all(query, blockchainId);
        } else {
            const query = activeOnly 
                ? 'SELECT * FROM dexes WHERE is_active = 1'
                : 'SELECT * FROM dexes';
            return this.db.all(query);
        }
    }

    async getDexById(id) {
        return this.db.get('SELECT * FROM dexes WHERE id = ?', id);
    }

    async addDex(dex) {
        const { blockchain_id, name, router_address, factory_address, version, is_active } = dex;
        const result = await this.db.run(
            'INSERT INTO dexes (blockchain_id, name, router_address, factory_address, version, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [blockchain_id, name, router_address, factory_address, version, is_active]
        );
        return result.lastID;
    }

    async updateDex(id, dex) {
        const { blockchain_id, name, router_address, factory_address, version, is_active } = dex;
        await this.db.run(
            'UPDATE dexes SET blockchain_id = ?, name = ?, router_address = ?, factory_address = ?, version = ?, is_active = ? WHERE id = ?',
            [blockchain_id, name, router_address, factory_address, version, is_active, id]
        );
        return this.getDexById(id);
    }

    // Token methods
    async getTokens(blockchainId = null, activeOnly = true) {
        if (blockchainId) {
            const query = activeOnly 
                ? 'SELECT * FROM tokens WHERE blockchain_id = ? AND is_active = 1'
                : 'SELECT * FROM tokens WHERE blockchain_id = ?';
            return this.db.all(query, blockchainId);
        } else {
            const query = activeOnly 
                ? 'SELECT * FROM tokens WHERE is_active = 1'
                : 'SELECT * FROM tokens';
            return this.db.all(query);
        }
    }

    async getTokenById(id) {
        return this.db.get('SELECT * FROM tokens WHERE id = ?', id);
    }

    async getTokenByAddress(blockchainId, address) {
        return this.db.get('SELECT * FROM tokens WHERE blockchain_id = ? AND address = ?', [blockchainId, address]);
    }

    async addToken(token) {
        const { blockchain_id, address, symbol, name, decimals, is_active } = token;
        const result = await this.db.run(
            'INSERT INTO tokens (blockchain_id, address, symbol, name, decimals, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [blockchain_id, address, symbol, name, decimals, is_active]
        );
        return result.lastID;
    }

    // Token pair methods
    async getTokenPairs(blockchainId = null, activeOnly = true) {
        let query;
        let params = [];
        
        if (blockchainId) {
            query = `
                SELECT tp.*, 
                    t0.symbol as token0_symbol, t0.address as token0_address, 
                    t1.symbol as token1_symbol, t1.address as token1_address
                FROM token_pairs tp
                JOIN tokens t0 ON tp.token0_id = t0.id
                JOIN tokens t1 ON tp.token1_id = t1.id
                WHERE tp.blockchain_id = ?
            `;
            params.push(blockchainId);
            
            if (activeOnly) {
                query += ' AND tp.is_active = 1';
            }
        } else {
            query = `
                SELECT tp.*, 
                    t0.symbol as token0_symbol, t0.address as token0_address, 
                    t1.symbol as token1_symbol, t1.address as token1_address
                FROM token_pairs tp
                JOIN tokens t0 ON tp.token0_id = t0.id
                JOIN tokens t1 ON tp.token1_id = t1.id
            `;
            
            if (activeOnly) {
                query += ' WHERE tp.is_active = 1';
            }
        }
        
        return this.db.all(query, params);
    }

    async addTokenPair(tokenPair) {
        const { blockchain_id, token0_id, token1_id, min_price_difference, is_active } = tokenPair;
        const result = await this.db.run(
            'INSERT INTO token_pairs (blockchain_id, token0_id, token1_id, min_price_difference, is_active) VALUES (?, ?, ?, ?, ?)',
            [blockchain_id, token0_id, token1_id, min_price_difference, is_active]
        );
        return result.lastID;
    }

    // Arbitrage contract methods
    async getArbitrageContracts(blockchainId = null, activeOnly = true) {
        if (blockchainId) {
            const query = activeOnly 
                ? 'SELECT * FROM arbitrage_contracts WHERE blockchain_id = ? AND is_active = 1'
                : 'SELECT * FROM arbitrage_contracts WHERE blockchain_id = ?';
            return this.db.all(query, blockchainId);
        } else {
            const query = activeOnly 
                ? 'SELECT * FROM arbitrage_contracts WHERE is_active = 1'
                : 'SELECT * FROM arbitrage_contracts';
            return this.db.all(query);
        }
    }

    async getArbitrageContractById(id) {
        return this.db.get('SELECT * FROM arbitrage_contracts WHERE id = ?', id);
    }

    async addArbitrageContract(contract) {
        const { blockchain_id, address, flash_loan_provider, flash_loan_provider_address, is_active } = contract;
        const result = await this.db.run(
            'INSERT INTO arbitrage_contracts (blockchain_id, address, flash_loan_provider, flash_loan_provider_address, is_active) VALUES (?, ?, ?, ?, ?)',
            [blockchain_id, address, flash_loan_provider, flash_loan_provider_address, is_active]
        );
        return result.lastID;
    }

    // Config methods
    async getConfig(name) {
        const result = await this.db.get('SELECT value FROM bot_configs WHERE name = ?', name);
        return result ? result.value : null;
    }

    async setConfig(name, value, description = null) {
        const exists = await this.db.get('SELECT 1 FROM bot_configs WHERE name = ?', name);
        
        if (exists) {
            await this.db.run(
                'UPDATE bot_configs SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
                [value, name]
            );
        } else {
            await this.db.run(
                'INSERT INTO bot_configs (name, value, description) VALUES (?, ?, ?)',
                [name, value, description]
            );
        }
        
        return { name, value };
    }

    // Transaction history methods
    async logArbitrageTransaction(transaction) {
        const { 
            blockchain_id, token_pair_id, buy_dex_id, sell_dex_id, 
            tx_hash, amount_in, amount_out, profit, gas_used, gas_price, status 
        } = transaction;
        
        const result = await this.db.run(
            `INSERT INTO arbitrage_history (
                blockchain_id, token_pair_id, buy_dex_id, sell_dex_id, 
                tx_hash, amount_in, amount_out, profit, gas_used, gas_price, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                blockchain_id, token_pair_id, buy_dex_id, sell_dex_id, 
                tx_hash, amount_in, amount_out, profit, gas_used, gas_price, status
            ]
        );
        
        return result.lastID;
    }

    async getArbitrageHistory(limit = 100, offset = 0) {
        return this.db.all(`
            SELECT ah.*, 
                b.name as blockchain_name,
                t0.symbol as token0_symbol, t1.symbol as token1_symbol,
                d1.name as buy_dex_name, d2.name as sell_dex_name
            FROM arbitrage_history ah
            JOIN blockchains b ON ah.blockchain_id = b.id
            JOIN token_pairs tp ON ah.token_pair_id = tp.id
            JOIN tokens t0 ON tp.token0_id = t0.id
            JOIN tokens t1 ON tp.token1_id = t1.id
            JOIN dexes d1 ON ah.buy_dex_id = d1.id
            JOIN dexes d2 ON ah.sell_dex_id = d2.id
            ORDER BY ah.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    }

    // Price log methods
    async logPrice(price) {
        const { blockchain_id, token_pair_id, dex_id, price: priceValue } = price;
        
        const result = await this.db.run(
            'INSERT INTO price_logs (blockchain_id, token_pair_id, dex_id, price) VALUES (?, ?, ?, ?)',
            [blockchain_id, token_pair_id, dex_id, priceValue]
        );
        
        return result.lastID;
    }

    async getPriceHistory(token_pair_id, limit = 100) {
        return this.db.all(`
            SELECT pl.*, d.name as dex_name
            FROM price_logs pl
            JOIN dexes d ON pl.dex_id = d.id
            WHERE pl.token_pair_id = ?
            ORDER BY pl.timestamp DESC
            LIMIT ?
        `, [token_pair_id, limit]);
    }

    // Export methods for data migration/backup
    async exportData() {
        const tables = [
            'blockchains', 'dexes', 'tokens', 'token_pairs',
            'arbitrage_contracts', 'wallets', 'bot_configs',
            'arbitrage_history', 'price_logs'
        ];

        const data = {};
        
        for (const table of tables) {
            data[table] = await this.db.all(`SELECT * FROM ${table}`);
        }
        
        return data;
    }

    // Import data
    async importData(data) {
        try {
            await this.db.run('BEGIN TRANSACTION');
            
            for (const [table, rows] of Object.entries(data)) {
                if (!rows || rows.length === 0) continue;
                
                // Clear existing data
                await this.db.run(`DELETE FROM ${table}`);
                
                // Insert new data
                for (const row of rows) {
                    const columns = Object.keys(row).filter(k => k !== 'id');
                    const placeholders = columns.map(() => '?').join(', ');
                    const values = columns.map(col => row[col]);
                    
                    await this.db.run(
                        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                        values
                    );
                }
            }
            
            await this.db.run('COMMIT');
            return true;
        } catch (error) {
            await this.db.run('ROLLBACK');
            console.error('Import failed:', error);
            throw error;
        }
    }
}

// Export a singleton instance
const database = new Database();
module.exports = database;
