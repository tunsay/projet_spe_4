const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../models");
const User = db.User;

const { verifyTwoFactor, postLogin } = require("../controllers/authController");
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
router.post("/login", postLogin);

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
router.post("/2fa-verify", verifyTwoFactor);

module.exports = router;
