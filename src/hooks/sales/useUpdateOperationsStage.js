import { useState } from 'react';
import { updateOperationsStage } from '../../services/sales.service';

export function useUpdateOperationsStage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const update = async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateOperationsStage(id, payload);
      setData(result);
      setLoading(false);
      return result;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.message) ? err.response.data.message.join(', ') : null) ||
        err?.message ||
        'Failed to update operations stage';
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  return { update, loading, error, data };
}
