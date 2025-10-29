const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuration multer pour l'upload
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

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
 *                   owner_id:
 *                     type: string
 *                   created_at:
 *                     type: string
 */
router.get("/", async (req, res) => {
  try {
    // Récupérer les documents (racine - parent_id IS NULL)
    const result = await pool.query(
      `SELECT 
        d.id, 
        d.name, 
        d.type, 
        d.owner_id, 
        d.created_at,
        d.mime_type
      FROM "documents" d
      WHERE d.parent_id IS NULL
      ORDER BY d.created_at DESC`
    );

    const documents = result.rows.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      owner_id: doc.owner_id,
      mime_type: doc.mime_type,
      created_at: doc.created_at,
    }));

    res.status(200).json(documents);
  } catch (err) {
    console.error("Erreur récupération documents:", err);
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

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
 *           format: uuid
 *         description: UUID du document à supprimer
 *       - in: header
 *         name: user-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de l'utilisateur connecté
 *     responses:
 *       '204':
 *         description: Supprimé avec succès
 *       '403':
 *         description: Accès refusé (pas propriétaire)
 *       '404':
 *         description: Document non trouvé
 *       '500':
 *         description: Erreur serveur interne
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.headers["user-id"];

    if (!owner_id) {
      return res.status(401).json({ error: "User ID requis (header: user-id)" });
    }

    // Vérifier que le document existe et appartient à l'utilisateur
    const docCheck = await pool.query(
      `SELECT id, file_path, type FROM "documents" WHERE id = $1`,
      [id]
    );

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: "Document non trouvé" });
    }

    const doc = docCheck.rows[0];

    // Vérifier les permissions (propriétaire ou admin)
    const permCheck = await pool.query(
      `SELECT d.owner_id, u.role 
       FROM "documents" d
       JOIN "users" u ON u.id = $1
       WHERE d.id = $2`,
      [owner_id, id]
    );

    if (permCheck.rows.length === 0) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const permission = permCheck.rows[0];
    const isOwner = permission.owner_id === owner_id;
    const isAdmin = permission.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Seul le propriétaire peut supprimer ce document" });
    }

    // Supprimer le fichier du système de fichiers si c'est un fichier
    if (doc.type === "file" && doc.file_path) {
      fs.unlink(doc.file_path, (err) => {
        if (err) console.error("Erreur suppression fichier:", err);
      });
    }

    // Supprimer le document et ses enfants (cascade)
    await pool.query(
      `DELETE FROM "documents" WHERE id = $1`,
      [id]
    );

    res.status(204).send();
  } catch (err) {
    console.error("Erreur suppression document:", err);
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

/**
 * @openapi
 * /documents/file:
 *   post:
 *     summary: Upload d'un document non textuel (PDF, image, …)
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: header
 *         name: user-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de l'utilisateur connecté
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
 *               parent_id:
 *                 type: string
 *                 description: ID du dossier parent (optionnel)
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
 *                 mime_type:
 *                   type: string
 *                 owner_id:
 *                   type: string
 *                 created_at:
 *                   type: string
 *       '400':
 *         description: Fichier manquant
 *       '401':
 *         description: User ID requis
 */
router.post("/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Fichier requis" });
    }

    const { parent_id } = req.body;
    
    // Récupérer l'owner_id depuis le token JWT ou header
    let owner_id = req.headers["user-id"];
    
    if (!owner_id) {
      return res.status(401).json({ error: "User ID requis (header: user-id)" });
    }

    // Valider que c'est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(owner_id)) {
      return res.status(400).json({ error: "User ID invalide (doit être un UUID)" });
    }

    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const filePath = req.file.path;

    // Insérer le document en base de données
    const result = await pool.query(
      `INSERT INTO "documents" 
       (name, type, mime_type, file_path, owner_id, parent_id, content, last_modified_by_id) 
       VALUES ($1, $2, $3, $4, $5, $6, '', $5)
       RETURNING id, name, type, mime_type, owner_id, created_at`,
      [fileName, "file", mimeType, filePath, owner_id, parent_id || null]
    );

    const document = result.rows[0];

    res.status(201).json({
      id: document.id,
      name: document.name,
      type: document.type,
      mime_type: document.mime_type,
      owner_id: document.owner_id,
      created_at: document.created_at,
    });
  } catch (err) {
    console.error("Erreur upload fichier:", err);
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

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
