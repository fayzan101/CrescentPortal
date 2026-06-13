import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reopenSale } from '@/services/sales.service';

export function useReopenSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saleId, stageCode }) => reopenSale(saleId, stageCode),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      if (variables?.saleId) {
        queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      }
    },
  });
}
