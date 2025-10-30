// backend-api/models/index.js (Version temporaire, seulement User et Document)

const { sequelize } = require("../config/db");

const User = require("./User");
const Document = require("./Document");
const DocumentPermission = require("./DocumentPermission");
const CollaborationSession = require('./CollaborationSession');
// const SessionParticipant = require('./SessionParticipant');
const Message = require('./Message');

const db = {};

db.sequelize = sequelize;
db.User = User;
db.Document = Document;
db.DocumentPermission = DocumentPermission;
db.CollaborationSession = CollaborationSession;
db.Message = Message;
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

// Commenter les autres associations basées sur des modèles manquants !

module.exports = db;
