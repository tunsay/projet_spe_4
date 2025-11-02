
export default {
    getProfileById: async (user, profileId) => {
        const response = await fetch(process.env.API_INTERNAL_URL + `/api/profile/${profileId}`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Cookie": `token=${user.token}`
            }   
        });
        if (!response.ok) {
            throw new Error(`Failed to get profile: ${response.statusText}`);
        }
        return response.json();
    }
};