import { userRequest } from "@/lib/RequestMethods";

// Get inventory card report
export const getInventoryCardReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/inventory-card", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get issuance report
export const getIssuanceReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/reports/issuance", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get purchase request report
export const getPurchaseRequestsReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/reports/purchase-requests", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get purchase report
export const getPurchaseReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/reports/purchase", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get returns report
export const getReturnsReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/reports/returns", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get stock report
export const getStockReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/reports/stock", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get transfers report
export const getTransfersReport = async (params = {}) => {
  try {
    const response = await userRequest.get("/api/v1/reports/transfers", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};
