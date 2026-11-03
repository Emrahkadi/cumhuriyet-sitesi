# Cumhuriyet Sitesi - Node.js üretim imajı
FROM node:20-slim

WORKDIR /app

# Bağımlılıkları kur (katman önbelleği için önce package dosyaları).
# npm ci: package-lock.json'a birebir uygun, deterministik kurulum.
RUN npm ci --omit=dev && npm cache clean --force

# Uygulama kaynaklarını kopyala
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Sağlık kontrolü: /healthz veritabanı hazır olduğunda 200 döner.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
