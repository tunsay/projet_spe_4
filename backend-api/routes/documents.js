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
 *   get:
 *     summary: Récupère les détails d'un document
 *     tags:
 *       - Documents
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID du document
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
 *                   enum:
 *                     - file
 *                     - folder
 *                 owner_id:
 *                   type: string
 *                 mime_type:
 *                   type: string
 *                 content:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                 last_modified_at:
 *                   type: string
 *       '404':
 *         description: Document non trouvé
 *       '500':
 *         description: Erreur serveur interne
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Valider UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "ID invalide (doit être un UUID)" });
    }

    // Récupérer le document
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        type, 
        owner_id, 
        mime_type,
        content,
        created_at,
        last_modified_at
      FROM "documents" 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document non trouvé" });
    }

    const document = result.rows[0];

    res.status(200).json({
      id: document.id,
      name: document.name,
      type: document.type,
      owner_id: document.owner_id,
      mime_type: document.mime_type,
      content: document.content,
      created_at: document.created_at,
      last_modified_at: document.last_modified_at,
    });
  } catch (err) {
    console.error("Erreur récupération document:", err);
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

    // Vérifier que l'utilisateur existe en base de données
    const userCheck = await pool.query(
      `SELECT id FROM "users" WHERE id = $1`,
      [owner_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Valider parent_id si fourni
    if (parent_id && parent_id.trim() !== "") {
      if (!uuidRegex.test(parent_id)) {
        return res.status(400).json({ error: "Parent ID invalide (doit être un UUID)" });
      }
      
      // Vérifier que le parent existe
      const parentCheck = await pool.query(
        `SELECT id FROM "documents" WHERE id = $1`,
        [parent_id]
      );
      
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Dossier parent non trouvé" });
      }
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
 *           format: uuid
 *         description: UUID du document à remplacer
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
 *     responses:
 *       '200':
 *         description: Document remplacé avec succès
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
 *                 updated_at:
 *                   type: string
 *       '400':
 *         description: Fichier manquant
 *       '401':
 *         description: User ID requis
 *       '403':
 *         description: Accès refusé (pas propriétaire)
 *       '404':
 *         description: Document non trouvé
 */
router.put("/file/:id", upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.headers["user-id"];

    if (!req.file) {
      return res.status(400).json({ error: "Fichier requis" });
    }

    if (!owner_id) {
      return res.status(401).json({ error: "User ID requis (header: user-id)" });
    }

    // Valider UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(owner_id)) {
      return res.status(400).json({ error: "User ID invalide (doit être un UUID)" });
    }

    // Vérifier que le document existe
    const docCheck = await pool.query(
      `SELECT id, file_path, owner_id FROM "documents" WHERE id = $1`,
      [id]
    );

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: "Document non trouvé" });
    }

    const oldDoc = docCheck.rows[0];

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
      return res.status(403).json({ error: "Seul le propriétaire peut remplacer ce document" });
    }

    // Supprimer l'ancien fichier
    if (oldDoc.file_path) {
      fs.unlink(oldDoc.file_path, (err) => {
        if (err) console.error("Erreur suppression ancien fichier:", err);
      });
    }

    // Mettre à jour le document
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const filePath = req.file.path;

    const result = await pool.query(
      `UPDATE "documents" 
       SET name = $1, mime_type = $2, file_path = $3, last_modified_by_id = $4, last_modified_at = NOW()
       WHERE id = $5
       RETURNING id, name, type, mime_type, owner_id, last_modified_at`,
      [fileName, mimeType, filePath, owner_id, id]
    );

    const document = result.rows[0];

    res.status(200).json({
      id: document.id,
      name: document.name,
      type: document.type,
      mime_type: document.mime_type,
      owner_id: document.owner_id,
      updated_at: document.last_modified_at,
    });
  } catch (err) {
    console.error("Erreur remplacement fichier:", err);
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

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
 *           format: uuid
 *         description: UUID du document
 *       - in: header
 *         name: user-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de l'utilisateur connecté (propriétaire)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - permission
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               permission:
 *                 type: string
 *                 enum:
 *                   - read
 *                   - edit
 *                   - owner
 *     responses:
 *       '201':
 *         description: Permission accordée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user_email:
 *                   type: string
 *                 permission:
 *                   type: string
 *       '400':
 *         description: Email ou permission manquant
 *       '401':
 *         description: User ID requis
 *       '403':
 *         description: Seul le propriétaire peut inviter
 *       '404':
 *         description: Document ou utilisateur non trouvé
 */
router.post("/:id/invite", async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.headers["user-id"];
    const { email, permission } = req.body;

    if (!owner_id) {
      return res.status(401).json({ error: "User ID requis (header: user-id)" });
    }

    if (!email || !permission) {
      return res.status(400).json({ error: "Email et permission requis" });
    }

    if (!["read", "edit", "owner"].includes(permission)) {
      return res.status(400).json({ error: "Permission invalide (read, edit, owner)" });
    }

    // Vérifier que le document existe et appartient à l'utilisateur
    const docCheck = await pool.query(
      `SELECT owner_id FROM "documents" WHERE id = $1`,
      [id]
    );

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: "Document non trouvé" });
    }

    const doc = docCheck.rows[0];

    // Vérifier que c'est le propriétaire qui invite
    if (doc.owner_id !== owner_id) {
      return res.status(403).json({ error: "Seul le propriétaire peut inviter" });
    }

    // Trouver l'utilisateur par email
    const userCheck = await pool.query(
      `SELECT id FROM "users" WHERE email = $1`,
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const user = userCheck.rows[0];

    // Vérifier si une permission existe déjà
    const permCheck = await pool.query(
      `SELECT permission FROM "document_permissions" WHERE user_id = $1 AND document_id = $2`,
      [user.id, id]
    );

    if (permCheck.rows.length > 0) {
      // Mettre à jour la permission existante
      await pool.query(
        `UPDATE "document_permissions" SET permission = $1 WHERE user_id = $2 AND document_id = $3`,
        [permission, user.id, id]
      );
    } else {
      // Créer une nouvelle permission
      await pool.query(
        `INSERT INTO "document_permissions" (user_id, document_id, permission) VALUES ($1, $2, $3)`,
        [user.id, id, permission]
      );
    }

    res.status(201).json({
      message: "Permission accordée avec succès",
      user_email: email,
      permission: permission,
    });
  } catch (err) {
    console.error("Erreur invitation:", err);
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});



module.exports = router;
