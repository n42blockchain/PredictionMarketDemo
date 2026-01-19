import React from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useMarkets } from '../hooks/useMarkets';
import { formatEther } from '../utils/format';

export const PortfolioPage: React.FC = () => {
  const { wallet } = useWeb3();
  const { markets, loading } = useMarkets();

  if (!wallet.isConnected) {
    return (
      <div className="card text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">
          Please connect your wallet to view your portfolio
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Portfolio</h1>
        <p className="mt-2 text-gray-600">View your positions across all markets</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4">Wallet Balance</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600">PRED Token</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatEther(wallet.tokenBalance)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">N Token</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatEther(wallet.balance)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Your Markets</h2>
        {markets.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No markets found. Start trading to build your portfolio!
          </p>
        ) : (
          <div className="space-y-4">
            {markets.map((market) => (
              <Link
                key={market.address}
                to={`/market/${market.address}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors"
              >
                <div className="font-medium text-gray-900">{market.question}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {market.resolved ? 'Resolved' : 'Active'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
