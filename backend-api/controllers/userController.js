// backend-api/controllers/userController.js

const db = require("../models");
const User = db.User;

const getUserProfile = async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ message: "Non autorisé." });
    }

    try {
        const user = await User.findByPk(userId, {
            // Sélectionne uniquement les champs publics (sans le hash de mot de passe ni les secrets 2FA)
            attributes: ["id", "email", "display_name", "role", "created_at"],
        });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        res.status(200).json({
            id: user.id,
            name: user.display_name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error("Erreur de récupération du profil:", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

module.exports = {
    getUserProfile,
};
