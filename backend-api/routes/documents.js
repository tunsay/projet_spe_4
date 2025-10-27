const express = require("express");
const router = express.Router();

/**
 * @openapi
 * /documents:
 *   get:
 *     summary: Liste des dossiers et fichiers accessibles
 *     tags:
 *       - Documents
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
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum:
 *                       - file
 *                       - folder
 */
router.get("/", (req, res) =>
    res.json([{ id: "d1", name: "Doc", type: "file" }])
);

/**
 * @openapi
 * /documents/{id}:
 *   delete:
 *     summary: Supprime un document
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '204':
 *         description: Supprimé
 */
router.delete("/:id", (req, res) => res.status(204).send());

/**
 * @openapi
 * /documents/file:
 *   post:
 *     summary: Upload d'un document non textuel (PDF, image, …)
 *     tags:
 *       - Documents
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
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
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 */
router.post("/file", (req, res) =>
    res.status(201).json({ id: "f1", name: "file.pdf", type: "file" })
);

/**
 * @openapi
 * /documents/file/{id}:
 *   put:
 *     summary: Remplace un document non textuel
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
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
 *                 type:
 *                   type: string
 */
router.put("/file/:id", (req, res) =>
    res.json({ id: req.params.id, name: "file.pdf", type: "file" })
);

/**
 * @openapi
 * /documents/{id}/invite:
 *   post:
 *     summary: Invite un utilisateur à modifier le document
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum:
 *                   - editor
 *                   - viewer
 *     responses:
 *       '204':
 *         description: Invitation envoyée
 */
router.post("/:id/invite", (req, res) => res.status(204).send());

module.exports = router;
