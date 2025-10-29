
export default {
    getById: async (user, documentId) => {
        const response = await fetch(process.env.API_INTERNAL_URL + `/api/documents/` + documentId, {
            credentials: 'include',
            headers: {
                "Cookie": `token=${user.token}`
            }   
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch document permission: ${response.statusText}`);
        }
        return response.json();
    },
    getByIdPermission: async (user, documentId) => {
        const response = await fetch(process.env.API_INTERNAL_URL + `/api/documents/${documentId}/permissionByUser` + `?userId=${user.id}`, {
            credentials: 'include',
            headers: {
                "Cookie": `token=${user.token}`
            }   
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch document permission: ${response.statusText}`);
        }
        return response.json();
    }
}