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

---

## Vue d'ensemble

WikiDrive est une plateforme collaborative en temps réel permettant de gérer des documents, dossiers et fichiers avec authentification 2FA, système de permissions et édition collaborative. Le projet suit une architecture microservices avec séparation claire des responsabilités.

### Objectifs du Projet

- Fournir une plateforme collaborative sécurisée
- Permettre l'édition en temps réel de documents
- Gérer une hiérarchie de dossiers et fichiers
- Implémenter un système d'authentification robuste avec 2FA
- Offrir un système de permissions granulaire

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
│   │   └── db.js            # Configuration Sequelize avec pool de connexions
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
│   │   ├── documents.js     # CRUD documents
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
├── frontend/               # Application Next.js
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
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Éditeur collaboratif
│   │   │   └── profile/
│   │   │       └── page.tsx # Profil utilisateur & 2FA
│   │   ├── components/    # Composants réutilisables
│   │   │   ├── Header.tsx
│   │   │   └── DocumentsPage.tsx
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
│   ├── Dockerfile
│   ├── .env.local        # Variables d'env (dev)
│   ├── .env.production   # Variables d'env (prod)
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
│   Frontend (Next.js - Port 8081)   │
│   - React Components               │
│   - Socket.IO Client               │
│   - Middleware Auth                │
└────────┬────────────────────────────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌────────────┐
│  Backend    │ │   Backend    │ │ PostgreSQL │
│  API        │ │  WebSocket   │ │   (5432)   │
│ (Port 3000) │ │ (Port 3001)  │ └────────────┘
│             │ │              │       ▲
│ - Express  │ │ - Socket.IO  │       │
│ - Sequelize│ │ - Temps réel │       │
│ - JWT      │ │ - Chat       │       │
│ - Swagger  │ │ - Collab     │       │
└─────────────┘ └──────┬───────┘       │
       │                │              │
       └────────────────┴──────────────┘
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

**Avantages** :
- Meilleure isolation des erreurs
- Performances optimisées par service
- Équipes peuvent travailler en parallèle

**Inconvénients** :
- Complexité accrue de l'infrastructure
- Nécessite une orchestration (Docker Compose)

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

### 4. Gestion des Variables d'Environnement

**Décision** : Fichiers `.env` séparés pour dev et prod

**Structure** :
- `.env` (racine) : Variables backend (DB, JWT, ports)
- `frontend/.env.local` : Variables frontend en dev
- `frontend/.env.production` : Variables frontend en prod

**Avantages** :
- Configuration claire par environnement
- Sécurité (fichiers non versionnés)
- Facilité de déploiement

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
- **Performance** : Optimisations pour les requêtes complexes
- **Open Source** : Gratuit et bien documenté

**Alternatives considérées** :
- MySQL : Moins de fonctionnalités avancées
- MongoDB : Pas adapté pour les relations complexes

#### Sequelize ORM

**Raisons** :
- **Abstraction** : Pas de SQL manuel
- **Migrations** : Gestion des changements de schéma
- **Validation** : Validation des données au niveau modèle
- **Relations** : Gestion simple des associations

**Configuration spécifique** :
```javascript
// Pool de connexions pour optimiser les performances
pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
}
```

### 2. Stack Frontend

#### Next.js 14 (App Router)

**Raisons** :
- **SSR/SSG** : Optimisation SEO et performances
- **App Router** : Nouveau système de routing plus puissant
- **Server Components** : Réduction du JavaScript côté client
- **Middleware** : Protection des routes native
- **TypeScript** : Support natif

**Avantages spécifiques** :
- Layouts imbriqués
- Loading states automatiques
- Error boundaries
- Streaming avec Suspense

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
- **Petite taille** : Purge du CSS non utilisé

### 3. Temps Réel

#### Socket.IO

**Raisons** :
- **WebSocket + Fallback** : Support des anciens navigateurs
- **Rooms** : Gestion simple des channels
- **Events** : Système d'événements flexible
- **Reconnexion** : Automatique
- **Broadcasting** : Facile d'envoyer à plusieurs clients

**Alternatives considérées** :
- WebSocket natif : Pas de fallback HTTP
- Server-Sent Events : Unidirectionnel uniquement

### 4. Authentification

#### JWT (JSON Web Tokens)

**Raisons** :
- **Stateless** : Pas de session serveur
- **Scalable** : Facilite la scalabilité horizontale
- **Standard** : Largement supporté
- **Sécurisé** : Signature cryptographique

**Implémentation** :
- Stockage dans cookies HttpOnly (protection XSS)
- Expiration courte (24h)
- Refresh sur chaque requête valide

