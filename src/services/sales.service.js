import { userRequest } from '@/lib/RequestMethods';

const API_BASE = '/api/v1/sales';


export async function updateTechnicianStage(id, payload) {
	try {
		const response = await userRequest.patch(`${API_BASE}/${id}/technician-stage`, payload);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error updating technician stage:', error);
		throw error;
	}
}
export async function createSale(payload) {
	try {
		const response = await userRequest.post(API_BASE, payload);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error creating sale:', error);
		throw error;
	}
}

/**
 * Helper to generate the correct payload for the createSale API.
 * @param {object} data - The sale data to send to the API.
 * @returns {object} - The payload formatted for the API.
 *
 * Example usage:
 *   const payload = buildCreateSalePayload({
 *     clientCategoryId: 1,
 *     irNo: 'IR123',
 *     fullName: 'John Doe',
 *     cnicNo: '12345-1234567-1',
 *     phoneHome: '0123456789',
 *     emailId: 'john@example.com',
 *     address: '123 Main St',
 *     clientStatus: 'Active',
 *     cellNo: '555-1234',
 *     fatherName: 'Father Name',
 *     dateOfBirth: '1990-01-01',
 *     phoneOffice: '555-5678',
 *     companyDepartment: 'Sales',
 *     addressLine2: 'Suite 100',
 *     productId: 2,
 *     saleAmount: 1000,
 *     saleType: 'CREDIT',
 *     packageId: 3,
 *     renewalCharges: 100,
 *     customTypeValue: 0,
 *     salesRemarks: 'First sale',
 *     submitToAccounts: true
 *   });
 *   await createSale(payload);
 */
export function buildCreateSalePayload(data) {
	return {
		clientCategoryId: data.clientCategoryId ?? 0,
		irNo: data.irNo ?? '',
		fullName: data.fullName ?? '',
		cnicNo: data.cnicNo ?? '',
		phoneHome: data.phoneHome ?? '',
		emailId: data.emailId ?? '',
		address: data.address ?? '',
		clientStatus: data.clientStatus ?? '',
		cellNo: data.cellNo ?? data.callNo ?? '',
		fatherName: data.fatherName ?? '',
		dateOfBirth: data.dateOfBirth ?? '',
		phoneOffice: data.phoneOffice ?? '',
		companyDepartment: data.companyDepartment ?? '',
		addressLine2: data.addressLine2 ?? '',
		productId: data.productId ?? 0,
		saleAmount: data.saleAmount ?? 0,
		saleType: data.saleType ?? 'CREDIT',
		packageId: data.packageId ?? 0,
		renewalCharges: data.renewalCharges ?? 0,
		customTypeValue: data.customTypeValue ?? 0,
		salesRemarks: data.salesRemarks ?? '',
		submitToAccounts: data.submitToAccounts ?? true
	};
}
export async function updateOperationsStage(id, payload) {
	try {
		const response = await userRequest.patch(`${API_BASE}/${id}/operations-stage`, payload);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error updating operations stage:', error);
		throw error;
	}
}
export async function getSaleAudit(id) {
	try {
		const response = await userRequest.get(`${API_BASE}/${id}/audit`);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error fetching sale audit:', error);
		throw error;
	}
}
export async function updateAccountsStage(id, payload) {
	try {
		const response = await userRequest.patch(`${API_BASE}/${id}/accounts-stage`, payload);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error updating accounts stage:', error);
		throw error;
	}
}
export async function getSaleById(id) {
	try {
		const response = await userRequest.get(`${API_BASE}/${id}`);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error fetching sale by id:', error);
		throw error;
	}
}

export async function getSales(params = {}) {
	try {
		const qs = params.installedOnly ? '?installedOnly=true' : '';
		const response = await userRequest.get(`${API_BASE}${qs}`);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error fetching sales:', error);
		throw error;
	}
}

export async function updateSalesStage(id, payload) {
	try {
		const response = await userRequest.patch(`${API_BASE}/${id}/sales-stage`, payload);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error updating sales stage:', error);
		throw error;
	}
}

export async function reopenSale(id, stageCode) {
	try {
		const response = await userRequest.patch(`${API_BASE}/${id}/reopen`, { stageCode });
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error reopening sale:', error);
		throw error;
	}
}

export async function voidSale(id) {
	try {
		const response = await userRequest.patch(`${API_BASE}/${id}/void`);
		return response.data?.data || response.data;
	} catch (error) {
		console.error('Error voiding sale:', error);
		throw error;
	}
}

export async function deleteSale(id) {
	try {
		return voidSale(id);
	} catch (error) {
		console.error('Error voiding sale:', error);
		throw error;
	}
}
