const express = require("express");
const router = express.Router();

const { getParticipantsByDocumentId, setParticipantByDocumentId, deleteParticipantByDocumentId } = require("../controllers/sessionParticipantController.js")

/**
 * @openapi
 * /sessions/{id}:
 *   get:
 *     summary: Récupère les participants de la collaboration d'un document
 *     tags:
 *       - SessionParticipant
 *     parameter:
 *       - id du document
 *     responses:
 *       '200':
 *         description: OK
 *         
 */
router.get("/:id", getParticipantsByDocumentId);

/**
 * @openapi
 * /sessions/{id}:
 *   post:
 *     summary: Ajoute un participant dans la collaboration d'un document
 *     tags:
 *       - SessionParticipant
 *     parameter:
 *       - id du document
 */
router.post("/:id", setParticipantByDocumentId);


/**
 * @openapi
 * /sessions/{id}:
 *   delete:
 *     summary: Supprime un participant de la collaboration d'un document
 *     tags:
 *       - SessionParticipant
 *     parameter:
 *       - id du document
 */
router.delete("/:id", deleteParticipantByDocumentId);



module.exports = router;
