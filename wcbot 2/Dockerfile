FROM node:20-slim

WORKDIR /app

# Copy dependency manifests and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY src/ ./src/

# Include replay fixture used by the mock match replay and admin controls
COPY match_18241006_snapshot.json ./match_18241006_snapshot.json

# Copy the public folder (includes the pre-built Next.js site in public/huginn/)
COPY public/ ./public/

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/index.js"]
