import { userRequest } from "@/lib/RequestMethods";

// Fetch inventory purchase orders
export const getPurchaseOrders = async () => {
  try {
    const response = await userRequest.get("/api/v1/purchase-orders");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create a purchase order
export const createPurchaseOrder = async (data) => {
  if (!data) throw new Error("Purchase order data is required");
  try {
    const response = await userRequest.post("/api/v1/purchase-orders", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch a single purchase order by ID
export const getPurchaseOrderById = async (id) => {
  if (!id) throw new Error("Purchase order ID is required");
  try {
    const response = await userRequest.get(`/api/v1/purchase-orders/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update a purchase order by ID
export const updatePurchaseOrder = async (id, data) => {
  if (!id) throw new Error("Purchase order ID is required");
  if (!data) throw new Error("Update data is required");
  try {
    const response = await userRequest.put(`/api/v1/purchase-orders/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete a purchase order by ID
export const deletePurchaseOrder = async (id) => {
  if (!id) throw new Error("Purchase order ID is required");
  try {
    const response = await userRequest.delete(`/api/v1/purchase-orders/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Approve a purchase order by ID
export const approvePurchaseOrder = async (id) => {
  if (!id) throw new Error("Purchase order ID is required");
  try {
    const response = await userRequest.post(`/api/v1/purchase-orders/${id}/approve`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Reject a purchase order by ID
export const rejectPurchaseOrder = async (id, reason) => {
  if (!id) throw new Error("Purchase order ID is required");
  if (!reason) throw new Error("Rejection reason is required");
  try {
    const response = await userRequest.post(`/api/v1/purchase-orders/${id}/reject`, { reason });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Download a purchase order PDF by ID
export const downloadPurchaseOrderPdf = async (id) => {
  if (!id) throw new Error("Purchase order ID is required");
  try {
    const response = await userRequest.get(`/api/v1/purchase-orders/${id}/pdf`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
