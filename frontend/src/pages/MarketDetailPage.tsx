import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { useWeb3 } from '../contexts/Web3Context';
import { formatPrice, formatEther, formatDate, parseEther } from '../utils/format';

export const MarketDetailPage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const { market, userPosition, loading, refetch } = useMarket(address);
  const { wallet, tokenContract, getMarketContract } = useWeb3();
  const [buyAmount, setBuyAmount] = useState('');
  const [buying, setBuying] = useState(false);
  const [buyType, setBuyType] = useState<'yes' | 'no'>('yes');

  const handleBuy = async () => {
    if (!wallet.isConnected || !tokenContract || !address || !buyAmount) return;

    try {
      setBuying(true);
      const marketContract = getMarketContract(address);
      if (!marketContract) throw new Error('Market contract not available');

      const amount = parseEther(buyAmount);

      // Approve tokens
      const approveTx = await tokenContract.approve(address, amount);
      await approveTx.wait();

      // Buy shares
      const buyTx = await marketContract.buyShares(amount, buyType === 'yes', 0);
      await buyTx.wait();

      alert('Purchase successful!');
      setBuyAmount('');
      refetch();
    } catch (err: any) {
      console.error('Buy failed:', err);
      alert(err.message || 'Transaction failed');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!market) {
    return <div className="card text-center">Market not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{market.question}</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-600">End Time</div>
            <div className="font-medium">{formatDate(market.endTime)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Status</div>
            <div className="font-medium">{market.resolved ? 'Resolved' : 'Active'}</div>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-yes/10 rounded-lg p-6">
            <div className="text-gray-700 font-medium mb-2">YES</div>
            <div className="text-4xl font-bold text-yes">{formatPrice(market.yesPrice)}</div>
            <div className="text-sm text-gray-600 mt-2">
              Pool: {formatEther(market.yesPool)} shares
            </div>
          </div>
          <div className="bg-no/10 rounded-lg p-6">
            <div className="text-gray-700 font-medium mb-2">NO</div>
            <div className="text-4xl font-bold text-no">{formatPrice(market.noPrice)}</div>
            <div className="text-sm text-gray-600 mt-2">
              Pool: {formatEther(market.noPool)} shares
            </div>
          </div>
        </div>
      </div>

      {/* Trading */}
      {!market.resolved && wallet.isConnected && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Trade</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Outcome
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setBuyType('yes')}
                  className={`p-4 rounded-lg border-2 font-medium ${
                    buyType === 'yes'
                      ? 'border-yes bg-yes/10 text-yes'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  YES {formatPrice(market.yesPrice)}
                </button>
                <button
                  onClick={() => setBuyType('no')}
                  className={`p-4 rounded-lg border-2 font-medium ${
                    buyType === 'no'
                      ? 'border-no bg-no/10 text-no'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  NO {formatPrice(market.noPrice)}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (PRED)
              </label>
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="input"
                placeholder="0.0"
                step="0.01"
              />
              <div className="text-sm text-gray-500 mt-1">
                Balance: {formatEther(wallet.tokenBalance)} PRED
              </div>
            </div>

            <button
              onClick={handleBuy}
              disabled={buying || !buyAmount || parseFloat(buyAmount) <= 0}
              className={buyType === 'yes' ? 'btn-yes w-full' : 'btn-no w-full'}
            >
              {buying ? 'Processing...' : `Buy ${buyType.toUpperCase()}`}
            </button>
          </div>
        </div>
      )}

      {/* User Position */}
      {wallet.isConnected && (userPosition.yesShares > 0n || userPosition.noShares > 0n) && (
        <div className="card mt-6">
          <h2 className="text-xl font-bold mb-4">Your Position</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">YES Shares</div>
              <div className="text-2xl font-bold text-yes">
                {formatEther(userPosition.yesShares)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">NO Shares</div>
              <div className="text-2xl font-bold text-no">
                {formatEther(userPosition.noShares)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
