FROM node:20-alpine

WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa tutte le dipendenze
RUN npm install

# Copia tutto il resto del codice sorgente
COPY . .

# Compila l'app e il backend
RUN npm run build

# Esponi la porta 3000 del server
EXPOSE 3000

# Avvia il server backend con frontend integrato
CMD ["npm", "run", "start"]
