// backend-api/controllers/userController.js

const db = require("../models");
const Messages = db.Message;
const Document = db.Document;
const DocumentPermission = db.DocumentPermission;
const CollaborationSession = db.CollaborationSession;
const SessionParticipant = db.SessionParticipant;
const { DataTypes } = require("sequelize");
/**
 * Récupère les participants d'une collaboration sur un document.
 */
const getParticipantsByDocumentId = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    try {
        const document = await Document.findByPk(id);
        if (!document) {
            console.log("Document introuvable");
            res.status(400).json({ message: "Document inaccessible" });
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id: id,
                user_id: userId,
            },
        });
        if (!documentPermission) {
            console.log("Aucun droit sur le document");
            res.status(400).json({ message: "Document inaccessible" });
        }
    } catch (error) {
        console.error(
            "Erreur de récupération de la session de collaboration:",
            error
        );
        res.status(500).json({ message: "Erreur serveur interne" });
    }

    try {
        const collaborationSession = await CollaborationSession.findOne({
            where: {
                document_id: id,
            },
        });

        if (!collaborationSession) {
            console.error(
                "La sessions de collaboration n'a pas été trouvée. Le document_id est :",
                id
            );
            return res.status(500).json({ message: "Erreur serveur interne." });
        }

        const participants = await SessionParticipant.findAll({
            where: {
                session_id: collaborationSession.id,
            },
            attributes: [],
            include: [
                {
                    association: "user",
                    attributes: ["display_name", "email"],
                },
            ],
        });

        console.log(participants);

        res.status(200).json({
            participants: participants,
            document_id: id,
        });
    } catch (error) {
        console.error("Erreur de récupération des participants :", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Ajoute un participant sur une collaboration d'un document
 */
const setParticipantByDocumentId = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    try {
        const document = await Document.findByPk(id);
        if (!document) {
            console.log("Document introuvable");
            res.status(400).json({ message: "Document inaccessible" });
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id: id,
                user_id: userId,
            },
        });
        if (!documentPermission) {
            console.log("Aucun droit sur le document");
            res.status(400).json({ message: "Document inaccessible" });
        }
    } catch (error) {
        console.error(
            "Erreur de récupération de la session de collaboration:",
            error
        );
        res.status(500).json({ message: "Erreur serveur interne" });
    }

    try {
        const collaborationSession = await CollaborationSession.findOne({
            where: {
                document_id: id,
            },
        });

        if (!collaborationSession) {
            console.error(
                "La sessions de collaboration n'a pas été trouvée. Le document_id est :",
                id
            );
            return res.status(500).json({ message: "Erreur serveur interne." });
        }

        const sessionParticipant = await SessionParticipant.upsert({
            session_id: collaborationSession.id,
            user_id: userId,
            joined_at: new Date(),
        });

        res.status(200).json({
            sessionParticipant: sessionParticipant,
            user_id: userId,
            document_id: id,
        });
    } catch (error) {
        console.error(
            "Erreur lors de l'ajout d'un participant dans une session",
            error
        );
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Supprime un participant sur une collaboration d'un document
 */
const deleteParticipantByDocumentId = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    try {
        const document = await Document.findByPk(id);
        if (!document) {
            console.log("Document introuvable");
            res.status(400).json({ message: "Document inaccessible" });
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id: id,
                user_id: userId,
            },
        });
        if (!documentPermission) {
            console.log("Aucun droit sur le document");
            res.status(400).json({ message: "Document inaccessible" });
        }
    } catch (error) {
        console.error(
            "Erreur de récupération de la session de collaboration:",
            error
        );
        res.status(500).json({ message: "Erreur serveur interne" });
    }

    try {
        const collaborationSession = await CollaborationSession.findOne({
            where: {
                document_id: id,
            },
        });

        if (!collaborationSession) {
            console.error(
                "La sessions de collaboration n'a pas été trouvée. Le document_id est :",
                id
            );
            return res.status(500).json({ message: "Erreur serveur interne." });
        }

        const sessionParticipant = await SessionParticipant.findOne({
            session_id: collaborationSession.id,
            user_id: userId,
        });

        if (!sessionParticipant) {
            console.error(
                "Le participant recherché ne fait pas partie de la session du document d'id:",
                id
            );
            return res.status(500).json({ message: "Erreur serveur interne." });
        }

        sessionParticipant.destroy();

        res.status(200).json({
            user_id: userId,
            document_id: id,
        });
    } catch (error) {
        console.error(
            "Erreur lors de la suppression d'un participant dans une session",
            error
        );
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

module.exports = {
    getParticipantsByDocumentId,
    setParticipantByDocumentId,
    deleteParticipantByDocumentId,
};
