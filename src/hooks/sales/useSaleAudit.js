import { useQuery } from '@tanstack/react-query';
import { getSaleAudit } from '../../services/sales.service';

export function useSaleAudit(id, options = {}) {
  const { enabled = true, ...rest } = options;
  return useQuery({
    queryKey: ['sale-audit', id],
    queryFn: () => getSaleAudit(id),
    enabled: !!id && enabled,
    ...rest,
  });
}
