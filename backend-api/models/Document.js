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
        // Colonnes FK nécessaires pour l'association dans index.js
        owner_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "owner_id",
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
