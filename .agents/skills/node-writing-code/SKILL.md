---
name: node-writing-code
description: >-
  This skill should be used when writing, reviewing, or refactoring Node.js
  backend code. It covers Fastify API patterns (plugins, routes, hooks), Zod
  validation, database access with Prisma and Drizzle, authentication and
  authorization (JWT, RBAC, ABAC), error handling, and Docker deployment.
---

# Node.js Writing Code

Quick reference for writing production-quality Node.js backend services. Each section summarizes the key rules — reference files provide full examples and edge cases.

## API Architecture (Fastify)

### Plugin-Based Design

Everything in Fastify is a plugin — routes, middleware, database connections, services.

```typescript
// Register plugins in order
await app.register(cors, { origin: ["http://localhost:3000"], credentials: true });
await app.register(jwt, { secret: process.env.JWT_SECRET! });

// Route plugins with prefix
await app.register(authRoutes, { prefix: "/auth" });
await app.register(userRoutes, { prefix: "/users" });
```

### Route Organization

```
src/
├── routes/           # Route plugins grouped by resource
│   ├── auth/
│   ├── users/
│   └── appointments/
├── plugins/          # Cross-cutting (database, auth decorator)
├── services/         # Business logic
├── schemas/          # Shared Zod/JSON schemas
└── app.ts            # App factory
```

### Route Definition

```typescript
fastify.post("/appointments", {
  schema: { body: CreateAppointmentSchema, response: { 201: AppointmentSchema } },
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    const data = request.body as CreateAppointmentInput;
    const appointment = await appointmentService.create(data);
    return reply.code(201).send(appointment);
  },
});
```

### Hooks (Middleware)

```
onRequest → preParsing → preValidation → preHandler → handler → preSerialization → onSend → onResponse
```

Use `preHandler` for auth, validation, rate limiting. Use `onRequest` for logging.

See [references/api-patterns.md](./references/api-patterns.md) for plugin architecture, route patterns, error handling, decorators, and OpenAPI integration.

## Validation (Zod)

### Rules

1. **Validate at boundaries** — HTTP handlers, environment variables, external API responses
2. **Trust internal code** — Don't re-validate data that's already been validated
3. **Parse, don't validate** — Use `safeParse` to transform and validate in one step
4. **Derive types from schemas** — `type User = z.infer<typeof UserSchema>`

```typescript
const CreateUserSchema = z.object({
  email: z.string().email("Correo no válido"),
  name: z.string().min(1, "Nombre requerido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

// In handler
const result = CreateUserSchema.safeParse(request.body);
if (!result.success) {
  return reply.code(400).send({ error: "Validation Error", details: result.error.flatten().fieldErrors });
}
const user = await userService.create(result.data);
```

### Environment Validation

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const env = EnvSchema.parse(process.env); // Fail fast at startup
```

See [references/validation.md](./references/validation.md) for schema composition, query/path params, error formatting, and anti-patterns.

## Database Access

### Prisma

```typescript
// Schema-first: define models in schema.prisma, generate client
const user = await prisma.user.findUnique({ where: { id }, include: { profile: true } });

// Transactions
const [user, appointment] = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const apt = await tx.appointment.create({ data: { ...aptData, userId: user.id } });
  return [user, apt];
});
```

### Drizzle

```typescript
// Schema-as-code: define tables in TypeScript
const users = await db.select().from(schema.users)
  .where(eq(schema.users.role, "doctor"))
  .orderBy(schema.users.name)
  .limit(20);
