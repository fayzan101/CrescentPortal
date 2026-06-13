import { userRequest } from '@/lib/RequestMethods';

const API_BASE = '/api/v1/roles';

const rolesService = {
    /**
     * Get all roles
     */
    async getAllRoles() {
        try {
            const response = await userRequest.get(API_BASE);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('Error fetching all roles:', error);
            throw error;
        }
    }
}

export default rolesService;