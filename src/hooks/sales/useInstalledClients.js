import { useState, useEffect, useCallback } from 'react';
import { getSales } from '../../services/sales.service';

export function useInstalledClients() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await getSales({ installedOnly: true });
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch installed clients');
          setLoading(false);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [reloadKey]);

  return { data, loading, error, refetch };
}
