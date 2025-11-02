import profileRouter from "../api/profile.js";

export async function getAuthor(user, profileId) {
    try {
        return await profileRouter.getProfileById(user, profileId);
    } catch (error) {
        console.error("Error loading profile:", error);
        return null;
    }
}