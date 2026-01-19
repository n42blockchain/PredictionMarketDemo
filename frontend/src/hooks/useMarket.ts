import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { Market, UserPosition } from '../types';

export const useMarket = (marketAddress: string | undefined) => {
  const { getMarketContract, wallet } = useWeb3();
  const [market, setMarket] = useState<Market | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition>({ yesShares: 0n, noShares: 0n });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = async () => {
    if (!marketAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const marketContract = getMarketContract(marketAddress);
      if (!marketContract) {
        throw new Error('Market contract not available');
      }

      const info = await marketContract.getMarketInfo();
      const creator = await marketContract.creator();

      const marketData: Market = {
        address: marketAddress,
        question: info._question,
        endTime: info._endTime,
        yesPool: info._yesPool,
        noPool: info._noPool,
        yesPrice: info._yesPrice,
        noPrice: info._noPrice,
        resolved: info._resolved,
        outcome: info._outcome,
        creator,
      };

      setMarket(marketData);

      // Fetch user position if wallet connected
      if (wallet.address) {
        const position = await marketContract.getUserPosition(wallet.address);
        setUserPosition({
          yesShares: position._yesShares,
          noShares: position._noShares,
        });
      }
    } catch (err: any) {
      console.error('Error fetching market:', err);
      setError(err.message || 'Failed to fetch market');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
  }, [marketAddress, wallet.address]);

  return { market, userPosition, loading, error, refetch: fetchMarket };
};
