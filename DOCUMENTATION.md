# WikiDrive - Documentation Technique

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du Projet](#architecture-du-projet)
3. [Choix Organisationnels](#choix-organisationnels)
4. [Choix Techniques](#choix-techniques)
5. [Choix Architecturaux](#choix-architecturaux)
6. [Structure des Services](#structure-des-services)
7. [Base de Données](#base-de-données)
8. [Sécurité](#sécurité)
9. [Fonctionnalités Détaillées](#fonctionnalités-détaillées)
10. [Flux d'Exécution](#flux-dexécution)

---

## Vue d'ensemble

WikiDrive est une plateforme collaborative en temps réel permettant de gérer des documents, dossiers et fichiers avec authentification 2FA, système de permissions et édition collaborative. Le projet suit une architecture microservices avec séparation claire des responsabilités.

### Objectifs du Projet

- Fournir une plateforme collaborative sécurisée
- Permettre l'édition en temps réel de documents textuels
- Gérer une hiérarchie de dossiers et fichiers
- Implémenter un système d'authentification robuste avec 2FA
- Offrir un système de permissions granulaire (read, edit, owner)
- Permettre l'upload et le téléchargement de fichiers

---

## Architecture du Projet

### Structure des Dossiers

```
projet_spe_4/
├── .dockerignore              # Fichiers à ignorer par Docker
├── .env                       # Variables d'environnement (non versionné)
├── .env.example              # Template des variables d'environnement
├── .gitignore                # Fichiers ignorés par Git
├── docker-compose.yml        # Orchestration des services Docker
├── README.md                 # Instructions de lancement
├── DOCUMENTATION.md          # Ce fichier
├── backend-api/              # API REST (Express + PostgreSQL)
│   ├── config/
│   │   └── db.js            # Configuration Sequelize + Pool PostgreSQL
│   ├── controllers/         # Logique métier
│   │   ├── authController.js              # Login, Register, 2FA
│   │   ├── userController.js              # Profil utilisateur
│   │   ├── messageController.js           # Messages de chat
│   │   └── sessionParticipantController.js # Participants aux sessions
│   ├── middleware/
│   │   ├── auth.js          # Vérification JWT
│   │   └── adminAuth.js     # Vérification rôle admin
│   ├── models/              # Modèles Sequelize
│   │   ├── User.js
│   │   ├── Document.js
│   │   ├── DocumentPermission.js
│   │   ├── CollaborationSession.js
│   │   ├── SessionParticipant.js
│   │   ├── Message.js
│   │   └── index.js         # Point d'entrée des modèles
│   ├── routes/              # Routes API
│   │   ├── auth.js          # Routes d'authentification
│   │   ├── profile.js       # Routes de profil utilisateur
│   │   ├── admin.js         # Routes d'administration
│   │   ├── documents.js     # CRUD documents + permissions
│   │   ├── sessions.js      # Sessions de collaboration
│   │   └── messages.js      # Messages de chat
│   ├── services/
│   │   └── twoFactorService.js # Service 2FA (Speakeasy)
│   ├── uploads/             # Fichiers uploadés
│   ├── index.js            # Point d'entrée du serveur
│   ├── swagger.js          # Configuration Swagger/OpenAPI
│   ├── openapi.json        # Spécification OpenAPI
│   ├── Dockerfile
│   └── package.json
├── backend-ws/              # Serveur WebSocket (Socket.IO)
│   ├── api/
│   │   └── documents.js    # Appels HTTP vers backend-api
│   ├── services/
│   │   ├── documents.js    # Logique de gestion des documents
│   │   └── messages.js     # Logique de messagerie temps réel
│   ├── index.js           # Point d'entrée Socket.IO
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Application Next.js 14
│   ├── app/
│   │   ├── (auth)/        # Groupe de routes sans layout principal
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (main)/        # Groupe de routes avec Header
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx   # Dashboard
│   │   │   ├── admin/
│   │   │   │   └── page.tsx # Panel d'administration
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx # Liste des documents
│   │   │   │   ├── _components/
│   │   │   │   │   ├── DocumentTextSection.tsx
│   │   │   │   │   ├── CollaborationSidebar.tsx
│   │   │   │   │   ├── InviteCollaboratorModal.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Éditeur collaboratif
│   │   │   └── profile/
│   │   │       ├── page.tsx # Profil utilisateur & gestion
│   │   │       └── 2fa/
│   │   │           └── page.tsx # Page dédiée 2FA
│   │   ├── components/    # Composants réutilisables
│   │   │   ├── Header.tsx
│   │   │   ├── DocumentsPage.tsx
│   │   │   └── ...
│   │   ├── globals.css
│   │   └── layout.tsx     # Layout racine
│   ├── hooks/             # Hooks personnalisés
│   │   ├── useDoc.ts
│   │   ├── useRoomDocument.ts
│   │   └── useSocket.ts
│   ├── lib/               # Utilitaires
│   │   ├── api.ts         # Configuration des appels API
│   │   └── auth.ts        # Gestion de l'authentification
│   ├── types/             # Types TypeScript
│   │   └── documents.ts
│   ├── utils/
│   │   └── message.ts
│   ├── public/            # Assets statiques
│   ├── middleware.ts      # Middleware Next.js (auth)
│   ├── envConfig.ts       # Chargement des variables d'env
│   ├── load-env.mjs       # Script pour charger .env avant dev
│   ├── Dockerfile
│   ├── .env.local        # Variables d'env (dev)
│   ├── .env.production   # Variables d'env (prod)
│   ├── .env.example      # Template des variables
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
└── init_scripts/          # Scripts SQL d'initialisation
    ├── 01-schema.sql      # Création des tables et types
    └── 02-seed-data.sql   # Données de test
```

### Diagramme d'Architecture

```
┌─────────────────┐
│   Utilisateur   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Frontend (Next.js - Port 3000)    │
│   - React Components (TypeScript)   │
│   - Socket.IO Client                │
│   - Middleware Auth (Next.js)       │
│   - Locale: FR                      │
└────────┬────────────────────────────┘
         │
         ├──────────────────────┬
         │                      │              
         ▼                      ▼              
┌─────────────┐          ┌──────────────┐ ┌────────────┐
│  Backend    │          │   Backend    │ │ PostgreSQL │
│  API        │          │  WebSocket   │ │   (5432)   │
│ (Port 3000) │          │ (Port 3001)  │ └────────────┘
│             │          │              │       ▲
│ - Express   │ <─────── │ - Socket.IO  │       │
│ - Sequelize │          │ - Temps réel │       │
│ - JWT       │          │ - Chat       │       │
│ - Swagger   │          │ - Collab     │       │
│ - Multer    │          │ - Présence   │       │
└─────────────┘          └──────────────┘       │
       │                                        │
       └────────────────────────────────────────┘
```

---

## Choix Organisationnels

### 1. Architecture Microservices

**Décision** : Séparation en 3 services distincts (API, WebSocket, Frontend)

**Raisons** :
- **Scalabilité** : Chaque service peut être scalé indépendamment
- **Maintenance** : Code plus facile à maintenir et à tester
- **Spécialisation** : Chaque service a une responsabilité claire
- **Déploiement** : Possibilité de déployer/mettre à jour les services séparément

### 2. Séparation Backend API / WebSocket

**Décision** : Deux serveurs backend distincts au lieu d'un serveur unique

**Raisons** :
- **Performance** : Le serveur WebSocket gère uniquement les connexions temps réel
- **Scalabilité** : Possible de scaler le WebSocket indépendamment de l'API REST
- **Clarté** : Séparation claire entre logique REST et temps réel
- **Sécurité** : Isolation des responsabilités

### 3. Organisation du Code Frontend

**Décision** : Utilisation du système de routing par dossiers de Next.js 14 (App Router)

**Raisons** :
- **Groupes de routes** : `(auth)` et `(main)` pour différents layouts
- **Layouts imbriqués** : Header uniquement sur les pages authentifiées
- **File-based routing** : Structure intuitive et conventionnelle
- **Middleware** : Protection des routes au niveau du routing
- **TypeScript** : Support natif

### 4. Approche Hybride ORM + Pool Brut

**Décision** : Utilisation conjointe de Sequelize ORM et PostgreSQL Pool brut

**Raisons** :
- **Sequelize** : Pour models, associations, et CRUD standards
- **Pool brut** : Pour des requêtes SQL
- **Flexibilité** : Choisir l'outil le plus approprié par besoin

### 5. Gestion des Variables d'Environnement

**Décision** : Fichiers `.env` séparés pour dev et prod

**Structure** :
- `.env` (racine) : Variables backend (DB, JWT, ports)
- `frontend/.env.local` : Variables frontend en dev
- `frontend/.env.production` : Variables frontend en prod
- `load-env.mjs` : Script pour charger `.env` avant `next dev`

---

## Choix Techniques

### 1. Stack Backend

#### Node.js + Express.js

**Raisons** :
- **Performance** : Event loop non-bloquant
- **Écosystème** : Large choix de bibliothèques
- **JavaScript** : Même langage que le frontend
- **Simplicité** : Facile à maintenir et déployer

#### PostgreSQL

**Raisons** :
- **Robustesse** : Base de données relationnelle éprouvée
- **ACID** : Garanties transactionnelles
- **Types avancés** : Support des ENUM, UUID, JSON
- **Performance** : Optimisations pour les requêtes
- **CTEs récursives** : Pour hiérarchies de documents

#### Sequelize ORM + PostgreSQL Pool

**Raisons** :
- **Abstraction** : Pas de SQL manuel pour requêtes simples
- **Migrations** : Gestion des changements de schéma
- **Validation** : Validation des données au niveau modèle
- **Relations** : Gestion simple des associations
- **Pool brut** : Pour des requêtes SQL manuels

### 2. Stack Frontend

#### Next.js 14 (App Router)

**Raisons** :
- **App Router** : Nouveau système de routing plus puissant
- **Server Components** : Réduction du JavaScript côté client
- **Middleware** : Protection des routes native
- **TypeScript** : Support natif

#### TypeScript

**Raisons** :
- **Typage fort** : Détection d'erreurs à la compilation
- **Autocomplete** : Meilleure DX
- **Refactoring** : Plus sûr
- **Documentation** : Types auto-documentés

#### Tailwind CSS

**Raisons** :
- **Utility-first** : Développement rapide
- **Dark mode** : Support natif
- **Responsive** : Classes responsives intégrées
- **Personnalisation** : Configuration flexible

### 3. Temps Réel

#### Socket.IO

**Raisons** :
- **WebSocket + Fallback** : Support des anciens navigateurs
- **Rooms** : Gestion simple des channels (par document)
- **Events** : Système d'événements flexible
- **Reconnexion** : Automatique
- **Broadcasting** : Facile d'envoyer à plusieurs clients

**Événements implémentés** :

## Événements WebSocket - Documentation Complète

### 🔵 Client → Serveur

#### Authentification
```javascript
// Handshake automatique via middleware
socket.handshake.auth = { token: JWT_TOKEN }
```

#### Documents
```javascript
socket.emit('join-document', { docId }, (response) => {
  // response: { ok, docId, membersCount, initialState, reactions }
})

socket.emit('leave-document', { docId }, (response) => {
  // response: { ok, docId, membersCount, reactions }
})

socket.emit('doc-change-client', { docId, delta }, (response) => {
  // delta: { newText: { text: "contenu" } }
  // response: { ok, delta, userId }
})
```

#### Chat
```javascript
socket.emit('chat:new-message', { docId, message }, (response) => {
  // message: { id?, content: "texte" }
  // response: { ok, message: { id, content, user_id, author, reactions } }
})

socket.emit('chat:react', { docId, messageId, emoji }, (response) => {
  // emoji: "👍"
  // response: { ok, reaction: { docId, messageId, emoji, userIds } }
})

socket.emit('chat:new-audio', { docId, data }, (response) => {
  // data: audio blob/buffer
  // response: { ok }
})
```

#### Présence
```javascript
socket.emit('position-update', { docId, userId, start, end, direction }, (response) => {
  // start: 5, end: 10, direction: "forward"|"backward"|"none"
  // response: { ok }
})

socket.emit('ping', ...)
// Réponse: 'pong'
```

---

### 🔴 Serveur → Client (Broadcasts)

#### Documents & Édition
```javascript
socket.on('doc-change-from-other-client:launch', ({ docId, delta, userId }) => {
  // Édition lancée par un autre utilisateur
  // Avant sauvegarde
})

socket.on('doc-change-from-other-client:end', ({ ok, docId, delta, userId }) => {
  // Édition finalisée et sauvegardée
  // ok: true/false selon succès DB
})

socket.on('document:saved', (doc) => {
  // Document complet sauvegardé en DB
  // { id, name, content, last_modified_at, last_modified_by_id, ... }
})
```

#### Chat
```javascript
socket.on('chat:new-message', ({ docId, message }) => {
  // message: { id, content, user_id, author, reactions, ... }
})

socket.on('chat:reaction', ({ docId, messageId, emoji, userIds }) => {
  // userIds: liste des user_id ayant réagi avec cet emoji
})

socket.on('chat:new-audio', ({ docId, data }) => {
  // Données audio d'un autre utilisateur
})
```

#### Présence
```javascript
socket.on('presence', ({ type, userId, socketId, membersCount }) => {
  // type: "joined" | "left"
  // membersCount: nombre de participants après l'action
})

socket.on('position-update', ({ docId, userId, start, end, direction }) => {
  // Position du curseur des collaborateurs en temps réel
})

socket.on('pong', ...)
// Réponse au ping
```

---

### 📊 Architecture

**Rooms** :
```
document:{docId}  // Une room par document
```

**Stockage Réactions** :
```javascript
// EN MÉMOIRE UNIQUEMENT (perdu au restart)
reactionStore = Map<docId, Map<messageId, Map<emoji, Set<userId>>>>
```

**Authentification** :
- Token vérifié au handshake
- `socket.user = { id, email, token }`
- Injectionné dans tous les événements

---

### ⚠️ Codes d'Erreur

| Raison | Cause |
|--------|-------|
| `unauthorized` | Token invalide/expiré |
| `missing_docId` | docId manquant |
| `forbidden` | Pas de permission d'accès |
| `not_exist` | Document inexistant |
| `not_joined` | Pas dans la room |
| `unsupported_document_type` | Type document ≠ 'text' |
| `invalid_payload` | Champs manquants/invalides |
| `invalid_informations` | Données invalides |
| `invalid_emoji` | Emoji vide |
| `internal_error` | Erreur serveur |

---

### 💡 Flux Typique

```javascript
// 1. Rejoindre
socket.emit('join-document', { docId }, (res) => {
  console.log('Joined:', res.initialState.content)
})

// 2. Éditer
socket.on('doc-change-from-other-client:launch', (data) => {
  console.log('User', data.userId, 'is editing')
})

// 3. Changer position curseur
socket.emit('position-update', { 
  docId, userId, start: 5, end: 10, direction: 'forward' 
})

// 4. Envoyer message
socket.emit('chat:new-message', { 
  docId, message: { content: 'Hello!' } 
}, (res) => {
  console.log('Message sent:', res.message.id)
})

// 5. Réagir
socket.emit('chat:react', { 
  docId, messageId: '123', emoji: '👍' 
})

// 6. Quitter
socket.emit('leave-document', { docId })
```

### 4. Authentification

#### JWT (JSON Web Tokens)

**Raisons** :
- **Stateless** : Pas de session serveur
- **Scalable** : Facilite la scalabilité horizontale
- **Standard** : Largement supporté
- **Sécurisé** : Signature cryptographique

**Implémentation** :
- Stockage dans cookies HttpOnly (protection XSS)
- Expiration : 1h (cookie)
- Signature avec secret fort (JWT_SECRET)
- Vérification sur chaque requête protégée
- Token non-HttpOnly également stocké pour WebSocket

#### 2FA (TOTP) avec Speakeasy

**Raisons** :
- **TOTP standard** : Compatible Google Authenticator, Authy, etc.
- **QR Code** : Génération intégrée
- **Simple** : API intuitive
- **RFC 6238** : Protocole standardisé

**Flow** :
1. Setup : Génération secret + QR code
2. Activate : Vérification code TOTP + activation DB
3. Login : Vérification code à chaque connexion (si activé)
4. Disable : Désactivation + suppression secret

### 5. Gestion des Fichiers

#### Multer

**Raisons** :
- **Upload multipart** : Gestion native des fichiers
- **Contrôle** : Validation de taille et type
- **Intégration** : Facile avec Express

**Configuration** :
```javascript
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});
```

### 6. Documentation API

#### Swagger / OpenAPI

**Raisons** :
- **Standard** : Spécification OpenAPI
- **Interface interactive** : Tester l'API directement
- **Documentation auto-générée** : Depuis les commentaires
- **Client generation** : Possibilité de générer des clients

---

## Choix Architecturaux

### 1. Pattern MVC Adapté

**Structure** :
- **Models** : Sequelize (ORM) + Pool PostgreSQL (requêtes brutes)
- **Controllers** : Logique métier (validation, orchestration)
- **Routes** : Points d'entrée API (Express)
- **Services** : Logique métier réutilisable (2FA)

### 2. Middleware Chain

**Architecture** :
```
Request → Auth Middleware (JWT) → Admin Middleware (optionnel) → Controller → Response
```

**Middleware d'authentification** :
- Vérifie le token JWT depuis les cookies
- Extrait userId du token
- Injecte userId dans `req.userId`

**Middleware admin** :
- Vérifie le rôle de l'utilisateur
- Bloque si rôle !== 'admin'

### 3. Gestion des Erreurs

**Approche centralisée** :
- Try/catch dans chaque controller
- Messages d'erreur cohérents en français
- Logs serveur pour debugging
- Codes HTTP appropriés

**Codes de statut utilisés** :
- `200` : Succès
- `201` : Création réussie
- `204` : Suppression réussie (no content)
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Non autorisé (permissions/2FA/bloqué)
- `404` : Ressource non trouvée
- `409` : Conflit (ex: email déjà utilisé)
- `440` : Code TOTP invalide (custom)
- `500` : Erreur serveur

### 4. Système de Permissions

**Modèle RBAC (Role-Based Access Control)** :

**Rôles utilisateur** :
- `user` : Utilisateur standard
- `admin` : Administrateur (gestion globale)

**Permissions sur documents** :
- `read` : Lecture seule
- `edit` : Lecture + écriture
- `owner` : Toutes les permissions + gestion des accès

**Hiérarchie d'accès** :
- Propriétaire : Tous droits
- Éditeur (edit) : Peut modifier contenu + chat
- Lecteur (read) : Lecture seule
- Parent inheritance : Permissions sur dossier parent donnent accès aux enfants

**Logique** :
- Le propriétaire peut tout faire
- Les permissions sont stockées dans `document_permissions`
- Vérification à chaque accès au document
- Accès récursif aux parents pour permissions implicites

### 5. Architecture de la Collaboration Temps Réel

**Modèle** :
```
Document → CollaborationSession → SessionParticipants → Messages
```

**Flux** :
1. Utilisateur ouvre un document
2. Rejoint/crée une session de collaboration
3. Devient participant de la session
4. Peut envoyer/recevoir des messages
5. Peut éditer le document en temps réel
6. Les changements sont synchronisés via WebSocket

**État persisté en DB** :
- Contenu du document (table `documents.content`)
- Messages de chat (table `messages`)
- Sessions actives (table `collaboration_sessions`)
- Participants actifs (table `session_participants`)

### 6. Hiérarchie de Documents

**Structure** :
- **Dossiers** : type=`folder`, parent_id peut pointer à un autre dossier
- **Documents textes** : type=`text`, content stocké en DB
- **Fichiers** : type=`file`, file_path stocké, mime_type enregistré

**Navigation** :
- Racine : parent_id = null
- Enfants d'un dossier : parent_id = folder.id
- Requête hiérarchique : CTE récursive PostgreSQL

---

## Structure des Services

### Backend API (Port 3000)

**Responsabilités** :
- Authentification (Login, Register, 2FA)
- Gestion des utilisateurs (CRUD, profil, admin)
- Gestion des documents (CRUD, upload, permissions, hiérarchie)
- Administration (gestion utilisateurs, blocage, création admin)
- Validation des données
- Persistance en base de données

**Endpoints** :

```
# Authentification
POST   /api/auth/register          # Créer un compte
POST   /api/auth/login             # Connexion
POST   /api/auth/verify-2fa        # Vérifier code TOTP au login
POST   /api/auth/logout            # Déconnexion

# Profil utilisateur
GET    /api/profile                 # Récupérer profil
PUT    /api/profile                 # Mettre à jour profil (nom, email, password)
POST   /api/profile/2fa-setup       # Générer secret + QR code
POST   /api/profile/2fa-activate    # Activer 2FA
POST   /api/profile/2fa-disable     # Désactiver 2FA

# Documents
GET    /api/documents               # Liste hiérarchique complète
POST   /api/documents               # Créer dossier ou document texte
GET    /api/documents/:id           # Détails d'un document
GET    /api/documents/:id/download  # Télécharger un fichier
PUT    /api/documents/:id           # Modifier contenu texte
PUT    /api/documents/:id/metadata  # Renommer/déplacer
PUT    /api/documents/file/:id      # Remplacer un fichier
DELETE /api/documents/:id           # Supprimer
POST   /api/documents/file          # Upload fichier
GET    /api/documents/:id/permissionByUser  # Vérifier permission utilisateur
POST   /api/documents/:id/invite    # Inviter collaborateur

# Messages de chat
GET    /api/messages/:id            # Récupérer messages d'une session
POST   /api/messages/:id            # Envoyer message
PUT    /api/messages/:id            # Modifier message
DELETE /api/messages/:id            # Supprimer message

# Sessions de collaboration
GET    /api/sessions/:id/participants  # Lister participants
POST   /api/sessions/:id/participants  # Ajouter participant

# Administration
GET    /api/admin/users             # Lister tous les utilisateurs
POST   /api/admin/users             # Créer utilisateur (admin)
PUT    /api/admin/users/:id/block   # Bloquer utilisateur
PUT    /api/admin/users/:id/unblock # Débloquer utilisateur
PUT    /api/admin/changepassword    # Changer mot de passe d'un utilisateur
```

### Backend WebSocket (Port 3001)

**Responsabilités** :
- Gestion des connexions WebSocket
- Broadcasting des événements en temps réel
- Gestion des rooms (par document)
- Synchronisation des éditions collaboratives
- Gestion de la présence des participants
- Messages de chat instantanés
- Réactions emoji

### Frontend (Port 3000 / Dev)

**Responsabilités** :
- Interface utilisateur (React + TypeScript)
- Authentification côté client (JWT cookies)
- Appels API REST (fetch avec credentials)
- Connexion WebSocket (Socket.IO client)
- Gestion d'état local
- Routing et navigation
- Validation côté client (UX)
- Intégration 2FA

**Pages principales** :
- `/` : Dashboard accueil
- `/login` : Connexion
- `/profile` : Profil utilisateur + gestion 2FA
- `/profile/2fa` : Page dédiée 2FA post-login
- `/documents` : Liste hiérarchique des documents
- `/documents/[id]` : Éditeur collaboratif
- `/admin` : Panel d'administration (rôle admin uniquement)

**Features** :
- Mode sombre/clair (Tailwind)
- Locale français
- Responsive design
- Drag & drop (optionnel)
- Chat avec réactions emoji
- Présence temps réel

---

## Base de Données

### Types ENUM

```sql
user_role : 'user' | 'admin'
document_type : 'folder' | 'text' | 'file'
permission_level : 'read' | 'edit' | 'owner'
```

### Tables

#### `users`
```sql
id (UUID, PK)
email (VARCHAR, UNIQUE)
password_hash (TEXT)
display_name (VARCHAR)
role (user_role, default: 'user')
is_blocked (BOOLEAN, default: false)
two_factor_secret (VARCHAR)
is_two_factor_enabled (BOOLEAN, default: false)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

#### `documents`
```sql
id (UUID, PK)
parent_id (UUID, FK → documents, nullable)
owner_id (UUID, FK → users)
name (VARCHAR)
type (document_type: folder|text|file)
content (TEXT, nullable, only for text)
file_path (VARCHAR, nullable, only for file)
mime_type (VARCHAR, nullable, only for file)
last_modified_by_id (UUID, FK → users, nullable)
last_modified_at (TIMESTAMPTZ)
created_at (TIMESTAMPTZ)
```

#### `document_permissions`
```sql
user_id (UUID, FK → users, PK composite)
document_id (UUID, FK → documents, PK composite)
permission (permission_level: read|edit|owner)
```

#### `collaboration_sessions`
```sql
id (UUID, PK)
document_id (UUID, UNIQUE, FK → documents)
host_id (UUID, FK → users)
created_at (TIMESTAMPTZ)
```

#### `session_participants`
```sql
session_id (UUID, FK → collaboration_sessions, PK composite)
user_id (UUID, FK → users, PK composite)
joined_at (TIMESTAMPTZ)
```

#### `messages`
```sql
id (BIGSERIAL, PK)
session_id (UUID, FK → collaboration_sessions)
user_id (UUID, FK → users)
content (TEXT)
created_at (TIMESTAMPTZ)
```

### Relations

```
User 1───N Document (owner)
User 1───N Document (last_modified_by)
User N───N Document (via document_permissions)

Document 1───N Document (hiérarchie parent-enfants)
Document 1───1 CollaborationSession

CollaborationSession 1───N SessionParticipant
CollaborationSession 1───N Message

User N───N CollaborationSession (via SessionParticipant)
User 1───N Message
```

### Index

```sql
-- Performance pour les requêtes fréquentes
CREATE UNIQUE INDEX ON documents (parent_id, name);
CREATE INDEX ON document_permissions (user_id);
CREATE INDEX ON document_permissions (document_id);
```

### Contraintes

- `ON DELETE CASCADE` : Suppression en cascade (documents, permissions, sessions, messages)
- `UNIQUE` : Email utilisateur, document_id dans collaboration_sessions
- `NOT NULL` : Champs obligatoires (id, name, type, owner_id, user_id, etc.)

---

## Sécurité

### 1. Authentification

**JWT** :
- Stockage dans cookies HttpOnly (protection XSS)
- Durée de vie : 1h
- Signature avec secret fort (JWT_SECRET, min 32 chars)
- Vérification sur chaque requête protégée
- Token supplémentaire non-HttpOnly pour WebSocket

**2FA (TOTP)** :
- Protocole TOTP standard (RFC 6238)
- QR Code pour configuration facile
- Secret stocké en base (non chiffré actuellement, à améliorer)
- Validation à 2 étapes (setup → activate)
- Code à 6 chiffres, renouvellement toutes les 30s
- Possibilité de désactiver

### 2. Autorisation

**Middleware d'authentification** :
- Vérifie la présence du token
- Valide la signature
- Vérifie l'expiration
- Extrait l'userId

**Middleware admin** :
- Vérifie le rôle de l'utilisateur
- Bloque si non-admin
- Utilisé sur routes `/api/admin/*`

**Permissions documents** :
- Vérification à chaque accès
- Hiérarchie : owner > edit > read
- Support des permissions implicites via hiérarchie

**Statut utilisateur** :
- Vérification is_blocked avant opérations
- Utilisateurs bloqués rejettent l'accès même avec token valide

### 3. Validation des Données

**Backend** :
- Validation de tous les inputs
- Sanitization des données
- Vérification des types
- Regex pour formats (email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- UUID validation: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

**Frontend** :
- Validation côté client (UX)
- Double validation côté serveur (sécurité)

### 4. Protection CSRF

- Utilisation de cookies SameSite
- Vérification des origines (CORS)
- CORS configuré pour dev/prod

### 5. Mot de Passe

- Hash avec bcrypt (salt rounds: 10)
- Minimum 8 caractères requis
- Jamais stocké en clair
- Mise à jour via `bcrypt.hash(password, 10)`

### 6. Gestion des Fichiers

- Upload limité par taille (50MB)
- Vérification du MIME type
- Stockage avec noms originaux (à améliorer avec UUID)
- Chemin sécurisé (`uploads/`)
- Vérification permissions avant upload

### 7. CORS & Sécurité Réseau

```javascript
const CORS_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
];
// À améliorer en prod avec whitelist stricte et env vars
```

---

## Fonctionnalités Détaillées

### 1. Authentification

**Register** :
1. Validation email (format + unicité)
2. Validation mot de passe (min 8 chars)
3. Hash du mot de passe (bcrypt, rounds=10)
4. Création utilisateur en base
5. Génération JWT
6. Stockage dans cookie HttpOnly

**Login** :
1. Vérification email existe
2. Vérification utilisateur non bloqué
3. Vérification mot de passe (bcrypt)
4. Si 2FA activé : Retour status 403 + demande code
5. Sinon : Génération JWT + stockage cookie

**2FA Setup** :
1. Génération secret Speakeasy
2. Création QR code
3. Retour au frontend pour scan

**2FA Activate** :
1. Vérification code TOTP (token fourni au step 1)
2. Activation dans DB (is_two_factor_enabled = true)
3. Secret stocké définitivement

**2FA Verify (Login)** :
1. Vérification code TOTP fourni
2. Génération JWT si code valide
3. Retour 440 si code invalide

**2FA Disable** :
1. Suppression secret (two_factor_secret = null)
2. Désactivation (is_two_factor_enabled = false)

### 2. Gestion Documentaire

**Hiérarchie** :
- Dossiers peuvent contenir dossiers et fichiers
- Documents textes éditables en collaborative
- Fichiers uploadés (images, PDF, etc.)
- Support d'une profondeur illimitée

**CRUD** :
- **Create** : POST `/api/documents` (dossier/texte) ou POST `/api/documents/file` (fichier)
- **Read** : GET `/api/documents` (hiérarchique) ou GET `/api/documents/:id`
- **Update** : PUT `/api/documents/:id` (contenu texte) ou PUT `/api/documents/:id/metadata` (nom/position)
- **Delete** : DELETE `/api/documents/:id` (cascade sur enfants)

**Permissions** :
- Propriétaire : Tous droits
- Éditeur : Peut modifier contenu, ajouter au chat
- Lecteur : Lecture seule
- Invitation : Propriétaire peut partager via email

**Déplacement** :
- Via `PUT /api/documents/:id/metadata` avec `parent_id`
- Validation que parent existe et est un dossier
- Support du déplacement vers racine (parent_id = null)

### 3. Collaboration Temps Réel

**Édition collaborative** :
- Plusieurs utilisateurs sur même document texte
- Synchronisation via WebSocket (événements doc-change)
- Sauvegarde périodique en base (après édition)
- Delta/diff pour optimiser la bande passante (optionnel)

**Chat** :
- Messages par session de collaboration
- Réactions emoji sur messages (stored in DB ou en-mémoire)
- Historique persisté en base
- Auteur du message enregistré

**Présence** :
- Liste des participants connectés (in-memory en WebSocket)
- Notifications join/leave
- Curseurs des collaborateurs (position du curseur texte)

### 4. Profil Utilisateur

**Modification** :
- **Nom** : Changement avec validation (non vide)
- **Email** : Changement avec vérification format + unicité
- **Mot de passe** : Minimum 8 caractères, bcrypt hash

**2FA Management** :
- Activation/désactivation
- QR code pour setup
- Codes TOTP 6 chiffres
- Page dédiée `/profile/2fa`

### 5. Administration

**Gestion utilisateurs** :
- Liste de tous les utilisateurs
- Création de comptes (admin/user)
- Blocage/déblocage de comptes
- Changement de mot de passe
- Panel dédié (route protégée `GET /admin`)

**Actions admin** :
- `POST /api/admin/users` : Créer utilisateur
- `PUT /api/admin/users/:id/block` : Bloquer
- `PUT /api/admin/users/:id/unblock` : Débloquer
- `PUT /api/admin/changepassword` : Changer pwd

---


## Variables d'Environnement

### Backend (`.env` racine)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=wikidrive

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Ports
API_PORT=3000
WS_PORT=3001

# Upload
MAX_FILE_SIZE=52428800  # 50MB

# 2FA
TOTP_WINDOW=1
```

### Frontend (`.env.local` dev, `.env.production` prod)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## Auteurs

- **Sergio**
- **Bryan**
- **David**
- **Tuna**

Projet réalisé dans le cadre de la formation **LiveCampus** - Spécialité Développement Web.

---
