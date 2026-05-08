import { useMutation } from "@tanstack/react-query";
import { downloadPurchaseOrderPdf } from "@/services/inventory-po.service";

export const useDownloadPurchaseOrderPdf = (options = {}) => {
  return useMutation({
    mutationFn: (id) => downloadPurchaseOrderPdf(id),
    ...options,
  });
};
