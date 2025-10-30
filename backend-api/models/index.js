// backend-api/models/index.js (Version temporaire, seulement User et Document)

const { sequelize } = require("../config/db");

const User = require("./User");
const Document = require("./Document");
const DocumentPermission = require("./DocumentPermission");
const CollaborationSession = require('./CollaborationSession');
const SessionParticipant = require('./SessionParticipant');
const Message = require('./Message');

const db = {};

db.sequelize = sequelize;
db.User = User;
db.Document = Document;
db.DocumentPermission = DocumentPermission;
db.CollaborationSession = CollaborationSession;
db.Message = Message;
db.SessionParticipant = SessionParticipant;
// ...

// Associations
db.User.hasMany(db.Document, { foreignKey: "owner_id", as: "ownedDocuments" });
db.Document.belongsTo(db.User, { foreignKey: "owner_id", as: "owner" });

db.User.hasMany(db.Document, {
    foreignKey: "last_modified_by_id",
    as: "modifiedDocuments",
});
db.Document.belongsTo(db.User, {
    foreignKey: "last_modified_by_id",
    as: "lastModifiedBy",
});

// Arborescence de documents (parent_id)
db.Document.hasMany(db.Document, {
    as: 'children',
    foreignKey: 'parent_id',
    onDelete: 'CASCADE',
});
db.Document.belongsTo(db.Document, {
    as: 'parent',
    foreignKey: 'parent_id',
});

/* ======================
   * document_permissions (pivot)
   * users ↔ documents
   * ====================== */

// Many-to-many avec attribut "permission"
db.User.belongsToMany(db.Document, {
    through: db.DocumentPermission,
    as: 'permittedDocuments',
    foreignKey: 'user_id',
    otherKey: 'document_id',
});
db.Document.belongsToMany(db.User, {
    through: db.DocumentPermission,
    as: 'permittedUsers',
    foreignKey: 'document_id',
    otherKey: 'user_id',
});

// Accès direct aux lignes de la table pivot (optionnel mais pratique)
db.User.hasMany(db.DocumentPermission, {
    as: 'documentPermissions',
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
});
db.DocumentPermission.belongsTo(db.User, {
    as: 'user',
    foreignKey: 'user_id',
});
db.Document.hasMany(db.DocumentPermission, {
    as: 'permissions',
    foreignKey: 'document_id',
    onDelete: 'CASCADE',
});
db.DocumentPermission.belongsTo(db.Document, {
    as: 'document',
    foreignKey: 'document_id',
});

/* ======================
* collaboration_sessions
* ====================== */

// Session ↔ Document
db.Document.hasMany(db.CollaborationSession, {
    as: 'sessions',
    foreignKey: 'document_id',
    onDelete: 'CASCADE',
});
db.CollaborationSession.belongsTo(db.Document, {
    as: 'document',
    foreignKey: 'document_id',
});

// Hôte de la session
db.User.hasMany(db.CollaborationSession, {
    as: 'hostedSessions',
    foreignKey: 'host_id',
});
db.CollaborationSession.belongsTo(db.User, {
    as: 'host',
    foreignKey: 'host_id',
});

db.User.belongsToMany(db.CollaborationSession, {
    through: db.SessionParticipant,
    as: 'sessions',
    foreignKey: 'user_id',
    otherKey: 'session_id',
});
db.CollaborationSession.belongsToMany(db.User, {
    through: db.SessionParticipant,
    as: 'participants',
    foreignKey: 'session_id',
    otherKey: 'user_id',
});

// Accès direct au pivot (utile pour joined_at)
db.User.hasMany(db.SessionParticipant, {
    as: 'sessionEdges',
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
});
db.SessionParticipant.belongsTo(db.User, {
    as: 'user',
    foreignKey: 'user_id',
});
db.CollaborationSession.hasMany(db.SessionParticipant, {
    as: 'participantsEdges',
    foreignKey: 'session_id',
    onDelete: 'CASCADE',
});
db.SessionParticipant.belongsTo(db.CollaborationSession, {
    as: 'session',
    foreignKey: 'session_id',
});

db.CollaborationSession.hasMany(db.Message, {
    as: 'messages',
    foreignKey: 'session_id',
    onDelete: 'CASCADE',
});
db.Message.belongsTo(db.CollaborationSession, {
    as: 'session',
    foreignKey: 'session_id',
});

db.User.hasMany(db.Message, {
    as: 'messages',
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
});
db.Message.belongsTo(db.User, {
    as: 'author',
    foreignKey: 'user_id',
});



// Commenter les autres associations basées sur des modèles manquants !

module.exports = db;
