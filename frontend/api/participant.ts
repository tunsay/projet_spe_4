import { buildApiUrl } from "@/lib/api";
import {
    SessionParticipantEntry,
} from "@/types/documents";

export const fetchParticipants = async (documentId: string): Promise<SessionParticipantEntry[]> => {
    try {
        if (!documentId) {
            throw new Error("Invalid document ID.");
        }
        const response = await fetch(
            buildApiUrl(`/api/sessions/${documentId}`),
            {
                credentials: "include",
            }
        );

        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            throw new Error("Impossible de récupérer les participants.");
        }

        console.log("response payload participants:", payload);

        const rawList = Array.isArray(
            (payload as { participants?: unknown }).participants
        )
            ? ((payload as { participants: unknown[] })
                .participants as unknown[])
            : [];

        const normalized: SessionParticipantEntry[] = rawList.map(
            (item, index) => {
                if (!item || typeof item !== "object") {
                    const fallbackId = `participant-${index}`;
                    return {
                        userId: fallbackId,
                        displayName: fallbackId,
                        email: "",
                    };
                }

                const participant = item as Record<string, unknown>;
                const rawUser =
                    (participant.user as
                        | Record<string, unknown>
                        | undefined) ??
                    (participant.User as
                        | Record<string, unknown>
                        | undefined);

                const email =
                    (typeof participant.email === "string" &&
                        participant.email) ||
                    (rawUser && typeof rawUser.email === "string"
                        ? rawUser.email
                        : "") ||
                    "";

                const userId =
                    (typeof participant.user_id === "string" &&
                        participant.user_id) ||
                    (typeof participant.userId === "string" &&
                        participant.userId) ||
                    (rawUser &&
                        typeof rawUser.id === "string" &&
                        rawUser.id) ||
                    (rawUser &&
                        typeof rawUser.user_id === "string" &&
                        rawUser.user_id) ||
                    email ||
                    `participant-${index}`;

                const nameFromRecord =
                    (rawUser &&
                        typeof rawUser.display_name === "string" &&
                        rawUser.display_name) ||
                    (rawUser &&
                        typeof rawUser.displayName === "string" &&
                        rawUser.displayName) ||
                    (rawUser &&
                        typeof rawUser.name === "string" &&
                        rawUser.name) ||
                    (typeof participant.display_name === "string" &&
                        participant.display_name) ||
                    (typeof participant.displayName === "string" &&
                        participant.displayName) ||
                    (typeof participant.name === "string" &&
                        participant.name) ||
                    null;

                const displayName = nameFromRecord || email || userId;

                return {
                    userId,
                    displayName,
                    email,
                };
            }
        );
        return normalized;
    } catch (error) {
        console.error("Erreur participants:", error);
        throw error;
    }
};
