import { useState, useEffect, useCallback } from 'react';
import { getSaleById } from '../../services/sales.service';

export function useSaleById(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (id == null) return;
    let isMounted = true;
    (async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await getSaleById(id);
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch sale');
          setLoading(false);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [id, reloadKey]);

  return { data, loading, error, refetch };
}
