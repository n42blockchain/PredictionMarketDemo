import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { N42_NETWORK, CONTRACTS } from '../contracts/config';
import { WalletState } from '../types';

import PredictionTokenABI from '../contracts/PredictionToken.json';
import MarketFactoryABI from '../contracts/MarketFactory.json';
import PredictionMarketABI from '../contracts/PredictionMarket.json';

interface Web3ContextType {
  wallet: WalletState;
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  tokenContract: Contract | null;
  factoryContract: Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToN42: () => Promise<void>;
  getMarketContract: (address: string) => Contract | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: 0n,
    tokenBalance: 0n,
    isConnected: false,
    isConnecting: false,
    chainId: null,
  });

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [tokenContract, setTokenContract] = useState<Contract | null>(null);
  const [factoryContract, setFactoryContract] = useState<Contract | null>(null);

  // Initialize provider and contracts
  const initializeContracts = async (signer: ethers.Signer) => {
    const token = new Contract(CONTRACTS.PredictionToken, PredictionTokenABI, signer);
    const factory = new Contract(CONTRACTS.MarketFactory, MarketFactoryABI, signer);

    setTokenContract(token);
    setFactoryContract(factory);

    return { token, factory };
  };

  // Get market contract instance
  const getMarketContract = (address: string): Contract | null => {
    if (!signer) return null;
    return new Contract(address, PredictionMarketABI, signer);
  };

  // Update balances
  const updateBalances = async (address: string, provider: BrowserProvider, token: Contract) => {
    try {
      const [nativeBalance, tokenBalance] = await Promise.all([
        provider.getBalance(address),
        token.balanceOf(address),
      ]);

      setWallet((prev) => ({
        ...prev,
        balance: nativeBalance,
        tokenBalance: tokenBalance,
      }));
    } catch (error) {
      console.error('Error updating balances:', error);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      setWallet((prev) => ({ ...prev, isConnecting: true }));

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();

      setProvider(provider);
      setSigner(signer);

      const { token } = await initializeContracts(signer);

      const address = accounts[0];
      setWallet({
        address,
        balance: 0n,
        tokenBalance: 0n,
        isConnected: true,
        isConnecting: false,
        chainId: Number(network.chainId),
      });

      // Update balances
      await updateBalances(address, provider, token);

      // Check if on correct network
      if (Number(network.chainId) !== N42_NETWORK.chainId) {
        console.warn('Please switch to N42 Test Network');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setWallet((prev) => ({ ...prev, isConnecting: false }));
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWallet({
      address: null,
      balance: 0n,
      tokenBalance: 0n,
      isConnected: false,
      isConnecting: false,
      chainId: null,
    });
    setProvider(null);
    setSigner(null);
    setTokenContract(null);
    setFactoryContract(null);
  };

  // Switch to N42 network
  const switchToN42 = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: N42_NETWORK.chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: N42_NETWORK.chainIdHex,
                chainName: N42_NETWORK.name,
                nativeCurrency: N42_NETWORK.nativeCurrency,
                rpcUrls: [N42_NETWORK.rpcUrl],
                blockExplorerUrls: [N42_NETWORK.blockExplorerUrl],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  };

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== wallet.address) {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [wallet.address]);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
      }
    };
    checkConnection();
  }, []);

  return (
    <Web3Context.Provider
      value={{
        wallet,
        provider,
        signer,
        tokenContract,
        factoryContract,
        connectWallet,
        disconnectWallet,
        switchToN42,
        getMarketContract,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
