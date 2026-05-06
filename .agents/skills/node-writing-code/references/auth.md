# Authentication & Authorization

## JWT Authentication

### Token Strategy

Use a dual-token approach:
- **Access token** — Short-lived (15 min), stateless, carried in `Authorization: Bearer` header
- **Refresh token** — Longer-lived (7 days), stored in httpOnly cookie or secure storage, used to get new access tokens

### Token Generation

```typescript
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

interface TokenPayload {
  sub: string;    // User ID
  role: string;   // User role
  iat?: number;
  exp?: number;
}

function generateAccessToken(userId: string, role: string): string {
  const payload: TokenPayload = { sub: userId, role };
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "15m",
    issuer: "drzum",
  });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" }
  );
}

function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}
```

### Auth Middleware (Fastify)

```typescript
import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub, role: payload.role };
    } catch (err) {
      return reply.code(401).send({ error: "Invalid or expired token" });
    }
  });
};

export default fp(authPlugin);

// Type augmentation
declare module "fastify" {
  interface FastifyRequest {
    user: { id: string; role: string };
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

### Login Flow

```typescript
fastify.post("/auth/login", async (request, reply) => {
  const { email, password } = LoginSchema.parse(request.body);

  const user = await userService.findByEmail(email);
  if (!user) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token hash in database
  await tokenService.storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
});
```

### Token Refresh

```typescript
fastify.post("/auth/refresh", async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken: string };

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };

    // Verify token exists in database (not revoked)
    const stored = await tokenService.findRefreshToken(payload.sub, refreshToken);
    if (!stored) {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }

    const user = await userService.findById(payload.sub);
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }

    // Rotate: invalidate old, issue new
    await tokenService.revokeRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);
    await tokenService.storeRefreshToken(user.id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch {
    return reply.code(401).send({ error: "Invalid refresh token" });
  }
});
```

## Password Hashing

```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Rules:**
- Always use bcrypt with cost factor 12+
- Never store plaintext passwords
- Never log passwords, even hashed

## Role-Based Access Control (RBAC)

### Role Definition

```typescript
const ROLES = {
  patient: ["read:own_profile", "read:own_appointments", "create:appointment"],
  doctor: ["read:own_profile", "read:patients", "read:appointments", "update:appointment_status"],
  admin: ["read:all", "write:all", "delete:all", "manage:users"],
} as const;

type Role = keyof typeof ROLES;
type Permission = (typeof ROLES)[Role][number];
```

### Permission Guard

```typescript
function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await request.server.authenticate(request, reply);

    if (!roles.includes(request.user.role as Role)) {
      return reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}

function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await request.server.authenticate(request, reply);

    const userPermissions = ROLES[request.user.role as Role] ?? [];
    if (!userPermissions.includes(permission)) {
      return reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}

// Usage
fastify.get("/admin/users", {
  preHandler: [requireRole("admin")],
  handler: async () => userService.listAll(),
});

fastify.delete("/appointments/:id", {
  preHandler: [requirePermission("delete:all")],
  handler: async (request) => {
    const { id } = request.params as { id: string };
    return appointmentService.delete(id);
  },
});
```

## Attribute-Based Access Control (ABAC)

For fine-grained authorization based on resource attributes:

```typescript
interface AuthContext {
  userId: string;
  role: string;
}

interface AppointmentResource {
  userId: string;
  doctorId: string;
  status: string;
}

function canAccessAppointment(auth: AuthContext, appointment: AppointmentResource): boolean {
  // Admin can access all
  if (auth.role === "admin") return true;

  // Patient can access their own
  if (auth.role === "patient" && appointment.userId === auth.userId) return true;

  // Doctor can access their patients'
  if (auth.role === "doctor" && appointment.doctorId === auth.userId) return true;

  return false;
}

// Usage in handler
fastify.get("/appointments/:id", {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    const appointment = await appointmentService.findById(request.params.id);
    if (!appointment) return reply.code(404).send({ error: "Not found" });

    if (!canAccessAppointment(request.user, appointment)) {
      return reply.code(403).send({ error: "Access denied" });
    }

    return appointment;
  },
});
```

## OAuth 2.0 Integration

### Google OAuth

```typescript
await app.register(import("@fastify/oauth2"), {
  name: "googleOAuth",
  scope: ["profile", "email"],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID!,
      secret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  startRedirectPath: "/auth/google",
  callbackUri: `${process.env.BASE_URL}/auth/google/callback`,
  discovery: { issuer: "https://accounts.google.com" },
});

fastify.get("/auth/google/callback", async (request, reply) => {
  const { token } = await fastify.googleOAuth.getAccessTokenFromAuthorizationCodeFlow(request);

  // Fetch Google profile
  const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  }).then((r) => r.json());

  // Find or create user
  let user = await userService.findByEmail(profile.email);
  if (!user) {
    user = await userService.create({
      email: profile.email,
      name: profile.name,
      provider: "google",
      providerId: profile.id,
    });
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  await tokenService.storeRefreshToken(user.id, refreshToken);

  // Redirect to frontend with tokens
  return reply.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
});
```

## Security Best Practices

1. **Never expose tokens in URLs** — Use POST body or httpOnly cookies for refresh tokens
2. **Rotate refresh tokens** — Issue a new refresh token on each use, revoke the old one
3. **Short access token lifetime** — 15 minutes maximum
4. **Revoke on logout** — Delete refresh tokens from the database on logout
5. **Rate limit auth endpoints** — Prevent brute-force attacks
6. **Constant-time comparison** — Use `crypto.timingSafeEqual` for token comparison
7. **Log auth events** — Log successful and failed login attempts (without passwords)
