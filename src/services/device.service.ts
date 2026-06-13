export async function deleteDevice(id: number) {
	try {
		const response = await userRequest.delete(`${DEVICES_API_URL}/${id}`);
		return response.data;
	} catch (error: any) {
		throw error.response?.data || error;
	}
}
export async function updateDevice(id: number, device: Device) {
	try {
		const response = await userRequest.patch(`${DEVICES_API_URL}/${id}`, device, {
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response.data;
	} catch (error: any) {
		throw error.response?.data || error;
	}
}
export async function getDeviceById(id: number) {
	try {
		const response = await userRequest.get(`${DEVICES_API_URL}/${id}`);
		return response.data;
	} catch (error: any) {
		throw error.response?.data || error;
	}
}
export async function getDevices() {
	try {
		const response = await userRequest.get(DEVICES_API_URL);
		return response.data;
	} catch (error: any) {
		throw error.response?.data || error;
	}
}
import { userRequest } from '@/lib/RequestMethods';

const DEVICES_API_URL = '/api/v1/devices';

export interface Device {
	deviceId?: number;
	deviceName: string;
	imei?: string | null;
	isActive: boolean;
}

export async function createDevice(device: Device) {
	try {
		const response = await userRequest.post(DEVICES_API_URL, device, {
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response.data;
	} catch (error: any) {
		throw error.response?.data || error;
	}
}
