const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const { User } = require("../models"); // Sequelize: User.twoFactorEnabled, User.twoFactorSecret
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || "Lax";
const TOKEN_TTL = process.env.JWT_TTL || "1h";

function signJwt(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function readUserId(req) {
    if (req.userId) return req.userId;
    const raw = req.cookies?.[COOKIE_NAME];
    if (raw) {
        try {
            return jwt.verify(raw, JWT_SECRET)?.userId || null;
        } catch {
            return null;
        }
    }
    const hdr = req.header("X-User-ID-Test");
    return hdr || null;
}

exports.verifyTwoFactor = async (req, res, next) => {
    try {
        const { token } = req.body || {};
        if (!token || typeof token !== "string")
            return res.status(400).json({ message: "token requis" });

        const userId = readUserId(req);
        if (!userId) return res.status(401).json({ message: "Non autorisé" });

        const user = await User.findByPk(userId);
        if (!user) return res.status(401).json({ message: "Non autorisé" });
        if (!user.is_two_factor_enabled || !user.two_factor_secret)
            return res.status(400).json({ message: "2FA non activé" });

        const ok = speakeasy.totp.verify({
            secret: user.two_factor_secret, // 🚀 CORRECTION ICI
            encoding: "base32",
            token,
            window: 1,
        });

        if (!ok) return res.status(440).json({ message: "Code TOTP invalide" });

        const newJwt = signJwt({
            userId: user.id,
            email: user.email,
            mfa: true,
        });
        res.cookie(COOKIE_NAME, newJwt, {
            httpOnly: true,
            secure: COOKIE_SECURE,
            sameSite: COOKIE_SAMESITE,
            domain: COOKIE_DOMAIN,
            path: "/",
            maxAge: 1000 * 60 * 60, // 1h
        });

        return res.status(204).send();
    } catch (err) {
        return next(err);
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation basique
        if (!email || !password) {
            return res.status(400).json({ error: "Email et password requis" });
        }

        console.log("Login attempt for:", email);

        // Rechercher l'utilisateur en base de données
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: "Identifiants incorrects" });
        }

        // Vérifier que l'utilisateur n'est pas bloqué
        if (user.is_blocked) {
            return res.status(403).json({ error: "Utilisateur bloqué" });
        }

        // Comparer le mot de passe avec le hash
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({ error: "Identifiants incorrects" });
        }

        // Créer le token JWT
        const token = jwt.sign(
            { userEmail: user.email, userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Définir le cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: COOKIE_SECURE,
            sameSite: COOKIE_SAMESITE,
            domain: COOKIE_DOMAIN,
        });

        res.status(200).json({
            token: token,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                role: user.role,
            },
        });
    } catch (error) {
        console.log("Erreur login:", error);
        res.status(500).json({ error: "Erreur serveur internesss" });
    }
};
