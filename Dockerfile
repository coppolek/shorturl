FROM node:20-alpine

WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa tutte le dipendenze
RUN npm install

# Copia tutto il resto del codice sorgente
COPY . .

# Compila il progetto
RUN npm run build

# Esponi la porta interna usata dal nostro server Express
EXPOSE 3000

# Avvia il server Node.js
CMD ["npm", "run", "start"]
