import { useState, useEffect } from 'react';
import { getSales } from '../../services/sales.service';

export function useInstalledClients() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
  }, []);

  return { data, loading, error };
}
