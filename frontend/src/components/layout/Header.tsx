import React from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { formatAddress, formatEther } from '../../utils/format';
import { N42_NETWORK, FAUCET_URL } from '../../contracts/config';

export const Header: React.FC = () => {
  const { wallet, connectWallet, disconnectWallet, switchToN42 } = useWeb3();

  const isWrongNetwork = wallet.chainId !== null && wallet.chainId !== N42_NETWORK.chainId;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">PredictMarket</span>
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium">
              Markets
            </Link>
            <Link to="/portfolio" className="text-gray-700 hover:text-primary-600 font-medium">
              Portfolio
            </Link>
            <a
              href={FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-primary-600 font-medium"
            >
              Faucet
            </a>
          </div>

          {/* Wallet */}
          <div className="flex items-center space-x-4">
            {wallet.isConnected ? (
              <>
                {isWrongNetwork ? (
                  <button onClick={switchToN42} className="btn-secondary text-sm">
                    Switch to N42
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center space-x-3 bg-gray-100 rounded-lg px-4 py-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">PRED Balance</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatEther(wallet.tokenBalance)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:block bg-primary-100 text-primary-700 px-4 py-2 rounded-lg font-medium text-sm">
                    {formatAddress(wallet.address || '')}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={wallet.isConnecting}
                className="btn-primary"
              >
                {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
