const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../models");
const User = db.User;

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Connecte l'utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation basique
    if (!email || !password) {
      return res.status(400).json({ error: "Email et password requis" });
    }

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
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
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
    console.error("Erreur login:", error);
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnecte l'utilisateur
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: Déconnecté avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Déconnexion réussie" });
});

/**
 * @openapi
 * /auth/2fa-verify:
 *   post:
 *     summary: Valide le code 2FA
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TwoFAVerifyRequest'
 *     responses:
 *       '200': { description: 2FA validé, content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
router.post("/2fa-verify", (req, res) =>
    res.json({ token: "jwt2", user: { id: "u1" } })
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnecte l'utilisateur
 *     tags: [Auth]
 *     responses:
 *       '204': { description: Déconnecté }
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect('/');
});

module.exports = router;
