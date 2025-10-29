const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.User;

function auth(req, res, next) {
    const token = req.cookies["token"];
    if (!token) {
        return res.status(401).json({ message: "Non autorisé" });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || !decoded || !decoded.userEmail) {
            return res.status(401).json({ message: "Non autorisé" });
        }

        try {
            // Récupération de l'utilisateur et vérification du rôle
            const user = await User.findOne({
                where: { email: decoded.userEmail },
            });

            if (!user || user.role !== "admin") {
                return res.status(401).json({ message: "Non autorisé" });
            }

            next();
        } catch (dbError) {
            console.error("Erreur vérification admin:", dbError);
            return res.status(500).json({ message: "Erreur serveur interne" });
        }
    });
}

module.exports = auth;
