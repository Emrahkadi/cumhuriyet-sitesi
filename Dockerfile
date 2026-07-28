# Cumhuriyet Sitesi - Node.js üretim imajı
FROM node:20-slim

# better-sqlite3 derlemesi için gerekli araçlar
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bağımlılıkları kur (katman önbelleği için önce package dosyaları)
COPY package*.json ./
RUN npm install --omit=dev

# Uygulama kaynaklarını kopyala
COPY . .

# Kalıcı veritabanı klasörü (Render disk buraya bağlanır)
ENV DB_DIR=/data
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
