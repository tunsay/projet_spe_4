
export default {
    open: async (user, documentId) => {
        const response = await fetch(process.env.API_INTERNAL_URL + `/api/sessions/${documentId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Cookie": `token=${user.token}`
            }   
        });
        if (!response.ok) {
            throw new Error(`Failed to open session: ${response.statusText}`);
        }
        return response.json();
    },
    close: async (user, documentId) => {
        const response = await fetch(process.env.API_INTERNAL_URL + `/api/sessions/${documentId}`, {
            method: "DELETE",
            credentials: 'include',
            headers: {
                "Cookie": `token=${user.token}`
            }   
        });
        if (!response.ok) {
            throw new Error(`Failed to close session: ${response.statusText}`);
        }
        return response.json();
    }
};