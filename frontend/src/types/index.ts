export interface MarketInfo {
  address: string;
  question: string;
  endTime: bigint;
  yesPool: bigint;
  noPool: bigint;
  yesPrice: bigint;
  noPrice: bigint;
  resolved: boolean;
  outcome: boolean;
}

export interface UserPosition {
  yesShares: bigint;
  noShares: bigint;
}

export interface Market extends MarketInfo {
  creator: string;
  totalVolume?: bigint;
  userPosition?: UserPosition;
}

export interface WalletState {
  address: string | null;
  balance: bigint;
  tokenBalance: bigint;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
}
