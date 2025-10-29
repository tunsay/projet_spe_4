// backend-api/controllers/userController.js

const db = require("../models");
const User = db.User;
const twoFactorService = require("../services/twoFactorService");

/**
 * Récupère le profil de l'utilisateur connecté.
 */
const getUserProfile = async (req, res) => {
    const userId = req.userId;

    try {
        const user = await User.findByPk(userId, {
            attributes: [
                "id",
                "email",
                "display_name",
                "role",
                "is_two_factor_enabled",
                "created_at",
            ],
        });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        res.status(200).json({
            id: user.id,
            name: user.display_name,
            email: user.email,
            role: user.role,
            isTwoFactorEnabled: user.is_two_factor_enabled,
        });
    } catch (error) {
        console.error("Erreur de récupération du profil:", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Première étape de la configuration 2FA:
 * Génère un secret et un code QR temporaires.
 */
const setupTwoFactor = async (req, res) => {
    const userId = req.userId;

    try {
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        if (user.is_two_factor_enabled) {
            return res.status(400).json({ message: "Le 2FA est déjà activé." });
        }

        const { secret, qrCodeDataURL } =
            await twoFactorService.generateTwoFactorSecret(user.email);

        // NOTE: Stocker le secret généré dans une colonne temporaire (ou ici, on utilise l'attribut temporaire)
        // Pour les fins de la vérification suivante, nous devons stocker CE secret quelque part.
        // Si two_factor_secret est utilisé pour le stockage temporaire:
        user.two_factor_secret = secret;
        await user.save();

        res.status(200).json({
            // Le secret est renvoyé car il est nécessaire pour la vérification, mais il est maintenant stocké.
            secret: secret,
            qrCodeImage: qrCodeDataURL,
            message:
                "Scannez le QR code, puis utilisez /profile/2fa-activate pour vérifier le code TOTP.",
        });
    } catch (error) {
        console.error("Erreur lors de la configuration 2FA:", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Deuxième étape de la configuration 2FA:
 * Vérifie le code TOTP et active définitivement le 2FA.
 */
const activateTwoFactor = async (req, res) => {
    const userId = req.userId;
    const { token } = req.body;

    if (!token) {
        return res
            .status(400)
            .json({ message: "Le code TOTP (token) est requis." });
    }

    try {
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        if (user.is_two_factor_enabled) {
            return res.status(400).json({ message: "Le 2FA est déjà activé." });
        }

        const secret = user.two_factor_secret;

        if (!secret) {
            return res
                .status(400)
                .json({ message: "La configuration 2FA n'a pas été lancée." });
        }

        // 1. Vérifier le token TOTP
        const isValid = twoFactorService.verifyTwoFactorToken(token, secret);

        if (!isValid) {
            // Le secret reste stocké en cas de nouvelle tentative
            return res.status(440).json({ message: "Code TOTP invalide." }); // 440 est un code d'erreur personnalisé
        }

        // 2. Activation définitive du 2FA
        user.is_two_factor_enabled = true;
        // Le secret est déjà stocké dans two_factor_secret depuis setupTwoFactor, pas besoin de le modifier
        await user.save();

        res.status(200).json({
            message: "Authentification à deux facteurs activée avec succès.",
            isTwoFactorEnabled: true,
        });
    } catch (error) {
        console.error("Erreur lors de l'activation 2FA:", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

module.exports = {
    getUserProfile,
    setupTwoFactor,
    activateTwoFactor, // <-- Nouvelle fonction exportée
};
