import {
    ChatMessageEntry,
    AnyRecord
} from "@/types/documents";


const createMessageFallbackId = () =>
    `message-${Date.now()}-${Math.round(Math.random() * 100000)}`;

const getString = (value: unknown): string | null =>
    typeof value === "string" ? value : null;

const getNonEmptyString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;

const pickFromRecord = (
    record: AnyRecord | undefined,
    keys: string[],
    { allowEmpty = false }: { allowEmpty?: boolean } = {}
): string | null => {
    if (!record) return null;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string") {
            if (allowEmpty) {
                if (value.length > 0) return value;
            } else if (value.trim().length > 0) {
                return value.trim();
            }
        }
    }
    return null;
};

export const normalizeMessageRecord = (
    input: unknown,
    fallbackId?: string
): ChatMessageEntry => {
    const fallback = fallbackId ?? createMessageFallbackId();

    if (!input || typeof input !== "object") {
        return {
            id: fallback,
            content: "",
            user_id: "",
            created_at: new Date().toISOString(),
            authorName: null,
            authorEmail: null,
            reactions: {},
        };
    }

    const record = input as AnyRecord;
    const author =
        record.author && typeof record.author === "object"
            ? (record.author as AnyRecord)
            : undefined;

    const idValue = record.id;
    const normalizedId =
        typeof idValue === "number" || typeof idValue === "string"
            ? idValue
            : fallback;

    const content = getString(record.content) ?? "";
    const createdAt =
        getString(record.created_at) ??
        getString(record.createdAt) ??
        new Date().toISOString();

    const userId =
        getString(record.user_id) ??
        getString(record.userId) ??
        (author ? getString(author.id) : null) ??
        "";

    const authorName =
        getNonEmptyString(record.authorName) ??
        getNonEmptyString(record.display_name) ??
        getNonEmptyString(record.displayName) ??
        getNonEmptyString(record.name) ??
        pickFromRecord(author, ["display_name", "displayName", "name"]) ??
        null;

    const authorEmail =
        getNonEmptyString(record.authorEmail) ??
        pickFromRecord(record, ["email"], { allowEmpty: true }) ??
        pickFromRecord(author, ["email"], { allowEmpty: true }) ??
        null;

    const normalizedReactions: Record<string, string[]> = {};
    const rawReactions =
        (record.reactions as unknown) ??
        (record.Reactions as unknown) ??
        undefined;
    if (rawReactions && typeof rawReactions === "object") {
        for (const [emoji, value] of Object.entries(
            rawReactions as Record<string, unknown>
        )) {
            if (typeof emoji !== "string") continue;
            if (Array.isArray(value)) {
                const userIds = value
                    .map((entry) =>
                        typeof entry === "string"
                            ? entry
                            : entry && typeof entry === "object" && "user_id" in entry
                            ? getString(
                                  (entry as { user_id?: unknown }).user_id
                              )
                            : null
                    )
                    .filter((candidate): candidate is string => !!candidate);
                if (userIds.length > 0) normalizedReactions[emoji] = userIds;
            } else if (
                value &&
                typeof value === "object" &&
                "userIds" in (value as Record<string, unknown>)
            ) {
                const fromObject = (value as Record<string, unknown>).userIds;
                if (Array.isArray(fromObject)) {
                    const userIds = fromObject.filter(
                        (candidate): candidate is string =>
                            typeof candidate === "string" && candidate.length > 0
                    );
                    if (userIds.length > 0) normalizedReactions[emoji] = userIds;
                }
            }
        }
    }

    return {
        id: normalizedId,
        content,
        user_id: userId,
        created_at: createdAt,
        authorName,
        authorEmail,
        reactions: normalizedReactions,
    };
};

export const sortMessagesByDate = (
    entries: ChatMessageEntry[]
): ChatMessageEntry[] =>
    [...entries].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
            return 0;
        }
        return aTime - bTime;
    });

export const upsertMessage = (
    entries: ChatMessageEntry[],
    nextEntry: ChatMessageEntry
): ChatMessageEntry[] => {
    const index = entries.findIndex(
        (item) => String(item.id) === String(nextEntry.id)
    );
    if (index !== -1) {
        const copy = [...entries];
        copy[index] = nextEntry;
        return sortMessagesByDate(copy);
    }
    return sortMessagesByDate([...entries, nextEntry]);
};

export const normalizeErrorMessage = (value: unknown, fallback: string) => {
    if (
        value &&
        typeof value === "object" &&
        "error" in value &&
        typeof (value as { error?: unknown }).error === "string"
    ) {
        return (value as { error: string }).error;
    }

    if (
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof (value as { message?: unknown }).message === "string"
    ) {
        return (value as { message: string }).message;
    }

    return fallback;
};
