// backend-api/models/Document.js

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Document = sequelize.define(
    "Document",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // Ajoutez ici les autres colonnes au fur et à mesure
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM("text", "img", "pdf"),
            allowNull: false,
            defaultValue: "text",
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        file_path: {
            type: DataTypes.STRING(1024),
        },
        mime_type: {
            type: DataTypes.STRING(100),
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "created_at",
        },
        last_modified_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "last_modified_at",
        },
        // Colonnes FK nécessaires pour l'association dans index.js
        owner_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "owner_id",
        },
        parent_id: {
            type: DataTypes.UUID,
            allowNull: true,
            field: "parent_id",
        },
        last_modified_by_id: {
            type: DataTypes.UUID,
            field: "last_modified_by_id",
        },
        // ...
    },
    {
        tableName: "documents",
        timestamps: false,
    }
);

module.exports = Document;
