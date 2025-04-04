// src/lib/api.ts
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Define types for the API responses
interface ApiResponse {
  error?: string;
  [key: string]: any;
}

// Socket.io connection
let socket: Socket | null = null;

if (typeof window !== 'undefined') {
  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
  
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
  });
  
  socket.on('connect_error', (error: Error) => {
    console.error('WebSocket connection error:', error);
  });
}

// Helper function for API requests
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ApiResponse;
    throw new Error(error.error || `API error: ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

// Dashboard data types
interface DashboardData {
  stats: {
    totalProfit: string | number;
    totalTrades: number;
    successRate: number;
    activeMonitors: number;
  };
  recentTrades: any[];
  opportunities: any[];
  profitChart: any;
  volumeChart: any;
}

// Dashboard data
export async function fetchDashboardData(): Promise<DashboardData> {
  return fetchApi<DashboardData>('/dashboard');
}

// Blockchain types
interface Blockchain {
  id: number;
  name: string;
  chain_id: number;
  rpc_url: string;
  ws_url?: string;
  explorer_url?: string;
  native_token: string;
  is_active: boolean;
  gas_multiplier: number;
  created_at: string;
}

// Blockchains
export async function fetchBlockchains(): Promise<Blockchain[]> {
  return fetchApi<Blockchain[]>('/blockchains');
}

export async function fetchBlockchain(id: number): Promise<Blockchain> {
  return fetchApi<Blockchain>(`/blockchains/${id}`);
}

export async function addBlockchain(data: Partial<Blockchain>): Promise<Blockchain> {
  return fetchApi<Blockchain>('/blockchains', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBlockchain(id: number, data: Partial<Blockchain>): Promise<Blockchain> {
  return fetchApi<Blockchain>(`/blockchains/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleBlockchainStatus(id: number): Promise<Blockchain> {
  return fetchApi<Blockchain>(`/blockchains/${id}/toggle`, {
    method: 'PATCH',
  });
}

// DEX types
interface Dex {
  id: number;
  blockchain_id: number;
  name: string;
  router_address: string;
  factory_address: string;
  version: string;
  is_active: boolean;
  created_at: string;
}

// DEXes
export async function fetchDexes(blockchainId: number | null = null): Promise<Dex[]> {
  const query = blockchainId ? `?blockchain_id=${blockchainId}` : '';
  return fetchApi<Dex[]>(`/dexes${query}`);
}

export async function fetchDex(id: number): Promise<Dex> {
  return fetchApi<Dex>(`/dexes/${id}`);
}

export async function addDex(data: Partial<Dex>): Promise<Dex> {
  return fetchApi<Dex>('/dexes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDex(id: number, data: Partial<Dex>): Promise<Dex> {
  return fetchApi<Dex>(`/dexes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleDexStatus(id: number): Promise<Dex> {
  return fetchApi<Dex>(`/dexes/${id}/toggle`, {
    method: 'PATCH',
  });
}

// Token types
interface Token {
  id: number;
  blockchain_id: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  is_active: boolean;
  created_at: string;
}

// Tokens
export async function fetchTokens(blockchainId: number | null = null): Promise<Token[]> {
  const query = blockchainId ? `?blockchain_id=${blockchainId}` : '';
  return fetchApi<Token[]>(`/tokens${query}`);
}

export async function fetchToken(id: number): Promise<Token> {
  return fetchApi<Token>(`/tokens/${id}`);
}

export async function addToken(data: Partial<Token>): Promise<Token> {
  return fetchApi<Token>('/tokens', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateToken(id: number, data: Partial<Token>): Promise<Token> {
  return fetchApi<Token>(`/tokens/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleTokenStatus(id: number): Promise<Token> {
  return fetchApi<Token>(`/tokens/${id}/toggle`, {
    method: 'PATCH',
  });
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export async function lookupTokenInfo(blockchainId: number, address: string): Promise<TokenInfo> {
  return fetchApi<TokenInfo>(`/tokens/lookup?blockchain_id=${blockchainId}&address=${address}`);
}

// Token Pair types
interface TokenPair {
  id: number;
  blockchain_id: number;
  token0_id: number;
  token1_id: number;
  min_price_difference: number;
  is_active: boolean;
  created_at: string;
  token0_symbol?: string;
  token1_symbol?: string;
  token0_address?: string;
  token1_address?: string;
}

// Token Pairs
export async function fetchTokenPairs(blockchainId: number | null = null): Promise<TokenPair[]> {
  const query = blockchainId ? `?blockchain_id=${blockchainId}` : '';
  return fetchApi<TokenPair[]>(`/token-pairs${query}`);
}

export async function fetchTokenPair(id: number): Promise<TokenPair> {
  return fetchApi<TokenPair>(`/token-pairs/${id}`);
}

export async function addTokenPair(data: Partial<TokenPair>): Promise<TokenPair> {
  return fetchApi<TokenPair>('/token-pairs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTokenPair(id: number, data: Partial<TokenPair>): Promise<TokenPair> {
  return fetchApi<TokenPair>(`/token-pairs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleTokenPairStatus(id: number): Promise<TokenPair> {
  return fetchApi<TokenPair>(`/token-pairs/${id}/toggle`, {
    method: 'PATCH',
  });
}

// Price history types
interface PriceData {
  id: number;
  blockchain_id: number;
  token_pair_id: number;
  dex_id: number;
  dex_name: string;
  price: string;
  timestamp: string;
}

// Price history
export async function fetchPriceHistory(pairId: number, limit = 100): Promise<PriceData[]> {
  return fetchApi<PriceData[]>(`/price-history/${pairId}?limit=${limit}`);
}

// Bot control responses
interface BotResponse {
  status: string;
}

interface ExecutionResponse {
  executionEnabled: boolean;
}

// Bot control
export async function startMonitoring(): Promise<BotResponse> {
  return fetchApi<BotResponse>('/bot/start', {
    method: 'POST',
  });
}

export async function stopMonitoring(): Promise<BotResponse> {
  return fetchApi<BotResponse>('/bot/stop', {
    method: 'POST',
  });
}

export async function setExecutionEnabled(enabled: boolean): Promise<ExecutionResponse> {
  try {
    return fetchApi<ExecutionResponse>('/bot/execution', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  } catch (error) {
    console.error('Error setting execution mode:', error);
    return { executionEnabled: false };
  }
}

// Transaction types
interface Transaction {
  id: number;
  blockchain_id: number;
  token_pair_id: number;
  buy_dex_id: number;
  sell_dex_id: number;
  tx_hash: string | null;
  amount_in: string;
  amount_out: string;
  profit: string;
  gas_used: string;
  gas_price: string;
  status: string;
  created_at: string;
  blockchain_name?: string;
  token0_symbol?: string;
  token1_symbol?: string;
  buy_dex_name?: string;
  sell_dex_name?: string;
}

// Transaction history
export async function fetchTransactions(limit = 100, offset = 0): Promise<Transaction[]> {
  return fetchApi<Transaction[]>(`/transactions?limit=${limit}&offset=${offset}`);
}

// Config types
interface ConfigItem {
  name: string;
  value: string;
  description?: string;
}

// Config management
export async function getConfig(name: string): Promise<ConfigItem> {
  return fetchApi<ConfigItem>(`/config/${name}`);
}

export async function setConfig(name: string, value: string, description: string | null = null): Promise<ConfigItem> {
  return fetchApi<ConfigItem>(`/config/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ value, description }),
  });
}

// WebSocket event types
interface Opportunity {
  blockchain_id: number;
  token_pair_id: number;
  buyDex: {
    id: number;
    name: string;
  };
  sellDex: {
    id: number;
    name: string;
  };
  priceDifference: number;
  estimatedProfit: number;
  timestamp: number;
  blockchain?: string;
  tokenPair?: string;
}

interface TradeEvent {
  id: number;
  blockchain_id: number;
  token_pair_id: number;
  buy_dex_id: number;
  sell_dex_id: number;
  tx_hash: string;
  amount_in: string;
  amount_out: string;
  profit: string;
  status: string;
  timestamp: number;
}

interface PriceUpdate {
  blockchain_id: number;
  token_pair_id: number;
  dex_id: number;
  price: string;
  timestamp: string;
}

interface BotStatus {
  isRunning: boolean;
  executionEnabled: boolean;
  opportunities: Opportunity[];
}

// WebSocket subscription types
type UnsubscribeFn = () => void;
type OpportunityCallback = (opportunity: Opportunity) => void;
type TradeCallback = (trade: TradeEvent) => void;
type PriceUpdateCallback = (update: PriceUpdate) => void;
type BotStatusCallback = (status: BotStatus) => void;

// WebSocket subscriptions
export function subscribeToOpportunities(callback: OpportunityCallback): UnsubscribeFn {
  if (!socket) return () => {};
  
  socket.on('opportunity', callback);
  return () => socket.off('opportunity', callback);
}

export function subscribeToTrades(callback: TradeCallback): UnsubscribeFn {
  if (!socket) return () => {};
  
  socket.on('trade', callback);
  return () => socket.off('trade', callback);
}

export function subscribeToPriceUpdates(callback: PriceUpdateCallback): UnsubscribeFn {
  if (!socket) return () => {};
  
  socket.on('price', callback);
  return () => socket.off('price', callback);
}

export function subscribeToBotStatus(callback: BotStatusCallback): UnsubscribeFn {
  if (!socket) return () => {};
  
  socket.on('bot:status', callback);
  return () => socket.off('bot:status', callback);
}

export function getSocket(): Socket | null {
  return socket;
}