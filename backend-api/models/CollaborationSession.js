// backend-api/models/Document.js

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const CollaborationSession = sequelize.define(
    "CollaborationSession",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // Ajoutez ici les autres colonnes au fur et à mesure
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "created_at",
        },
        // Colonnes FK nécessaires pour l'association dans index.js
        document_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "document_id",
        },
        host_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "host_id",
        },
        // ...
    },
    {
        tableName: "collaboration_sessions",
        timestamps: false,
    }
);

module.exports = CollaborationSession;