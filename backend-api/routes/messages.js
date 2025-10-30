const express = require("express");
const router = express.Router();

const { getMessagesBySessionId, setMessageBySessionsId, editMessageById, deleteMessageById } = require("../controllers/messageController")

/**
 * @openapi
 * /messages/{id}:
 *   get:
 *     summary: Récupère les messages sur la collaboration d'un document
 *     tags:
 *       - Messages
 *     paramater:
 *       - id du document
 *     responses:
 *       '200':
 *         description: OK
 *         
 */
router.get("/:id", getMessagesBySessionId);

/**
 * @openapi
 * /messages/{id}:
 *   post:
 *     summary: Envoie un message sur la collaboration d'un document
 *     tags:
 *       - Messages
 *     paramater:
 *       - id du document
 */
router.post("/:id", setMessageBySessionsId);

/**
 * @openapi
 * /messages/{id}:
 *   put:
 *     summary: Modifier un message
 *     tags:
 *       - Messages
 *     paramater:
 *       - id du message
 */
router.put("/:id", editMessageById);


/**
 * @openapi
 * /messages/{id}:
 *   delete:
 *     summary: Supprimer un message
 *     tags:
 *       - Messages
 *     parameters:
 *       - id du message
 */
router.delete("/:id", deleteMessageById);



module.exports = router;
