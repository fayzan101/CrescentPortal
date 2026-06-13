import { useQuery } from "@tanstack/react-query";
import { getDropdownVendors } from "@/services/inventory-utility.service";

export const useDropdownVendors = (cityId, options = {}) => {
  const { enabled = true, ...rest } = options;
  return useQuery({
    queryKey: ["dropdown-vendors", cityId ?? "all"],
    queryFn: () => getDropdownVendors(cityId),
    enabled,
    ...rest,
  });
};
