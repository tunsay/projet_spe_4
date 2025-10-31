// backend-api/controllers/userController.js

const db = require("../models");
const Messages = db.Message;
const Document = db.Document;
const DocumentPermission = db.DocumentPermission;
const CollaborationSession = db.CollaborationSession;
const User = db.User;

const pickDisplayName = (rawUser = {}) => {
    if (!rawUser || typeof rawUser !== "object") return null;

    const value =
        rawUser.display_name ||
        rawUser.displayName ||
        rawUser.name ||
        rawUser.fullName ||
        null;

    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }
    return null;
};

const mapMessage = (messageInstance) => {
    if (!messageInstance) return null;

    const plain =
        typeof messageInstance.get === "function"
            ? messageInstance.get({ plain: true })
            : messageInstance;

    const author =
        plain && plain.author && typeof plain.author === "object"
            ? plain.author
            : {};

    return {
        id: plain.id,
        content: plain.content,
        session_id: plain.session_id,
        user_id: plain.user_id,
        created_at: plain.created_at,
        author: {
            id:
                author && typeof author.id === "string"
                    ? author.id
                    : plain.user_id,
            email:
                author && typeof author.email === "string"
                    ? author.email
                    : null,
            display_name: pickDisplayName(author),
        },
    };
};

/**
 * Récupère les messages d'une collaboration sur un document.
 */
const getMessagesBySessionId = async (req, res) => {
    const {id} = req.params;
    const userId = req.userId

    try{
        const document = await Document.findByPk(id);
        if(!document){
            console.log("Document introuvable")
            return res.status(400).json({ message : "Document inaccessible" })
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id : id,
                user_id : userId 
            }
        })
        if(!documentPermission){
            console.log("Aucun droit sur le document")
            return res.status(403).json({ message : "Document inaccessible"})
        }
    } catch (error) {
        console.error("Erreur de récupération de la session de collaboration:", error);
        return res.status(500).json({ message : "Erreur serveur interne" })
    }

    try {
        const collaborationSession = await CollaborationSession.findOne({
            where : {
                document_id : id
            }
        });

        if(!collaborationSession){
            console.error("La sessions de collaboration n'a pas été trouvée. Le document_id est :", id)
            return res.status(500).json({ message : "Erreur serveur interne." })
        }

        const messages = await Messages.findAll({
            where: {
                session_id: collaborationSession.id
            },
            include: [
                {
                    model: User,
                    as: "author",
                    attributes: ["id", "email", "display_name"],
                },
            ],
            order: [["created_at", "ASC"]],
        });

        const formatted = messages
            .map((message) => mapMessage(message))
            .filter(Boolean);

        return res.status(200).json({
            messages: formatted,
            document_id : id,
        });
    } catch (error) {
        console.error("Erreur de récupération du profil:", error);
        return res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Envoie un message sur une collaboration d'un document
 */
const setMessageBySessionsId = async (req, res) => {
    const {id} = req.params;
    const userId = req.userId;

    const {content} = req.body;

    //verification du message
    if(!content){
        console.error("Aucun contenu dans le message envoyé.")
        return res.status(400).json({ message : "Veuillez écrire un message." })
    }

    //verification de l'existance et des droits du document
    try{
        const document = await Document.findByPk(id);
        if(!document){
            console.log("Document introuvable")
            return res.status(400).json({ message : "Document inaccessible" })
        }

        const documentPermission = await DocumentPermission.findOne({
            where: {
                document_id : id,
                user_id : userId 
            }
        })
        if(!documentPermission){
            console.log("Aucun droit sur le document")
            return res.status(403).json({ message : "Document inaccessible"})
        }
    } catch (error) {
        console.error("Erreur de récupération de la session de collaboration:", error);
        return res.status(500).json({ message : "Erreur serveur interne" })
    }

    try {
        const collaborationSession = await CollaborationSession.findOne({
            where : {
                document_id : id
            }
        });

        if(!collaborationSession){
            console.error("La sessions de collaboration n'a pas été trouvée. Le document_id est :", id)
            return res.status(500).json({ message : "Erreur serveur interne." })
        }

        const message = await Messages.create({
            session_id : collaborationSession.id,
            user_id : userId,
            content : content,
        });

        const fullMessage = await Messages.findByPk(message.id, {
            include: [
                {
                    model: User,
                    as: "author",
                    attributes: ["id", "email", "display_name"],
                },
            ],
        });

        return res.status(201).json({
            message: mapMessage(fullMessage),
            user_id: userId,
            document_id: id
        });
    } catch (error) {
        console.error("Erreur lors de l'envoie du message", error);
        return res.status(500).json({ message: "Erreur serveur interne." });
    }
};

/**
 * Modifier un message
 */
const editMessageById = async (req, res) => {
    const {id} = req.params;
    const userId = req.userId;

    const {content} = req.body;

    //verification du message
    if(!content){
        console.error("Aucun contenu dans le message envoyé.")
        return res.status(400).json({ message : "Veuillez écrire un message." })
    }

    //verification de l'existance et des droits du document
    try{
        const message = await Messages.findByPk(id);

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
    const {id} = req.params;
    const userId = req.userId;

    //verification de l'existance et des droits du document
    try{
        const message = await Messages.findByPk(id);

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
