# projet_spe_4_front

c sergio
c bryan

# Arborecence du projet

```
/
├── .dockerignore
├── .env # Variables d'environnement secrètes (IGNORÉ PAR GIT)
├── .env.example # Modèle pour les variables d'environnement
├── .gitignore # Fichiers à ignorer (ex: node_modules, .env, build)
├── docker-compose.yml # Configuration de la DB PostgreSQL et des serveurs (les 2 instances)
├── README.md # Instructions de lancement (obligatoire)
├── DOCUMENTATION.md # Document explicatif des choix (obligatoire)
├── backend-api # Contient l'API REST (Authentification, Admin, CRUD Fichiers)
│   ├── src
│   │   ├── auth # Logique de connexion, 2FA, JWT
│   │   ├── users # Logique Admin, Profil
│   │   ├── documents # Logique Listing, CRUD Fichiers, Invitation
│   │   ├── middleware # Vérification JWT, Rôle Admin
│   │   ├── main.ts # Point d'entrée du serveur (Express/NestJS)
│   │   └── orm.ts # Configuration de l'ORM (Prisma/Sequelize)
│   ├── package.json
│   └── tsconfig.json
├── backend-ws # Contient le Serveur WebSocket (Temps Réel, Appel)
│   ├── src
│   │   ├── collaboration # Logique Y.js, gestion des rooms, sauvegarde
│   │   ├── webrtc # Logique de signalisation pour les appels
│   │   ├── ws-server.ts # Point d'entrée du serveur WebSocket (ex: Socket.IO)
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
└── frontend # Contient le Client (React, Vue, etc.)
    ├── public
    ├── src
    │   ├── components # Éléments réutilisables (Boutons, Cards)
    │   ├── pages # Vues principales (Login, Dashboard, Editor, Admin)
    │   │   ├── Dashboard.tsx
    │   │   ├── Editor.tsx # Contient l'éditeur, l'appel audio et l'invite
    │   │   ├── Login.tsx
    │   │   └── AdminPanel.tsx
    │   ├── hooks # Logique métier (useAuth, useDocuments)
    │   ├── services # Connexion à l'API REST (Axios)
    │   ├── websocket # Client Socket.IO, logique WebRTC
    │   └── App.tsx
    ├── package.json
    └── tsconfig.json
```
