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

module.exports = router;
