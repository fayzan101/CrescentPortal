import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSalesStage } from '@/services/sales.service';

export function usePatchSalesStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saleId, payload }) => updateSalesStage(saleId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      if (variables?.saleId) {
        queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] });
      }
    },
  });
}
