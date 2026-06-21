# Step 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install absolute dependencies (including devDependencies)
RUN npm install

# Copy the rest of the application source files
COPY . .

# Build Vite frontend assets and compile server with esbuild
RUN npm run build

# Step 2: Runtime production stage
FROM node:20-slim AS runner

WORKDIR /app

# Set production environment level
ENV NODE_ENV=production

# Copy package config files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled production bundle and assets from builder state
COPY --from=builder /app/dist ./dist

# Expose port (Cloud Run sets standard PORT, usually 8080)
EXPOSE 3000

# Start command execution
CMD ["npm", "run", "start"]
