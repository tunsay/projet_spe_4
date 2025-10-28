const express = require("express");
const jwt = require("jsonwebtoken")
const router = express.Router();

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
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Validation basique
  if (!email || !password) {
    return res.status(400).json({ error: "Email et password requis" });
  }

  // TODO: Vérifier l'email et le password en base de données
  // Pour l'instant, accepter n'importe quel email/password

  // Création du token
  const token = jwt.sign({ userEmail: email }, process.env.JWT_SECRET, { expiresIn: 60 * 60 });
  res.cookie("token", token, { httpOnly: true, secure: true });

  res.json({ token: token, user: { id: "u1", email: email } });
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
router.post("/logout", (req, res) => res.status(204).send());

module.exports = router;
