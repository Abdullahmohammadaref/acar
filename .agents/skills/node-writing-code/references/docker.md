# Docker for Node.js

## Multi-Stage Build

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 3: Production
FROM node:22-alpine AS production
WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Why Multi-Stage

1. **deps stage** — Installs only production dependencies
2. **build stage** — Full install + build (includes devDependencies for TypeScript, etc.)
3. **production stage** — Tiny image with only runtime code and prod dependencies

Result: Image size drops from ~1GB to ~150MB.

## Docker Compose for Development

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: build  # Use build stage for dev (has devDependencies)
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src  # Hot reload
      - ./package.json:/app/package.json
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-minimum-32-characters-long
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: pnpm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Security Best Practices

### Non-Root User

```dockerfile
# Always run as non-root in production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

### .dockerignore

```
node_modules
.git
.env
.env.*
dist
coverage
*.md
.vscode
.idea
```

### No Secrets in Images

```dockerfile
# ❌ Wrong — secret baked into image
ENV JWT_SECRET=my-secret-key

# ✅ Correct — injected at runtime
# docker run -e JWT_SECRET=... myapp
```

### Minimal Base Image

```dockerfile
# ✅ Alpine — smallest
FROM node:22-alpine

# ❌ Full image — much larger
FROM node:22
```

### Pin Versions

```dockerfile
# ✅ Correct — pinned major version
FROM node:22-alpine

# ❌ Wrong — unpredictable updates
FROM node:latest
```

## Health Checks

### HTTP Health Endpoint

```typescript
fastify.get("/health", async () => {
  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error("Database connection failed");
  }

  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// Liveness probe (simpler — is the process alive?)
fastify.get("/health/live", async () => ({ status: "alive" }));

// Readiness probe (is the app ready to serve traffic?)
fastify.get("/health/ready", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ready" };
});
```

### Dockerfile Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1
```

## Graceful Shutdown

```typescript
async function startServer() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);

    // Stop accepting new connections
    await app.close();

    // Close database connections
    await prisma.$disconnect();

    app.log.info("Server shut down successfully");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await app.listen({ port: 3000, host: "0.0.0.0" });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

### Fastify Close Timeout

```typescript
const app = Fastify({
  logger: true,
  forceCloseConnections: true, // Force close after timeout
  connectionTimeout: 30_000,    // 30 second timeout
});
```

## Production Optimization

### Node.js Flags

```dockerfile
CMD ["node", "--max-old-space-size=512", "--enable-source-maps", "dist/index.js"]
```

### Environment Variables

```dockerfile
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"
```

### Logging

```typescript
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    // Structured JSON logging in production
    transport: process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
  },
});
```

## Anti-Patterns

### Don't Install devDependencies in Production

```dockerfile
# ❌ Wrong — includes test frameworks, TypeScript, etc.
RUN pnpm install

# ✅ Correct — production only
RUN pnpm install --frozen-lockfile --prod
```

### Don't Use npm start in Dockerfile

```dockerfile
# ❌ Wrong — npm adds overhead, spawns extra process
CMD ["npm", "start"]

# ✅ Correct — direct node invocation
CMD ["node", "dist/index.js"]
```

### Don't Copy Everything

```dockerfile
# ❌ Wrong — copies node_modules, .git, etc.
COPY . .

# ✅ Correct — copy only what's needed (with .dockerignore)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY src/ ./src/
COPY tsconfig.json ./
```
