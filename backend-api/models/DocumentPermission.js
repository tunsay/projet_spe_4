// backend-api/models/Document.js

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const DocumentPermission = sequelize.define(
    "DocumentPermission",
    {
        user_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        document_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        // Ajoutez ici les autres colonnes au fur et à mesure
        role: {
            type: DataTypes.ENUM("read", "edit", "owner"),
            allowNull: false,
            defaultValue: "read",
        },
        // ...
    },
    {
        tableName: "document_permissions",
        timestamps: false,
    }
);

module.exports = DocumentPermission;
