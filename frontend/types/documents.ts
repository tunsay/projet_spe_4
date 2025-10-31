export interface DocumentDetail {
    id: string;
    name: string;
    type: "text" | "folder" | "file";
    owner_id: string;
    parent_id: string | null;
    created_at: string;
    last_modified_at?: string | null;
    content?: string | null;
    mime_type?: string | null;
}

export interface Profile {
    id: string;
    name?: string | null;
    email: string;
    role: "admin" | "user";
}

export interface FeedbackMessage {
    type: "success" | "error";
    text: string;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface SessionParticipantEntry {
    userId: string;
    displayName: string;
    email: string;
    start_position?: number | null;
    end_position?: number | null;
    direction?: string | null;
}

export interface ChatMessageEntry {
    id: number | string;
    content: string;
    user_id: string;
    created_at: string;
    authorName?: string | null;
    authorEmail?: string | null;
    reactions?: Record<string, string[]>;
}

export const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
    });
};

export type AnyRecord = Record<string, unknown>;
