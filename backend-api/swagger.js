// backend-api/swagger.js
const fs = require("node:fs");
const path = require("node:path");
const swaggerJSDoc = require("swagger-jsdoc");

// Liste explicite et déterministe des fichiers scannés (UNIQUEMENT routes/*.js)
const apiFiles = [
    path.join(__dirname, "routes", "auth.js"),
    path.join(__dirname, "routes", "documents.js"),
    path.join(__dirname, "routes", "admin.js"),
    path.join(__dirname, "routes", "profile.js"),
];

// Logs utiles au démarrage (debug)
console.log(
    "[swagger][scan]",
    apiFiles.map((p) => path.relative(__dirname, p))
);

const options = {
    definition: {
        openapi: "3.0.0",
        info: { title: "API Wiki Collaboratif", version: "1.0.0" },
        // Garde /api ici ; donc les paths annotés NE DOIVENT PAS commencer par /api
        servers: [
            { url: "http://localhost:3000/api", description: "Local dev" },
        ],
    },
    apis: apiFiles,
    failOnErrors: true,
};

const spec = swaggerJSDoc(options);
console.log("[swagger][paths]", Object.keys(spec.paths || {}));

module.exports = spec; // <- exporte UN SEUL objet, pas de fallback ni merge ailleurs
