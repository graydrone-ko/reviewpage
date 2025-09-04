# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Verify the build output exists
RUN ls -la dist/

# Expose port
EXPOSE $PORT

# Start the compiled application directly (not through npm)
CMD ["node", "dist/index.js"]