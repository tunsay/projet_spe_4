// backend-api/models/Document.js

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Message = sequelize.define(
    "Message",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        // Ajoutez ici les autres colonnes au fur et à mesure
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: "content",
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "created_at",
        },
        // Colonnes FK nécessaires pour l'association dans index.js
        session_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "session_id",
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "user_id",
        },
        // ...
    },
    {
        tableName: "messages",
        timestamps: false,
    }
);

module.exports = Message;
