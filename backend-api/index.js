const path = require("path");
const fs = require("fs");

// Définir le chemin vers le .env (un niveau au-dessus de backend-api/)
const dotenvPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(dotenvPath)) {
    // Charger les variables d'environnement si le fichier est trouvé
    require("dotenv").config({ path: dotenvPath });
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger.js");

const auth = require("./middleware/auth.js"); // Middleware d'authentification principal (JWT ou Token de test)
const adminAuth = require("./middleware/adminAuth.js"); // Middleware d'authentification admin

const authRoutes = require("./routes/auth.js");
const profileRoutes = require("./routes/profile.js");
const adminRoutes = require("./routes/admin.js");
const documentRoutes = require("./routes/documents.js");
const messageRoutes = require("./routes/messages.js");
const sessionsRoutes = require("./routes/sessions.js");

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Configuration CORS ---
const CORS_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
];

app.use(
    cors({
        origin: CORS_ORIGINS,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-User-ID-Test",
            "user-id",
        ],
        // Utilisez 'true' si vous gérez l'authentification par cookies
        credentials: true,
    })
);

// Gestion des requêtes OPTIONS (pre-flight CORS)
app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

// --- Documentation Swagger ---
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

app.use("/api-docs", swaggerUi.serveFiles(swaggerSpec, {}), (_req, res) => {
    res.send(`<!doctype html>
<html><head>
  <meta charset="utf-8" />
  <title>API Docs</title>
  <link rel="stylesheet" href="./swagger-ui.css" />
</head><body>
  <div id="swagger-ui"></div>
  <script src="./swagger-ui-bundle.js"></script>
  <script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '/openapi.json?_=' + Date.now(),
      dom_id: '#swagger-ui',
      deepLinking: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    });
  };
  </script>
</body></html>`);
});

// --- Routes Générales ---
app.get("/", (_req, res) => res.status(200).send("API Server is Running"));
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// --- Routes API ---
app.use("/api/auth", authRoutes); // Authentification (login, register)

// Correction: Le middleware 'auth' est manquant sur /api/profile dans l'ancienne version.
// Il est essentiel pour toutes les routes de profil qui nécessitent l'utilisateur connecté.
app.use("/api/profile", auth, profileRoutes); // Profil utilisateur (nécessite d'être connecté)

app.use("/api/admin", adminRoutes); // Routes d'administration (nécessite d'être admin)
app.use("/api/documents", auth, documentRoutes); // Routes de documents (nécessite d'être connecté)
app.use("/api/messages", auth, messageRoutes); // Routes de messages (nécessite d'être connecté)
app.use("/api/sessions", auth, sessionsRoutes); // Routes des participants de sessions (nécessite d'être connecté)

// --- Gestion des Erreurs et 404 ---
app.use("/api", (_req, res) => res.status(404).json({ error: "Not Found" }));

app.use((err, _req, res, _next) => {
    console.error("[error]", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
