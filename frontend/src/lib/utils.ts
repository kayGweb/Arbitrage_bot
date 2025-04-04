import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Format percentage values
export function formatPercent(value?: number, decimals = 2): string {
  if (value === undefined || value === null) return "0%";
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

// Format currency values
export function formatCurrency(value?: number, decimals = 4): string {
  if (value === undefined || value === null) return "0";
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

// Truncate Ethereum addresses
export function truncateAddress(address?: string, startLength = 6, endLength = 4): string {
  if (!address) return '';
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
}

// Add the API function here or in a separate file
export async function fetchPriceHistory(pairId: string | number, limit = 100): Promise<any[]> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_URL}/price-history/${pairId}?limit=${limit}`);
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}