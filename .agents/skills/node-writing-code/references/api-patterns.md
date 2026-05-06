# API Patterns (Fastify)

## Plugin Architecture

Fastify uses a plugin-based architecture. Everything is a plugin — routes, middleware, database connections.

### Plugin Registration

```typescript
import Fastify from "fastify";

const app = Fastify({
  logger: true,
  trustProxy: true,
});

// Register plugins in order
await app.register(import("@fastify/cors"), {
  origin: ["http://localhost:3000"],
  credentials: true,
});
await app.register(import("@fastify/cookie"));
await app.register(import("@fastify/jwt"), {
  secret: process.env.JWT_SECRET!,
});

// Register route plugins
await app.register(import("./routes/auth"), { prefix: "/auth" });
await app.register(import("./routes/users"), { prefix: "/users" });
await app.register(import("./routes/appointments"), { prefix: "/appointments" });

await app.listen({ port: 3000, host: "0.0.0.0" });
```

### Route Plugin

```typescript
// routes/users.ts
import type { FastifyPluginAsync } from "fastify";

const usersPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string", format: "uuid" } }, required: ["id"] },
      response: { 200: UserSchema },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await fastify.userService.findById(id);
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }
      return user;
    },
  });

  fastify.post("/", {
    schema: {
      body: CreateUserSchema,
      response: { 201: UserSchema },
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = await fastify.userService.create(request.body as CreateUserInput);
      return reply.code(201).send(user);
    },
  });
};

export default usersPlugin;
```

### Route Organization

```
src/
├── routes/
│   ├── auth/
│   │   ├── index.ts        # Plugin registration
│   │   ├── login.ts         # POST /auth/login
│   │   ├── register.ts      # POST /auth/register
│   │   └── schemas.ts       # Request/response schemas
│   ├── users/
│   │   ├── index.ts
│   │   ├── get-user.ts
│   │   ├── update-user.ts
│   │   └── schemas.ts
│   └── appointments/
│       ├── index.ts
│       ├── create.ts
│       ├── list.ts
│       └── schemas.ts
├── plugins/
│   ├── database.ts          # Database connection plugin
│   ├── auth.ts              # Auth decorator plugin
│   └── services.ts          # Service layer registration
├── services/
│   ├── user.service.ts
│   └── appointment.service.ts
├── schemas/                  # Shared JSON schemas
│   ├── user.ts
│   └── appointment.ts
└── app.ts                    # App factory
```

## Hooks (Middleware)

Fastify uses hooks instead of Express middleware:

```typescript
// onRequest — runs before route handler
fastify.addHook("onRequest", async (request, reply) => {
  // Log all requests
  request.log.info({ url: request.url, method: request.method }, "incoming request");
});

// preHandler — runs after parsing, before handler
fastify.addHook("preHandler", async (request, reply) => {
  // Authentication check
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

// onSend — runs before sending response
fastify.addHook("onSend", async (request, reply, payload) => {
  // Add security headers
  reply.header("X-Content-Type-Options", "nosniff");
  return payload;
});
```

### Hook Order

```
onRequest → preParsing → preValidation → preHandler → handler → preSerialization → onSend → onResponse
```

## Error Handling

### Global Error Handler

```typescript
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error.validation) {
    return reply.code(400).send({
      error: "Validation Error",
      message: error.message,
      details: error.validation,
    });
  }

  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: error.name,
      message: error.message,
    });
  }

  return reply.code(500).send({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
});
```

### Custom HTTP Errors

```typescript
import createError from "@fastify/error";

const NotFoundError = createError("NOT_FOUND", "Resource %s not found", 404);
const ConflictError = createError("CONFLICT", "%s already exists", 409);
const ForbiddenError = createError("FORBIDDEN", "Insufficient permissions", 403);

// Usage in handler
const user = await service.findById(id);
if (!user) {
  throw new NotFoundError("User");
}
```

## OpenAPI / Swagger

```typescript
await app.register(import("@fastify/swagger"), {
  openapi: {
    info: {
      title: "DrZum API",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

await app.register(import("@fastify/swagger-ui"), {
  routePrefix: "/docs",
});
```

Routes with JSON Schema definitions automatically appear in the Swagger UI.

## Decorators

Extend Fastify instances with custom properties:

```typescript
// plugins/database.ts
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.decorate("db", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
};

export default fp(databasePlugin);

// Type augmentation
declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
  }
}
```

## Anti-Patterns

### Don't Use Express Middleware Directly

```typescript
// ❌ Wrong — Express middleware won't work correctly
app.use(expressMiddleware);

// ✅ Correct — use Fastify hooks or @fastify/middie for compatibility
import middie from "@fastify/middie";
await app.register(middie);
app.use(expressMiddleware);
```

### Don't Mutate Request/Reply

```typescript
// ❌ Wrong — modifying request directly
request.user = decoded;

// ✅ Correct — use decorators
fastify.decorateRequest("user", null);
request.user = decoded;
```

### Don't Forget to Use `fp()` for Shared Plugins

```typescript
// ❌ Wrong — plugin is scoped, decorators not visible to siblings
const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("db", pool);
};

// ✅ Correct — fp() makes plugin visible across the app
import fp from "fastify-plugin";
export default fp(plugin);
```