```

### Key Rules

- **Prevent N+1** — Use `include` (Prisma) or joins (Drizzle) instead of loops
- **Select only needed fields** — Don't `SELECT *`
- **Use cursor pagination** for large datasets
- **Index frequently queried columns** — Composite indexes for filtered queries
- **Singleton client** — Share one database client across the app
- **Use migrations** — Never push schema changes directly in production

See [references/database.md](./references/database.md) for CRUD operations, migrations, transactions, connection management, and optimization.

## Authentication & Authorization

### JWT Token Strategy

- **Access token**: 15 min, stateless, in `Authorization: Bearer` header
- **Refresh token**: 7 days, stored in database, rotated on use

```typescript
// Auth middleware
fastify.decorate("authenticate", async (request, reply) => {
  const token = request.headers.authorization?.slice(7); // Remove "Bearer "
  if (!token) return reply.code(401).send({ error: "Missing token" });

  try {
    request.user = verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ error: "Invalid token" });
  }
});
```

### RBAC

```typescript
function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await request.server.authenticate(request, reply);
    if (!roles.includes(request.user.role as Role)) {
      return reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}

// Usage
fastify.delete("/users/:id", { preHandler: [requireRole("admin")] }, handler);
```

### ABAC

For fine-grained access based on resource attributes:

```typescript
function canAccessAppointment(auth: AuthContext, appointment: Appointment): boolean {
  if (auth.role === "admin") return true;
  if (auth.role === "patient" && appointment.userId === auth.userId) return true;
  if (auth.role === "doctor" && appointment.doctorId === auth.userId) return true;
  return false;
}
```

### Security Rules

- Bcrypt with cost factor 12+ for passwords
- Rotate refresh tokens on each use
- Rate limit auth endpoints
- Log auth events (without passwords)

See [references/auth.md](./references/auth.md) for login flow, token refresh, OAuth 2.0, password hashing, and security best practices.

## Error Handling

### Global Error Handler

```typescript
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error.validation) {
    return reply.code(400).send({ error: "Validation Error", details: error.validation });
  }
  if (error.statusCode) {
    return reply.code(error.statusCode).send({ error: error.name, message: error.message });
  }
  return reply.code(500).send({ error: "Internal Server Error" });
});
```

### Custom Errors

```typescript
import createError from "@fastify/error";

const NotFoundError = createError("NOT_FOUND", "Resource %s not found", 404);
const ConflictError = createError("CONFLICT", "%s already exists", 409);

// Usage
throw new NotFoundError("User");
```

### HTTP Status Codes

| Code | Meaning | Use When |
|---|---|---|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Valid auth, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email taken) |
| 500 | Internal Error | Unexpected server errors |

## Docker

### Multi-Stage Build

Three stages: deps (prod only) → build (compile) → production (minimal runtime).

```dockerfile
FROM node:22-alpine AS production
RUN addgroup -S nodejs && adduser -S nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER nodejs
CMD ["node", "dist/index.js"]
```

### Key Rules

- **Non-root user** — Always `USER nodejs`
- **Health checks** — `/health`, `/health/live`, `/health/ready` endpoints
- **Graceful shutdown** — Handle `SIGTERM` and `SIGINT`, close connections
- **No secrets in images** — Inject via environment variables at runtime
- **Alpine base** — Smallest image size
- **Pin versions** — `node:22-alpine` not `node:latest`

See [references/docker.md](./references/docker.md) for full Dockerfile, Docker Compose, health checks, graceful shutdown, and production optimization.

## Post-Change Verification

After every Node.js code change, run the TypeScript verification protocol from the `typescript-writing-code` skill:

```bash
pnpm run type-check && pnpm run lint && pnpm run format && pnpm run test
```

All 4 steps must pass. See `typescript-writing-code` skill for details.

## Reference Files

| File | Description |
|---|---|
| [references/api-patterns.md](./references/api-patterns.md) | Fastify plugins, routes, hooks, error handling, OpenAPI, decorators |
| [references/validation.md](./references/validation.md) | Zod schemas, API request validation, env validation, error formatting |
| [references/database.md](./references/database.md) | Prisma, Drizzle, migrations, query optimization, N+1 prevention |
| [references/auth.md](./references/auth.md) | JWT, sessions, OAuth, RBAC, ABAC, permission guards |
| [references/docker.md](./references/docker.md) | Multi-stage builds, security, health checks, graceful shutdown |
