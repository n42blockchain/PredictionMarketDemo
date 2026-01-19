import { ethers } from 'ethers';

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatEther = (value: bigint | string, decimals: number = 2): string => {
  try {
    const formatted = ethers.formatEther(value);
    const num = parseFloat(formatted);
    return num.toFixed(decimals);
  } catch {
    return '0.00';
  }
};

export const formatPrice = (price: bigint): string => {
  try {
    const priceNumber = Number(price) / 1e18;
    return (priceNumber * 100).toFixed(2) + '%';
  } catch {
    return '0.00%';
  }
};

export const formatDate = (timestamp: bigint): string => {
  try {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

export const formatTimeRemaining = (endTime: bigint): string => {
  try {
    const now = Date.now() / 1000;
    const end = Number(endTime);
    const remaining = end - now;

    if (remaining <= 0) return 'Ended';

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return 'Unknown';
  }
};

export const parseEther = (value: string): bigint => {
  try {
    return ethers.parseEther(value);
  } catch {
    return 0n;
  }
};
