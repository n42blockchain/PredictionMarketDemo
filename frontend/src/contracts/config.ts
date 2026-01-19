import deployment from './deployment.json';

export const N42_NETWORK = {
  chainId: 1142,
  chainIdHex: '0x476',
  name: 'N42 Test Network',
  rpcUrl: 'https://testrpc.n42.world',
  blockExplorerUrl: 'https://testnet.n42.world',
  nativeCurrency: {
    name: 'N',
    symbol: 'N',
    decimals: 18,
  },
};

export const CONTRACTS = {
  PredictionToken: deployment.token,
  MarketFactory: deployment.factory,
  SampleMarket: deployment.sampleMarket,
} as const;

export const FAUCET_URL = 'https://n42.ai/faucet';
export const EXPLORER_URL = (address: string) =>
  `${N42_NETWORK.blockExplorerUrl}/address/${address}`;
export const TX_URL = (hash: string) =>
  `${N42_NETWORK.blockExplorerUrl}/tx/${hash}`;
