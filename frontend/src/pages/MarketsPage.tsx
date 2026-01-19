import React from 'react';
import { Link } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { formatPrice, formatTimeRemaining, formatEther } from '../utils/format';
import { EXPLORER_URL } from '../contracts/config';

export const MarketsPage: React.FC = () => {
  const { markets, loading, error } = useMarkets();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading markets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-2xl mx-auto">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error loading markets</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prediction Markets</h1>
        <p className="mt-2 text-gray-600">
          Trade on the outcome of future events. Prices reflect real-time probabilities.
        </p>
      </div>

      {markets.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-600">No markets available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Markets will appear here once they are created.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {markets.map((market) => (
            <Link
              key={market.address}
              to={`/market/${market.address}`}
              className="card hover:shadow-md transition-shadow"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    market.resolved
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {market.resolved ? 'Resolved' : 'Active'}
                </span>
                <span className="text-sm text-gray-500">
                  {market.resolved ? 'Ended' : formatTimeRemaining(market.endTime)}
                </span>
              </div>

              {/* Question */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
                {market.question}
              </h3>

              {/* Prices */}
              {market.resolved ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-center font-medium">
                    <span className="text-gray-700">Outcome: </span>
                    <span className={market.outcome ? 'text-yes' : 'text-no'}>
                      {market.outcome ? 'YES' : 'NO'}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yes/10 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">YES</div>
                    <div className="text-2xl font-bold text-yes">
                      {formatPrice(market.yesPrice)}
                    </div>
                  </div>
                  <div className="bg-no/10 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">NO</div>
                    <div className="text-2xl font-bold text-no">
                      {formatPrice(market.noPrice)}
                    </div>
                  </div>
                </div>
              )}

              {/* Liquidity */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total Liquidity</span>
                  <span className="font-medium">
                    {formatEther(market.yesPool + market.noPool)} PRED
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