#### Speakeasy (2FA)

**Raisons** :
- **TOTP standard** : Compatible Google Authenticator, Authy, etc.
- **QR Code** : Génération intégrée
- **Simple** : API intuitive

### 5. Documentation API

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
- **Models** : Sequelize (ORM)
- **Controllers** : Logique métier
- **Routes** : Points d'entrée API
- **Services** : Logique métier réutilisable

**Avantages** :
- Séparation des responsabilités
- Testabilité
- Réutilisabilité

### 2. Middleware Chain

**Architecture** :
```
Request → Auth Middleware → Admin Middleware (optionnel) → Controller → Response
```

**Middleware d'authentification** :
- Vérifie le token JWT
- Extrait userId du token
- Injecte userId dans req.userId

**Middleware admin** :
- Vérifie le rôle de l'utilisateur
- Bloque si rôle !== 'admin'

### 3. Gestion des Erreurs

**Approche centralisée** :
- Try/catch dans chaque controller
- Messages d'erreur cohérents
- Logs serveur pour debugging
- Codes HTTP appropriés

**Codes de statut utilisés** :
- 200 : Succès
- 201 : Création réussie
- 400 : Requête invalide
- 401 : Non authentifié
- 403 : Non autorisé (permissions)
- 404 : Ressource non trouvée
- 409 : Conflit (ex: email déjà utilisé)
- 440 : Code TOTP invalide (custom)
- 500 : Erreur serveur

### 4. Système de Permissions

**Modèle RBAC (Role-Based Access Control)** :

**Rôles** :
- `user` : Utilisateur standard
- `admin` : Administrateur

**Permissions sur documents** :
- `read` : Lecture seule
- `edit` : Lecture + écriture
- `owner` : Toutes les permissions + gestion des accès

**Logique** :
- Le propriétaire peut tout faire
- Les permissions sont stockées dans `document_permissions`
- Vérification à chaque accès au document

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

**Événements Socket.IO** :
- `join-room` : Rejoindre une room
- `leave-room` : Quitter une room
- `document-update` : Mise à jour du document
- `message` : Nouveau message de chat
- `reaction` : Réaction à un message
- `participants-update` : Changement de participants

---

## Structure des Services

### Backend API (Port 3000)

**Responsabilités** :
- Authentification (Login, Register, 2FA)
- Gestion des utilisateurs (CRUD, profil)
- Gestion des documents (CRUD, upload, permissions)
- Administration (gestion utilisateurs, création admin)
- Validation des données
- Persistance en base de données

**Endpoints principaux** :
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-2fa
POST   /api/auth/logout

GET    /api/profile
PUT    /api/profile
POST   /api/profile/2fa-setup
POST   /api/profile/2fa-activate
POST   /api/profile/2fa-disable

GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
PUT    /api/documents/:id
DELETE /api/documents/:id
POST   /api/documents/upload
POST   /api/documents/:id/invite

GET    /api/admin/users
POST   /api/admin/create-admin
```

### Backend WebSocket (Port 3001)

**Responsabilités** :
- Gestion des connexions WebSocket
- Broadcasting des événements
- Gestion des rooms (par document)
- Messages de chat en temps réel
- Synchronisation des éditions collaboratives
- Gestion de la présence des participants

**Événements** :
```javascript
// Client → Serveur
socket.emit('join-room', { documentId, userId })
socket.emit('leave-room', { documentId })
socket.emit('document-update', { documentId, content })
socket.emit('message', { sessionId, content })
socket.emit('reaction', { messageId, emoji })

// Serveur → Client
socket.on('participants-update', (participants) => {})
socket.on('new-message', (message) => {})
socket.on('document-changed', (content) => {})
socket.on('user-joined', (user) => {})
socket.on('user-left', (userId) => {})
```

### Frontend (Port 8081 / 3000)

**Responsabilités** :
- Interface utilisateur
- Authentification côté client
- Appels API REST
- Connexion WebSocket
- Gestion d'état local
- Routing et navigation
- Validation côté client

**Pages principales** :
- `/login` : Connexion
- `/` : Dashboard (liste des documents racine)
- `/documents` : Liste de tous les documents
- `/documents/[id]` : Éditeur collaboratif
- `/profile` : Profil utilisateur et 2FA
- `/admin` : Panel d'administration

---

## Base de Données

### Schéma

**Types ENUM** :
```sql
user_role : 'user' | 'admin'
document_type : 'folder' | 'text' | 'file'
permission_level : 'read' | 'edit' | 'owner'
```

**Tables** :

#### `users`
```sql
id (UUID, PK)
email (VARCHAR, UNIQUE)
password_hash (TEXT)
display_name (VARCHAR)
role (user_role)
is_blocked (BOOLEAN)
two_factor_secret (VARCHAR)
is_two_factor_enabled (BOOLEAN)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

