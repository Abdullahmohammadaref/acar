---
name: node-testing
description: >-
  This skill should be used when writing, reviewing, or debugging Node.js
  backend tests. It covers integration testing with Fastify inject and
  Supertest, CRUD test patterns, authentication testing, Testcontainers for
  Docker-based database testing, and end-to-end user flow testing.
---

# Node.js Testing

Quick reference for testing Node.js backend services. Builds on the `typescript-testing` skill (Vitest config, mocking, coverage) — this skill covers backend-specific patterns. Reference files provide full examples and edge cases.

## Integration Testing

### Fastify Inject

Test routes without starting an HTTP server — fast, no port conflicts:

```typescript
const response = await app.inject({
  method: "POST",
  url: "/appointments",
  headers: { authorization: `Bearer ${testToken}` },
  payload: {
    doctorId: "doctor-123",
    dateTime: "2024-06-15T10:00:00Z",
  },
});

expect(response.statusCode).toBe(201);
expect(response.json()).toMatchObject({
  id: expect.any(String),
  status: "scheduled",
});
```

### CRUD Test Pattern

Every resource endpoint needs tests for:

| Operation | Success | Error Cases |
|---|---|---|
| Create | 201 + resource | 400 (validation), 409 (conflict), 401 (no auth) |
| Read | 200 + resource | 404 (not found), 403 (wrong user) |
| List | 200 + array + pagination | Filter/sort edge cases |
| Update | 200 + updated | 403 (not owner), 404, 400 (validation) |
| Delete | 204 | 403 (not admin), 404 |

### Validation Error Testing

```typescript
it("rejects invalid input with detailed errors", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/users",
    payload: { email: "not-an-email", name: "" },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json().details).toHaveProperty("email");
  expect(response.json().details).toHaveProperty("name");
});
```

See [references/integration-testing.md](./references/integration-testing.md) for Supertest, full CRUD patterns, response body assertions, and test helpers.

## Test Setup

### Database Cleanup

```typescript
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE appointments, users CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Test Data Factories

```typescript
let counter = 0;
export function createTestUser(overrides = {}): CreateUserInput {
  counter++;
  return { email: `test-${counter}@example.com`, name: `User ${counter}`, role: "patient", ...overrides };
}

export async function seedUser(overrides = {}) {
  return prisma.user.create({ data: createTestUser(overrides) });
}
```

### Token Generation

```typescript
export function generateTestToken(overrides = {}): string {
  return jwt.sign({ sub: "test-user", role: "patient", ...overrides }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

export const patientToken = generateTestToken({ role: "patient" });
export const doctorToken = generateTestToken({ sub: "doctor-id", role: "doctor" });
export const adminToken = generateTestToken({ sub: "admin-id", role: "admin" });
```

## Authentication Testing

```typescript
describe("authorization", () => {
  it("allows admin to delete users", async () => {
    const user = await seedUser();
    const response = await app.inject({
      method: "DELETE",
      url: `/users/${user.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(response.statusCode).toBe(204);
  });

  it("denies patient from deleting users", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/users/123",
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it("returns 401 with expired token", async () => {
    const expired = jwt.sign({ sub: "id", role: "patient" }, secret, { expiresIn: "0s" });
    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${expired}` },
    });
    expect(response.statusCode).toBe(401);
  });
});
```

## Testcontainers

Spin up real Docker containers for tests. No mocking the database.

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync("pnpm dlx prisma migrate deploy", { env: process.env });
}, 60_000); // Generous timeout for container startup

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});
```

### Key Rules

- **Start once per suite** — Not per test (too slow)
- **Set generous timeouts** — 60s for `beforeAll` with containers
- **Truncate between tests** — `TRUNCATE ... CASCADE` is fast
- **Use Alpine images** — Smaller, faster to pull
- **Use `withReuse()`** — Keeps container between dev test runs

### Multi-Container

```typescript
const [pgContainer, redisContainer] = await Promise.all([
  new PostgreSqlContainer("postgres:16-alpine").start(),
  new GenericContainer("redis:7-alpine").withExposedPorts(6379).start(),
]);
```

See [references/testcontainers.md](./references/testcontainers.md) for global setup, container reuse, Redis, multi-container networks, and performance tips.

## E2E Testing

Test complete user flows through the entire system:

```typescript
it("completes registration → login → profile access", async () => {
  // Register
  const reg = await app.inject({
    method: "POST", url: "/auth/register",
    payload: { email: "new@example.com", password: "pass123!", name: "Test" },
  });
  expect(reg.statusCode).toBe(201);

  // Login
  const login = await app.inject({
    method: "POST", url: "/auth/login",
    payload: { email: "new@example.com", password: "pass123!" },
  });
  const { accessToken } = login.json();

  // Access profile
  const profile = await app.inject({
    method: "GET", url: "/users/me",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  expect(profile.statusCode).toBe(200);
  expect(profile.json().email).toBe("new@example.com");
  expect(profile.json()).not.toHaveProperty("passwordHash");
});
```

### Concurrency Testing

```typescript
it("handles concurrent bookings for same slot", async () => {
  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      app.inject({ method: "POST", url: "/appointments", payload: sameSlotData, headers: authHeaders })
    )
  );

  expect(responses.filter((r) => r.statusCode === 201)).toHaveLength(1);
  expect(responses.filter((r) => r.statusCode === 409)).toHaveLength(4);
});
```

See [references/e2e-testing.md](./references/e2e-testing.md) for complete user flows, multi-service integration, error scenarios, and test organization.

## Post-Change Verification

After writing or modifying tests, run the full verification protocol:

```bash
pnpm run type-check && pnpm run lint && pnpm run format && pnpm run test
```

All 4 steps must pass. See `typescript-writing-code` skill for details.

## Reference Files

| File | Description |
|---|---|
| [references/integration-testing.md](./references/integration-testing.md) | Fastify inject, Supertest, CRUD patterns, auth testing, test helpers |
| [references/testcontainers.md](./references/testcontainers.md) | Docker-based testing, PostgreSQL containers, Redis, multi-container |
| [references/e2e-testing.md](./references/e2e-testing.md) | Complete user flows, concurrency testing, multi-service integration |
