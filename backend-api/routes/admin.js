const express = require("express");
const router = express.Router();

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
router.post("/users", (req, res) =>
    res.status(201).json({ id: "u2", email: "n@x.y", role: "user" })
);

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