#### `documents`
```sql
id (UUID, PK)
parent_id (UUID, FK → documents)
owner_id (UUID, FK → users)
name (VARCHAR)
type (document_type)
content (TEXT)
file_path (VARCHAR)
mime_type (VARCHAR)
last_modified_by_id (UUID, FK → users)
last_modified_at (TIMESTAMPTZ)
created_at (TIMESTAMPTZ)
```

#### `document_permissions`
```sql
user_id (UUID, FK → users, PK composite)
document_id (UUID, FK → documents, PK composite)
permission (permission_level)
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
User N───N Document (document_permissions)

Document 1───N Document (parent → children)
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
```

### Contraintes

- `ON DELETE CASCADE` : Suppression en cascade (documents, permissions, sessions)
- `UNIQUE` : Email utilisateur, nom de document dans un dossier
- `NOT NULL` : Champs obligatoires

---

## Sécurité

### 1. Authentification

**JWT** :
- Stockage dans cookies HttpOnly (protection XSS)
- Durée de vie : 24h
- Signature avec secret fort (JWT_SECRET)
- Vérification sur chaque requête protégée

**2FA (TOTP)** :
- Protocole TOTP standard (RFC 6238)
- QR Code pour configuration facile
- Secret stocké chiffré en base
- Validation à 2 étapes (setup → activate)
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

**Permissions documents** :
- Vérification à chaque accès
- Hiérarchie : owner > edit > read

### 3. Validation des Données

**Backend** :
- Validation de tous les inputs
- Sanitization des données
- Vérification des types
- Regex pour formats (email, etc.)

**Frontend** :
- Validation côté client (UX)
- Double validation côté serveur

### 4. Protection CSRF

- Utilisation de cookies SameSite
- Vérification des origines
- CORS configuré correctement

### 5. Mot de Passe

- Hash avec bcrypt (salt rounds: 10)
- Minimum 8 caractères requis
- Jamais stocké en clair

### 6. Gestion des Fichiers

- Upload limité par taille
- Vérification du MIME type
- Stockage avec noms uniques (hash)
- Chemin sécurisé (uploads/)

---

## Fonctionnalités Détaillées

### 1. Authentification

**Register** :
1. Validation email + mot de passe
2. Hash du mot de passe (bcrypt)
3. Création utilisateur en base
4. Génération JWT
5. Stockage dans cookie

**Login** :
1. Vérification email/password
2. Si 2FA activé → demande code TOTP
3. Sinon → génération JWT
4. Stockage dans cookie

**2FA** :
1. Setup : Génération secret + QR code
2. Activate : Vérification code TOTP + activation
3. Login : Vérification code à chaque connexion
4. Disable : Désactivation + suppression secret

### 2. Gestion Documentaire

**Hiérarchie** :
- Dossiers peuvent contenir dossiers et fichiers
- Documents texte éditables
- Fichiers uploadés (images, PDF, etc.)

**CRUD** :
- Create : Création dossier/document/fichier
- Read : Liste + détails
- Update : Modification nom/contenu
- Delete : Suppression (cascade sur enfants)

**Permissions** :
- Propriétaire : Tous droits
- Éditeur : Peut modifier
- Lecteur : Lecture seule
- Invitation : Ajout de collaborateurs

### 3. Collaboration Temps Réel

**Édition collaborative** :
- Plusieurs utilisateurs sur même document
- Synchronisation via WebSocket
- Sauvegarde périodique en base

**Chat** :
- Messages par session de collaboration
- Réactions emoji sur messages
- Historique persisté en base

**Présence** :
- Liste des participants connectés
- Notifications join/leave

### 4. Profil Utilisateur

**Modification** :
- Nom : Changement avec validation
- Email : Changement avec vérification format + unicité
- Mot de passe : Minimum 8 caractères

**2FA** :
- Activation/désactivation
- QR code pour setup
- Codes TOTP 6 chiffres

### 5. Administration

**Gestion utilisateurs** :
- Liste de tous les utilisateurs
- Création de comptes admin
- Panel dédié (route protégée)

---

## Auteurs

- **Sergio**
- **Bryan**
- **David**
- **Tuna**

Projet réalisé dans le cadre de la formation **LiveCampus** - Spécialité Développement Web.

---

**Date** : Octobre 2025
