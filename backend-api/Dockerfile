FROM node:18-alpine

# Définir l'environnement pour la production
ENV NODE_ENV=production

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances et installer
COPY package*.json ./
RUN npm install

# Copier tout le code source JS (tout est copié et sera exécuté directement)
COPY . .

# AJUSTER CE PORT SELON LE SERVICE (3000 pour API, 3001 pour WS)
EXPOSE 3000

# Définir la commande de lancement
CMD [ "npm", "start" ]