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

/**
 * Désactive le 2FA pour l'utilisateur connecté.
 */
const disableTwoFactor = async (req, res) => {
    const userId = req.userId;

    console.log("Désactivation 2FA pour l'utilisateur ID:", userId);
    try {
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        if (!user.is_two_factor_enabled) {
            return res.status(400).json({
                message: "Le 2FA n'est pas activé pour cet utilisateur.",
            });
        }

        user.is_two_factor_enabled = false;
        user.two_factor_secret = null;
        await user.save();

        return res.status(200).json({
            message: "Authentification à deux facteurs désactivée avec succès.",
            isTwoFactorEnabled: false,
        });
    } catch (error) {
        console.error("Erreur lors de la désactivation 2FA:", error);
        return res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Met à jour le profil de l'utilisateur (nom, email, mot de passe)
 */
const updateUserProfile = async (req, res) => {
    const userId = req.userId;
    const { name, email, password } = req.body;

    try {
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        // Valider les champs
        if (!name && !email && !password) {
            return res
                .status(400)
                .json({ message: "Au moins un champ doit être fourni (nom, email ou mot de passe)." });
        }

        if (name && name.trim().length === 0) {
            return res
                .status(400)
                .json({ message: "Le nom ne peut pas être vide." });
        }

        // Validation de l'email
        if (email) {
            if (email.trim().length === 0) {
                return res
                    .status(400)
                    .json({ message: "L'email ne peut pas être vide." });
            }

            // Regex de validation d'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res
                    .status(400)
                    .json({ message: "Format d'email invalide." });
            }

            // Vérifier si l'email est déjà utilisé par un autre utilisateur
            const existingUser = await User.findOne({
                where: { email: email.trim() }
            });

            if (existingUser && existingUser.id !== userId) {
                return res
                    .status(409)
                    .json({ message: "Cet email est déjà utilisé par un autre utilisateur." });
            }
        }

        if (password && password.length < 8) {
            return res
                .status(400)
                .json({
                    message:
                        "Le mot de passe doit contenir au minimum 8 caractères.",
                });
        }

        // Mettre à jour le nom
        if (name) {
            user.display_name = name;
        }

        // Mettre à jour l'email
        if (email) {
            user.email = email.trim();
        }

        // Mettre à jour le mot de passe
        if (password) {
            const bcrypt = require("bcrypt");
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password_hash = hashedPassword;
        }

        await user.save();

        res.status(200).json({
            id: user.id,
            name: user.display_name,
            email: user.email,
            message: "Profil mis à jour avec succès.",
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

module.exports = {
    getUserProfile,
    setupTwoFactor,
    activateTwoFactor,
    disableTwoFactor,
    updateUserProfile,
};
