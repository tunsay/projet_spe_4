// backend-api/middleware/authMiddleware.js (Rappel)

const authenticateToken = (req, res, next) => {
    // 1. Lire l'ID utilisateur à partir d'un en-tête temporaire pour le test
    const tempUserId = req.header("X-User-ID-Test");

    // 2. Si l'en-tête est là, on l'utilise. Sinon, on utilise un ID connu (Bob User)
    req.userId = tempUserId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    if (!req.userId) {
        return res
            .status(401)
            .json({ message: "Accès refusé. Jeton manquant." });
    }

    next();
};

module.exports = {
    authenticateToken,
};
