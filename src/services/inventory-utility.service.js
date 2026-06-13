import { userRequest } from "@/lib/RequestMethods";
import { getStores } from "@/services/inventory-setup.service";

// Get dropdown categories
export const getDropdownCategories = async () => {
  try {
    const response = await userRequest.get("/api/v1/dropdown/categories");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get dropdown items
export const getDropdownItems = async () => {
  try {
    const response = await userRequest.get("/api/v1/dropdown/items");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Store options for dropdowns (same list as GET /api/v1/stores)
export const getDropdownStores = async () => getStores();

// Get dropdown vendors (optional cityId filter)
export const getDropdownVendors = async (cityId) => {
  try {
    const params = {};
    if (cityId != null && cityId !== '') params.cityId = cityId;
    const response = await userRequest.get("/api/v1/dropdown/vendors", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get dropdowns by resources
export const getDropdowns = async (resources) => {
  try {
    const response = await userRequest.get("/api/v1/dropdowns", { params: { resources } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Search guards by service number
export const searchGuards = async (service_no) => {
  try {
    const response = await userRequest.get("/api/v1/guards/search", { params: { service_no } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAvailableDeviceUnits = async (storeId, deviceId) => {
  const params = { storeId };
  if (deviceId) params.deviceId = deviceId;
  const response = await userRequest.get("/api/v1/inventory/available-device-units", { params });
  return response.data?.data ?? response.data ?? [];
};
