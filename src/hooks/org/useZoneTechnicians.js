import { useQuery } from '@tanstack/react-query';
import { getZoneTechnicians } from '@/services/org-utility.service';

export const useZoneTechnicians = (zoneId, options = {}) => {
  const parsedZoneId = zoneId ? Number(zoneId) : null;
  const { enabled = true, ...rest } = options;

  return useQuery({
    queryKey: ['org', 'zone-technicians', parsedZoneId],
    queryFn: () => getZoneTechnicians(parsedZoneId),
    enabled: enabled && Number.isFinite(parsedZoneId) && parsedZoneId > 0,
    ...rest,
  });
};
