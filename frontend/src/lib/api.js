// src/lib/api.js
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create WebSocket connection
let socket;

if (typeof window !== 'undefined') {
  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
  
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
  });
  
  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });
}

// Helper function for API requests
async function fetchApi(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  
  return response.json();
}

// Dashboard data
export async function fetchDashboardData() {
  return fetchApi('/dashboard');
}

// Blockchains
export async function fetchBlockchains() {
  return fetchApi('/blockchains');
}

export async function fetchBlockchain(id) {
  return fetchApi(`/blockchains/${id}`);
}

export async function addBlockchain(data) {
  return fetchApi('/blockchains', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBlockchain(id, data) {
  return fetchApi(`/blockchains/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleBlockchainStatus(id, isActive) {
  return fetchApi(`/blockchains/${id}/toggle`, {
    method: 'PATCH',
  });
}

// DEXes
export async function fetchDexes(blockchainId = null) {
  const query = blockchainId ? `?blockchain_id=${blockchainId}` : '';
  return fetchApi(`/dexes${query}`);
}

export async function fetchDex(id) {
  return fetchApi(`/dexes/${id}`);
}

export async function addDex(data) {
  return fetchApi('/dexes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDex(id, data) {
  return fetchApi(`/dexes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleDexStatus(id) {
  return fetchApi(`/dexes/${id}/toggle`, {
    method: 'PATCH',
  });
}

// Tokens
export async function fetchTokens(blockchainId = null) {
  const query = blockchainId ? `?blockchain_id=${blockchainId}` : '';
  return fetchApi(`/tokens${query}`);
}

export async function fetchToken(id) {
  return fetchApi(`/tokens/${id}`);
}

export async function addToken(data) {
  return fetchApi('/tokens', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateToken(id, data) {
  return fetchApi(`/tokens/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleTokenStatus(id) {
  return fetchApi(`/tokens/${id}/toggle`, {
    method: 'PATCH',
  });
}

export async function lookupTokenInfo(blockchainId, address) {
  return fetchApi(`/tokens/lookup?blockchain_id=${blockchainId}&address=${address}`);
}

// Token Pairs
export async function fetchTokenPairs(blockchainId = null) {
  const query = blockchainId ? `?blockchain_id=${blockchainId}` : '';
  return fetchApi(`/token-pairs${query}`);
}

export async function fetchTokenPair(id) {
  return fetchApi(`/token-pairs/${id}`);
}

export async function addTokenPair(data) {
  return fetchApi('/token-pairs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTokenPair(id, data) {
  return fetchApi(`/token-pairs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleTokenPairStatus(id) {
  return fetchApi(`/token-pairs/${id}/toggle`, {
    method: 'PATCH',
  });
}

// Price history
export async function fetchPriceHistory(pairId, limit = 100) {
  return fetchApi(`/price-history/${pairId}?limit=${limit}`);
}

// Bot control
export async function startMonitoring() {
  return fetchApi('/bot/start', {
    method: 'POST',
  });
}

export async function stopMonitoring() {
  return fetchApi('/bot/stop', {
    method: 'POST',
  });
}

export async function setExecutionEnabled(enabled) {
  return fetchApi('/bot/execution', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

// Transaction history
export async function fetchTransactions(limit = 100, offset = 0) {
  return fetchApi(`/transactions?limit=${limit}&offset=${offset}`);
}

// Config management
export async function getConfig(name) {
  return fetchApi(`/config/${name}`);
}

export async function setConfig(name, value, description = null) {
  return fetchApi(`/config/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ value, description }),
  });
}

// WebSocket subscriptions
export function subscribeToOpportunities(callback) {
  if (!socket) return () => {};
  
  socket.on('opportunity', callback);
  return () => socket.off('opportunity', callback);
}

export function subscribeToTrades(callback) {
  if (!socket) return () => {};
  
  socket.on('trade', callback);
  return () => socket.off('trade', callback);
}

export function subscribeToPriceUpdates(callback) {
  if (!socket) return () => {};
  
  socket.on('price', callback);
  return () => socket.off('price', callback);
}

export function subscribeToBotStatus(callback) {
  if (!socket) return () => {};
  
  socket.on('bot:status', callback);
  return () => socket.off('bot:status', callback);
}

export function getSocket() {
  return socket;
}
