const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @openapi
 * /profile:
 *   get:
 *     summary: Récupère le profil de l'utilisateur connecté
 *     tags:
 *       - Profile
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *       '401':
 *         description: Non autorisé
 */
router.get("/", authenticateToken, userController.getUserProfile);

/**
 * @openapi
 * /profile:
 *   put:
 *     summary: Met à jour le profil (nom, mot de passe)
 *     tags:
 *       - Profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       '200':
 *         description: Mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *       '400':
 *         description: Requête invalide
 *       '401':
 *         description: Non autorisé
 */
router.put("/", (req, res) =>
    res.json({ id: "u1", name: "Alice", email: "a@b.c" })
);

/**
 * @openapi
 * /profile/2fa-setup:
 *   post:
 *     summary: Démarre l'activation du 2FA
 *     tags:
 *       - Profile
 *     responses:
 *       '200':
 *         description: Secret 2FA/TOTP généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                 qr:
 *                   type: string
 *                   description: Data URL PNG
 */
router.post("/2fa-setup", (req, res) =>
    res.json({ secret: "BASE32...", qr: "data:image/png;base64,..." })
);

module.exports = router;
