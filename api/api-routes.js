// api/index.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const arbitrageBot = require('../multiChainBot');

// Initialize and catch errors
const asyncHandler = fn => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Dashboard data
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get statistics
  const totalTrades = await db.db.get('SELECT COUNT(*) as count FROM arbitrage_history');
  const successfulTrades = await db.db.get('SELECT COUNT(*) as count FROM arbitrage_history WHERE status = "completed"');
  const totalProfit = await db.db.get('SELECT SUM(profit) as total FROM arbitrage_history WHERE status = "completed"');
  
  // Get active monitors count
  const activeBlockchains = await db.getBlockchains(true);
  const activePairs = await db.getTokenPairs(null, true);
  const activeDexes = await db.getDexes(null, true);
  
  // Get recent trades
  const recentTrades = await db.getArbitrageHistory(10);
  
  // Get recent opportunities
  const opportunities = arbitrageBot.getOpportunities();
  
  // Get profit chart data
  const profitData = await db.db.all(`
    SELECT 
      DATE(created_at) as date,
      SUM(profit) as dailyProfit
    FROM arbitrage_history
    WHERE status = "completed"
    GROUP BY DATE(created_at)
    ORDER BY date ASC
    LIMIT 30
  `);
  
  // Get volume chart data
  const volumeData = await db.db.all(`
    SELECT 
      DATE(created_at) as date,
      SUM(amount_in) as dailyVolume
    FROM arbitrage_history
    GROUP BY DATE(created_at)
    ORDER BY date ASC
    LIMIT 30
  `);
  
  // Format chart data
  const profitChart = {
    labels: profitData.map(d => d.date),
    datasets: [{
      label: 'Daily Profit',
      data: profitData.map(d => parseFloat(d.dailyProfit)),
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    }]
  };
  
  const volumeChart = {
    labels: volumeData.map(d => d.date),
    datasets: [{
      label: 'Daily Volume',
      data: volumeData.map(d => parseFloat(d.dailyVolume)),
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    }]
  };
  
  res.json({
    stats: {
      totalProfit: parseFloat(totalProfit?.total || 0).toFixed(4),
      totalTrades: totalTrades?.count || 0,
      successRate: totalTrades?.count ? ((successfulTrades?.count / totalTrades?.count) * 100).toFixed(1) : 0,
      activeMonitors: activePairs.length,
    },
    recentTrades,
    opportunities,
    profitChart,
    volumeChart
  });
}));

// Blockchains
router.get('/blockchains', asyncHandler(async (req, res) => {
  const blockchains = await db.getBlockchains(false);
  res.json(blockchains);
}));

router.post('/blockchains', asyncHandler(async (req, res) => {
  const newId = await db.addBlockchain(req.body);
  const blockchain = await db.getBlockchainById(newId);
  res.status(201).json(blockchain);
}));

router.put('/blockchains/:id', asyncHandler(async (req, res) => {
  const updated = await db.updateBlockchain(req.params.id, req.body);
  res.json(updated);
}));

router.patch('/blockchains/:id/toggle', asyncHandler(async (req, res) => {
  const blockchain = await db.getBlockchainById(req.params.id);
  const updated = await db.updateBlockchain(req.params.id, {
    ...blockchain,
    is_active: !blockchain.is_active
  });
  res.json(updated);
}));

// DEXes
router.get('/dexes', asyncHandler(async (req, res) => {
  const { blockchain_id } = req.query;
  const dexes = await db.getDexes(blockchain_id || null, false);
  res.json(dexes);
}));

router.post('/dexes', asyncHandler(async (req, res) => {
  const newId = await db.addDex(req.body);
  const dex = await db.getDexById(newId);
  
  // Add to bot monitoring
  await arbitrageBot.addDex(dex);
  
  res.status(201).json(dex);
}));

router.put('/dexes/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const dex = await db.getDexById(id);
  
  if (!dex) {
    return res.status(404).json({ error: 'DEX not found' });
  }
  
  await db.updateDex(id, req.body);
  const updated = await db.getDexById(id);
  
  res.json(updated);
}));

router.patch('/dexes/:id/toggle', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const dex = await db.getDexById(id);
  
  if (!dex) {
    return res.status(404).json({ error: 'DEX not found' });
  }
  
  await db.updateDex(id, {
    ...dex,
    is_active: !dex.is_active
  });
  
  const updated = await db.getDexById(id);
  
  // Reset monitoring
  // We'd need to restart monitoring for affected token pairs
  
  res.json(updated);
}));

// Tokens
router.get('/tokens', asyncHandler(async (req, res) => {
  const { blockchain_id } = req.query;
  const tokens = await db.getTokens(blockchain_id || null, false);
  res.json(tokens);
}));

router.post('/tokens', asyncHandler(async (req, res) => {
  const newId = await db.addToken(req.body);
  const token = await db.getTokenById(newId);
  res.status(201).json(token);
}));

// Token Pairs
router.get('/token-pairs', asyncHandler(async (req, res) => {
  const { blockchain_id } = req.query;
  const pairs = await db.getTokenPairs(blockchain_id || null, false);
  res.json(pairs);
}));

router.post('/token-pairs', asyncHandler(async (req, res) => {
  const newId = await db.addTokenPair(req.body);
  const pair = await db.getTokenPairs().then(pairs => 
    pairs.find(p => p.id === newId)
  );
  
  // Add to bot monitoring
  await arbitrageBot.addTokenPair(pair);
  
  res.status(201).json(pair);
}));

// Bot control
router.post('/bot/start', asyncHandler(async (req, res) => {
  await arbitrageBot.startMonitoring();
  res.json({ status: 'Bot started' });
}));

router.post('/bot/stop', asyncHandler(async (req, res) => {
  await arbitrageBot.stop();
  res.json({ status: 'Bot stopped' });
}));

router.post('/bot/execution', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const result = await arbitrageBot.setExecutionEnabled(enabled);
  res.json({ executionEnabled: result });
}));

// Transaction history
router.get('/transactions', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const transactions = await db.getArbitrageHistory(
    parseInt(limit),
    parseInt(offset)
  );
  res.json(transactions);
}));

// Configuration
router.get('/config/:name', asyncHandler(async (req, res) => {
  const value = await db.getConfig(req.params.name);
  res.json({ name: req.params.name, value });
}));

router.put('/config/:name', asyncHandler(async (req, res) => {
  const { value, description } = req.body;
  const result = await db.setConfig(req.params.name, value, description);
  res.json(result);
}));

// Error handler
router.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

module.exports = router;
