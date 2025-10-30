// backend-api/controllers/userController.js

const db = require("../models");
const Messages = db.Message;
const Document = db.Document;
const DocumentPermission = db.DocumentPermission;
const CollaborationSession = db.CollaborationSession;

/**
 * Récupère les messages d'une collaboration sur un document.
 */
const getMessagesBySessionId = async (req, res) => {
    const documentId = req.id;
    const userId = req.UserId

    try{
        const document = await Document.findByPk(documentId);
        if(!document){
            console.log("Document introuvable")
            res.status(400).json({ message : "Document inaccessible" })
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id : documentId,
                user_id : userId 
            }
        })
        if(!documentPermission){
            console.log("Aucun droit sur le document")
            res.status(400).json({ message : "Document inaccessible"})
        }
    } catch (error) {
        console.error("Erreur de récupération de la session de collaboration:", error);
        res.status(500).json({ message : "Erreur serveur interne" })
    }

    try {
        const messages = await Messages.findAll({
            where: {
                document_id: documentId
            }
        });

        res.status(200).json({
            messages: messages | [],
            document_id : documentId,
            document_last_modified_at : document.last_modified_at
        });
    } catch (error) {
        console.error("Erreur de récupération du profil:", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Envoie un message sur une collaboration d'un document
 */
const setMessageBySessionsId = async (req, res) => {
    const documentId = req.id;
    const userId = req.userId;

    const {content} = req.body;

    //verification du message
    if(!content){
        console.error("Aucun contenu dans le message envoyé.")
        return res.status(400).json({ message : "Veuillez écrire un message." })
    }

    //verification de l'existance et des droits du document
    try{
        const document = await Document.findByPk(documentId);
        if(!document){
            console.log("Document introuvable")
            res.status(400).json({ message : "Document inaccessible" })
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id : documentId,
                user_id : userId 
            }
        })
        if(!documentPermission){
            console.log("Aucun droit sur le document")
            res.status(400).json({ message : "Document inaccessible"})
        }
    } catch (error) {
        console.error("Erreur de récupération de la session de collaboration:", error);
        res.status(500).json({ message : "Erreur serveur interne" })
    }

    try {
        const collaborationSession = await CollaborationSession.findOne({
            where : {
                document_id : documentId
            }
        });

        if(!collaborationSession){
            console.error("La sessions de collaboration n'a pas été trouvée. Le document_id est :", documentId)
            return res.status(500).json({ message : "Erreur serveur interne." })
        }

        const message = await Messages.create({
            session_id : collaborationSession.id,
            user_id : userId,
            content : content,
        })

        res.status(200).json({
            // Le secret est renvoyé car il est nécessaire pour la vérification, mais il est maintenant stocké.
            message: message,
            user_id: userId,
            document_id: documentId
        });
    } catch (error) {
        console.error("Erreur lors de l'envoie du message", error);
        res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Modifier un message
 */
const editMessageById = async (req, res) => {
    const messageId = req.id;
    const userId = req.userId;

    const {content} = req.body;

    //verification du message
    if(!content){
        console.error("Aucun contenu dans le message envoyé.")
        return res.status(400).json({ message : "Veuillez écrire un message." })
    }

    //verification de l'existance et des droits du document
    try{
        const message = await Messages.findByPk(messageId);

        if(!message){
            console.log("Message introuvable")
            res.status(400).json({ message : "Opération impossible" })
        }

        if(message.user_id != userId){
            console.log("L'utilisateur n'est pas le propriétaire du message")
            res.status(400).json({ message : "Opération impossible" })
        }

        const collaborationSession = await CollaborationSession.findByPk(message.session_id);

        if(!collaborationSession){
            console.log("Session introuvable")
            res.status(400).json({ message : "Opération impossible" })
        }

        const document = await Document.findByPk(collaborationSession.document_id);
        if(!document){
            console.log("Document introuvable")
            res.status(400).json({ message : "Document inaccessible" })
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id : document.id,
                user_id : userId 
            }
        })
        if(!documentPermission){
            console.log("Aucun droit sur le document")
            res.status(400).json({ message : "Document inaccessible"})
        }

        message.content = content;

        message.save();

        res.status(200).json({
            message: message,
            user_id: userId,
        });
    } catch (error) {
        console.error("Erreur lors de la modification du message :", error);
        res.status(500).json({ message : "Erreur serveur interne" })
    }
};

/**
 * Supprimer un message
 */
const deleteMessageById = async (req, res) => {
    const messageId = req.id;
    const userId = req.userId;

    //verification de l'existance et des droits du document
    try{
        const message = await Messages.findByPk(messageId);

        if(!message){
            console.log("Message introuvable")
            res.status(400).json({ message : "Opération impossible" })
        }

        if(message.user_id != userId){
            console.log("L'utilisateur n'est pas le propriétaire du message")
            res.status(400).json({ message : "Opération impossible" })
        }

        const collaborationSession = await CollaborationSession.findByPk(message.session_id);

        if(!collaborationSession){
            console.log("Session introuvable")
            res.status(400).json({ message : "Opération impossible" })
        }

        const document = await Document.findByPk(collaborationSession.document_id);
        if(!document){
            console.log("Document introuvable")
            res.status(400).json({ message : "Document inaccessible" })
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id : document.id,
                user_id : userId 
            }
        })
        if(!documentPermission){
            console.log("Aucun droit sur le document")
            res.status(400).json({ message : "Document inaccessible"})
        }

        message.destroy();

        res.status(200).json({
            message: message,
            user_id: userId,
        });
    } catch (error) {
        console.error("Erreur lors de la modification du message :", error);
        res.status(500).json({ message : "Erreur serveur interne" })
    }
};

module.exports = {
    getMessagesBySessionId,
    setMessageBySessionsId,
    editMessageById,
    deleteMessageById
};
