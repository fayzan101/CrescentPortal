import { userRequest } from '@/lib/RequestMethods';

export const getOrgDropdowns = async (resources, officeId) => {
  const params = {};
  if (resources) params.resources = resources;
  if (officeId) params.officeId = officeId;
  const response = await userRequest.get('/api/v1/org/dropdowns', { params });
  return response.data;
};

export const getZoneTechnicians = async (zoneId) => {
  const response = await userRequest.get(`/api/v1/org/zones/${zoneId}/technicians`);
  return response.data;
};
