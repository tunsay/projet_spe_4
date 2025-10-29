const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

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
router.get("/", userController.getUserProfile);

/**
 * @openapi
 * /profile:
 *   put:
 *     summary: Met à jour le profil (nom, mot de passe)
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nouveau nom d'affichage
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Nouveau mot de passe
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
 *                 message:
 *                   type: string
 *       '400':
 *         description: Requête invalide
 *       '401':
 *         description: Non autorisé
 */
router.put("/", auth, userController.updateUserProfile);

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
router.post("/2fa-setup", userController.setupTwoFactor);

/**
 * @openapi
 * /profile/2fa-activate:
 *   post:
 *     summary: Vérifie le code TOTP et active définitivement le 2FA.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Code TOTP à 6 chiffres de l'application d'authentification.
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: 2FA activé avec succès.
 *       '400':
 *         description: Code TOTP manquant, configuration non lancée, ou 2FA déjà actif.
 *       '401':
 *         description: Non autorisé.
 *       '440':
 *         description: Code TOTP invalide (code personnalisé du contrôleur).
 */
router.post("/2fa-activate", userController.activateTwoFactor);

/**
 * @openapi
 * /profile/2fa-disable:
 *   post:
 *     summary: Désactive l'authentification à deux facteurs pour l'utilisateur connecté.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 2FA désactivé avec succès.
 *       '400':
 *         description: 2FA non actif.
 *       '401':
 *         description: Non autorisé.
 */
router.post("/2fa-disable", userController.disableTwoFactor);

module.exports = router;
