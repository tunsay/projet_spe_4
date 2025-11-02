# WikiDrive - Plateforme Collaborative de Documents

## 🚀 Lancement Rapide

### Prérequis

- **Développement** : Node.js 20+, PostgreSQL 15+
- **Production** : Docker & Docker Compose

### Variables d'Environnement

Créer un fichier `.env` à la racine du projet :

```bash
# Base de données
DB_HOST=localhost          # ou 'db' en Docker
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=wikidrive

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-me

# API REST
API_PORT=3000

# WebSocket
WS_PORT=3001

# Cookies args
COOKIE_DOMAIN=localhost
COOKIE_SECURE=true
COOKIE_SAMESITE=Strict
JWT_TTL=1h

# Frontend (pour Docker uniquement)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

Pour le frontend en développement, créer `frontend/.env.local` :

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## 🔧 Mode Développement

### 1️⃣ Base de Données

Créer la base de données PostgreSQL :

```bash
psql -U postgres
CREATE DATABASE wikidrive;
\q
```

Initialiser les tables :

```bash
psql -U postgres -d wikidrive -f init_scripts/01-schema.sql
psql -U postgres -d wikidrive -f init_scripts/02-seed-data.sql
```

### 2️⃣ Backend API

```bash
cd backend-api
npm install
npm run dev
```

L'API sera accessible sur `http://localhost:3000`  
Documentation Swagger : `http://localhost:3000/api-docs`

### 3️⃣ Backend WebSocket

```bash
cd backend-ws
npm install
npm start
```

Le serveur WebSocket sera accessible sur `http://localhost:3001`

### 4️⃣ Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:3000` (Next.js utilise le port 3000 par défaut)

> **Note** : Le frontend utilisera automatiquement les variables de `.env.local`

---

## 🐳 Mode Production (Docker)

### Lancement complet

Depuis la racine du projet :

```bash
# Construire et démarrer tous les services
docker compose up --build

# Ou en arrière-plan
docker compose up -d --build
```

### Lancement service par service

Vous pouvez également lancer les services individuellement dans l'ordre suivant :

```bash
# 1. D'abord la base de données
docker compose up -d --build db

# 2. Ensuite l'API REST (dépend de la DB)
docker compose up -d --build api

# 3. Puis le serveur WebSocket (dépend de l'API)
docker compose up -d --build websocket

# 4. Enfin le frontend (dépend de l'API et du WebSocket)
docker compose up -d --build front
```

> **Astuce** : Lancer les services un par un permet de mieux diagnostiquer les problèmes de démarrage et de voir les logs de chaque service séparément.

### Services disponibles

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:8081 | Application Next.js |
| API REST | http://localhost:3000 | API Express + Swagger |
| WebSocket | http://localhost:3001 | Socket.IO |
| PostgreSQL | localhost:5432 | Base de données |

### Swagger API

Documentation interactive disponible sur :  
**http://localhost:3000/api-docs**

---

## 🛠️ Commandes Docker Utiles

```bash
# Voir les logs de tous les services
docker compose logs -f

# Voir les logs d'un service spécifique
docker compose logs -f front
docker compose logs -f api
docker compose logs -f websocket
docker compose logs -f db

# Vérifier l'état des services
docker compose ps

# Arrêter les services
docker compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker compose down -v

# Reconstruire un service spécifique
docker compose up --build front

# Redémarrer un service
docker compose restart api
```

### Résolution de problèmes

Si vous rencontrez des erreurs de build :

```bash
# Nettoyer le cache Docker
docker system prune -a

# Reconstruire sans cache
docker compose build --no-cache
docker compose up
```

---

##  Debugging

### Vérifier la connectivité

```bash
# Tester l'API
curl http://localhost:3000/api/profile

# Tester le WebSocket (nécessite un client Socket.IO)
# Ou ouvrir l'application frontend et regarder la console
```

### Logs détaillés

```bash
# En développement
npm run dev  # Les logs apparaissent dans la console

# En production Docker
docker compose logs -f [service-name]
```

---

## � Documentation

Pour plus d'informations sur l'architecture, les choix techniques et organisationnels, consultez [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## 👥 Auteurs

- **Sergio**
- **Bryan**
- **David**
- **Tuna**

Projet réalisé dans le cadre de la formation LiveCampus.
