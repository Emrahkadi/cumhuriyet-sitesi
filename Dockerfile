# Cumhuriyet Sitesi - Node.js üretim imajı
FROM node:20-slim

WORKDIR /app

# Bağımlılıkları kur (katman önbelleği için önce package dosyaları)
COPY package*.json ./
RUN npm install --omit=dev

# Uygulama kaynaklarını kopyala
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
