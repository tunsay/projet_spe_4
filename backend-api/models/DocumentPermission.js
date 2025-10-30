// backend-api/models/Document.js

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const DocumentPermission = sequelize.define(
    "DocumentPermission",
    {
        user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            field: "user_id",
        },
        document_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            field: "document_id",
        },
        // Ajoutez ici les autres colonnes au fur et à mesure
        permission: {
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
