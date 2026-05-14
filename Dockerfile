FROM node:20-alpine

WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa tutte le dipendenze
RUN npm install

# Copia tutto il codice dell'app
COPY . .

# Effettua la build sia del frontend React (in dist/) sia del server Node.js (in dist/server.cjs)
RUN npm run build

# Esponi la porta corretta
EXPOSE 3000

# Avvia il server backend Node (che a sua volta eroga sia le API che il frontend)
CMD ["npm", "run", "start"]
