const express = require("express");
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
router.post("/login", (req, res) =>
    res.json({ token: "jwt", user: { id: "u1", email: "x@y.z" } })
);

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
