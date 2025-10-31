export async function persistChatMessage(user, documentId, message) {
    if (!user?.token) {
        throw new Error("missing_user_token");
    }

    if (!process.env.API_INTERNAL_URL) {
        throw new Error("missing_api_internal_url");
    }

    const content =
        typeof message === "object" && message !== null
            ? message.content
            : null;

    if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("invalid_message_content");
    }

    const response = await fetch(`${process.env.API_INTERNAL_URL}/api/messages/${documentId}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Cookie: `token=${user.token}`,
            "user-id": user.id,
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const reason = errorText || response.statusText || "unknown_error";
        throw new Error(`Failed to persist chat message: ${reason}`);
    }

    const payload = await response.json();
    if (payload && typeof payload === "object" && payload.message) {
        return payload.message;
    }

    throw new Error("invalid_message_response");
}
