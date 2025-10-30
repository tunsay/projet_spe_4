// backend-api/models/Document.js

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SessionParticipant = sequelize.define(
    "SessionParticipant",
    {
        session_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            field: "session_id",
        },
        user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            field: "user_id",
        },
        // Ajoutez ici les autres colonnes au fur et à mesure
        joined_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "joined_at",
        },
        // ...
    },
    {
        tableName: "session_participants",
        timestamps: false,
    }
);

module.exports = SessionParticipant;