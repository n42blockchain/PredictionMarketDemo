import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { Market } from '../types';

export const useMarkets = () => {
  const { factoryContract, getMarketContract } = useWeb3();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = async () => {
    if (!factoryContract) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const marketAddresses = await factoryContract.getAllMarkets();

      const marketDataPromises = marketAddresses.map(async (address: string) => {
        try {
          const marketContract = getMarketContract(address);
          if (!marketContract) return null;

          const info = await marketContract.getMarketInfo();

          return {
            address,
            question: info._question,
            endTime: info._endTime,
            yesPool: info._yesPool,
            noPool: info._noPool,
            yesPrice: info._yesPrice,
            noPrice: info._noPrice,
            resolved: info._resolved,
            outcome: info._outcome,
            creator: await marketContract.creator(),
          } as Market;
        } catch (err) {
          console.error(`Error fetching market ${address}:`, err);
          return null;
        }
      });

      const marketData = await Promise.all(marketDataPromises);
      const validMarkets = marketData.filter((m): m is Market => m !== null);

      setMarkets(validMarkets);
    } catch (err: any) {
      console.error('Error fetching markets:', err);
      setError(err.message || 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [factoryContract]);

  return { markets, loading, error, refetch: fetchMarkets };
};
