const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const bcrypt = require("bcrypt");

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: Liste tous les utilisateurs (admin)
 *     tags:
 *       - Admin
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   role:
 *                     type: string
 *                     enum:
 *                       - user
 *                       - admin
 */
router.get("/users", (req, res) =>
    res.json([{ id: "u1", email: "a@b.c", role: "user" }])
);

/**
 * @openapi
 * /admin/users:
 *   post:
 *     summary: Crée un utilisateur (admin)
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum:
 *                   - user
 *                   - admin
 *                 default: user
 *     responses:
 *       '201':
 *         description: Créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 */
router.post("/users", async (req, res) => {
  try {
    const { email, password, role = "user" } = req.body;

    // Validation basique
    if (!email || !password) {
      return res.status(400).json({ error: "Email et password requis" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password minimum 8 caractères" });
    }

    // Hasher le mot de passe avec bcrypt (salt rounds = 10)
    const password_hash = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur avec le hash
    const result = await pool.query(
      `INSERT INTO "users" (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, password_hash, role]
    );

    const user = result.rows[0];
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @openapi
 * /admin/users/{id}/block:
 *   put:
 *     summary: Bloque un utilisateur (admin)
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: OK
 */
router.put("/users/:id/block", (req, res) => res.json({}));

/**
 * @openapi
 * /admin/users/{id}/unblock:
 *   put:
 *     summary: Débloque un utilisateur (admin)
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: OK
 */
router.put("/users/:id/unblock", (req, res) => res.json({}));


/**
 * @openapi
 * /admin/changepassword:
 *   put:
 *     summary: Change le mot de passe d'un utilisateur
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       '200':
 *         description: Mot de passe changé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *       '400':
 *         description: Erreur de validation
 *       '404':
 *         description: Utilisateur non trouvé
 */
router.put("/changepassword", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation basique
    if (!email || !password) {
      return res.status(400).json({ error: "Email et password requis" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password minimum 8 caractères" });
    }

    // Vérifier que l'utilisateur existe
    const userCheck = await pool.query(
      `SELECT id FROM "users" WHERE email = $1`,
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Hasher le nouveau mot de passe
    const password_hash = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      `UPDATE "users" SET password_hash = $1 WHERE email = $2`,
      [password_hash, email]
    );

    res.status(200).json({ 
      message: "Mot de passe changé avec succès",
      email: email
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
