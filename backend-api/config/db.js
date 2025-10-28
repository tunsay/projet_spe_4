// backend-api/config/db.js
const { Sequelize } = require("sequelize");

// Les informations de connexion sont généralement dans process.env
// Assurez-vous qu'elles sont définies dans Docker/docker-compose.yml

const sequelize = new Sequelize(
    process.env.DB_NAME, // Nom de la BDD
    process.env.DB_USER, // Utilisateur
    process.env.DB_PASSWORD, // Mot de passe
    {
        host: process.env.DB_HOST || "localhost", // Nom du service DB dans Docker
        dialect: "postgres",
        logging: false, // Mettez à true pour voir les requêtes SQL générées
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

// Tente de se connecter à la base de données
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connexion à la base de données réussie avec Sequelize.");
        // Optionnel : synchroniser les modèles (uniquement pour le développement initial)
        // await sequelize.sync();
    } catch (error) {
        console.error(
            "Impossible de se connecter à la base de données:",
            error
        );
        // Quitter si la connexion échoue
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
