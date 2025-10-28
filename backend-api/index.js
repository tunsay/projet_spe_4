require("dotenv").config({path: '../.env'});
// backend-api/index.js
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger.js");
const cookieParser = require("cookie-parser");

// Routers
const authRoutes = require("./routes/auth.js");
const profileRoutes = require("./routes/profile.js");
const adminRoutes = require("./routes/admin.js");
const documentRoutes = require("./routes/documents.js");

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- UNIQUE source pour l’UI : la spec live ----
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

// ---- Swagger UI : charge UNIQUEMENT /openapi.json ----
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
      url: '/openapi.json?_=' + Date.now(), // cache-bust
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

//verification de la connexion
const auth = require("./middleware/auth.js")
const adminAuth = require("./middleware/adminAuth.js")

// Health
app.get("/", (_req, res) => res.status(200).send("API Server is Running"));
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// Routes API montées sous /api
app.use("/api/auth", authRoutes);
app.use("/api/profile", auth, profileRoutes);
app.use("/api/admin", adminAuth, adminRoutes);
app.use("/api/documents", auth, documentRoutes);

// 404 API
app.use("/api", (_req, res) => res.status(404).json({ error: "Not Found" }));

// Errors
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error("[error]", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
