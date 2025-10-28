import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { execSync } from "child_process";

// Pour résoudre le chemin dans un module ES (mjs)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemins corrects : remonter d'un niveau (..) pour trouver le .env à la racine du projet
const envPath = path.resolve(__dirname, "..", ".env");

// Charge les variables d'environnement dans process.env
dotenv.config({ path: envPath });

// Lance la commande Next.js après le chargement des variables
execSync("next dev", { stdio: "inherit" });
