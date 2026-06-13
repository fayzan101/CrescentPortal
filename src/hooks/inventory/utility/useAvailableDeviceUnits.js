import { useQuery } from '@tanstack/react-query';
import { getAvailableDeviceUnits } from '@/services/inventory-utility.service';

export const useAvailableDeviceUnits = (storeId, deviceId, options = {}) => {
  const parsedStoreId = storeId ? Number(storeId) : null;
  const parsedDeviceId = deviceId ? Number(deviceId) : null;
  const { enabled = true, ...rest } = options;

  return useQuery({
    queryKey: ['inventory', 'available-device-units', parsedStoreId, parsedDeviceId],
    queryFn: () =>
      getAvailableDeviceUnits(parsedStoreId, parsedDeviceId || undefined),
    enabled: enabled && Number.isFinite(parsedStoreId) && parsedStoreId > 0,
    ...rest,
  });
};
