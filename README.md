# projet_spe_4_front

c sergio

# Arborecence du projet

/
├── .dockerignore # Fichiers à ignorer lors de la construction des images Docker
├── .env # Variables d'environnement LOCALES (À IGNORER par Git !)
├── .env.example # Modèle pour les variables d'environnement (À COMMITTER)
├── .gitignore # Fichiers et dossiers à exclure de Git (ex: node_modules, build)
├── docker-compose.yml # Configuration Docker de la DB, API REST, et WebSocket
├── README.md # Documentation pour lancer le projet (Livrable)
└── DOCUMENTATION.md # Document explicatif des choix architecturaux/techniques (Livrable)

# Scripts pour l'initialisation automatique de la DB PostgreSQL

├── /init_scripts  
│ └── 01-schema.sql # Création des tables (users, documents, permissions, etc.)

# Partie I : Le Serveur d'API REST (Authentification, CRUD Fichiers, Admin)

└── /backend-api  
 ├── Dockerfile # Instructions pour construire l'image Docker de l'API
├── package.json  
 ├── tsconfig.json  
 └── /src  
 ├── /auth # Logique de connexion, JWT, 2FA (P1)
├── /users # Logique Admin, gestion de profil (P1)
├── /documents # Listing, CRUD, upload de fichiers (P2)
├── /invitations # Logique d'invitation (P4)
├── /middleware # Vérification JWT, protection des routes Admin
└── main.ts # Point d'entrée de l'application (Serveur Express)

# Partie II : Le Serveur WebSocket (Temps Réel, Appel Audio)

└── /backend-ws  
 ├── Dockerfile # Instructions pour construire l'image Docker du WS
├── package.json
├── tsconfig.json
└── /src
├── /collaboration # Logique Y.js, gestion des rooms, sauvegarde (P3)
├── /webrtc # Logique de signalisation pour les appels (P4)
└── ws-server.ts # Point d'entrée du serveur WebSocket (ex: Socket.IO)

# Partie III : L'Application Frontend (Client)

└── /frontend  
 ├── package.json
├── tsconfig.json
└── /src
├── /assets # Images, icônes, styles globaux
├── /components # Composants réutilisables (Boutons, Cards, UI d'Appel)
├── /pages # Vues principales du projet
│ ├── AdminPanel.tsx # Panel d'administration (P1)
│ ├── Dashboard.tsx # Explorateur de fichiers (P2)
│ ├── Editor.tsx # Vue de l'édition collaborative (P3 & P4)
│ └── Login.tsx # Page de connexion (P1)
├── /services # Communication avec l'API REST
└── /websocket # Logique client Socket.IO et WebRTC
