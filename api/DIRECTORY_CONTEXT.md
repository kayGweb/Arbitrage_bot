# [api]

## Purpose

This directory contains the API implementation for the Multi-Chain DEX Arbitrage Bot. It provides a centralized location for defining and managing the RESTful endpoints that serve as the interface between the frontend user interface and the backend arbitrage system. The API enables users to configure blockchain networks, DEXes, tokens, and arbitrage parameters, as well as retrieve data for monitoring and analysis.

## Key Files

- `api-routes.js`: The main API router file that defines all API endpoints and their handlers. This file centralizes all routes in a single location for simplicity and maintainability.

## Architecture

The API follows a simple, consolidated approach with all routes defined in a single file. This approach keeps the codebase clean and easy to navigate, especially for a smaller-scale application. The API uses Express.js as the underlying framework.

Key architectural aspects:

1. **Consolidated Routes**: All API endpoints are defined in a single router file, organized logically by resource type (blockchains, dexes, tokens, etc.).

2. **Data Flow**:
   - API endpoints receive HTTP requests from the frontend
   - The router processes requests and calls appropriate database methods
   - Database operations are performed via the database interface (db.js)
   - Bot operations are triggered through the arbitrage bot interface
   - Responses are formatted and returned to the client

3. **Error Handling**: The API implements async error handling to ensure proper error responses are sent back to the client.

## Usage Examples

### API Endpoints Overview

The api-routes.js file defines endpoints for:

```
# Dashboard data
GET /api/dashboard - Get dashboard metrics and data

# Blockchain management
GET /api/blockchains - List all configured blockchains
POST /api/blockchains - Add a new blockchain
PUT /api/blockchains/:id - Update a blockchain
PATCH /api/blockchains/:id/toggle - Toggle blockchain active status

# DEX management
GET /api/dexes - List all configured DEXes
POST /api/dexes - Add a new DEX
PUT /api/dexes/:id - Update a DEX
PATCH /api/dexes/:id/toggle - Toggle DEX active status

# Token management
GET /api/tokens - List all configured tokens
POST /api/tokens - Add a new token

# Token pair management
GET /api/token-pairs - List all configured token pairs
POST /api/token-pairs - Add a new token pair

# Bot control
POST /api/bot/start - Start the arbitrage monitoring
POST /api/bot/stop - Stop the arbitrage monitoring
POST /api/bot/execution - Enable/disable automatic trade execution

# Transaction history
GET /api/transactions - Get arbitrage transaction history

# Configuration management
GET /api/config/:name - Get specific configuration
PUT /api/config/:name - Update specific configuration
```

### API Implementation Pattern

The typical pattern used in the api-routes.js file:

```javascript
// Using the asyncHandler wrapper for clean error handling
const asyncHandler = fn => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Example endpoint definition
router.get('/blockchains', asyncHandler(async (req, res) => {
  const blockchains = await db.getBlockchains(false);
  res.json(blockchains);
}));

router.post('/blockchains', asyncHandler(async (req, res) => {
  const newId = await db.addBlockchain(req.body);
  const blockchain = await db.getBlockchainById(newId);
  res.status(201).json(blockchain);
}));
```

### Integration with WebSocket

While the RESTful API handles configuration and data retrieval, real-time updates are typically handled via WebSockets, which are initialized in the main server file. The api-routes.js file focuses solely on HTTP-based API endpoints.

### Connection to Other Components

The API routes connect directly to other core components:

1. **Database**: Uses the db.js interface to perform database operations
2. **Arbitrage Bot**: Uses the arbitrageBot interface to control the bot and access its state
3. **Frontend**: Serves data to the frontend via HTTP requests

This simple but effective architecture allows for clean separation of concerns while keeping the codebase manageable.
