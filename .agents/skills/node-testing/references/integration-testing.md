# Integration Testing

## Fastify Inject

Fastify's `inject` method sends requests without starting an HTTP server — fast, isolated, no port conflicts.

```typescript
import { buildApp } from "../app";
import type { FastifyInstance } from "fastify";

describe("Users API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /users/:id", () => {
    it("returns a user by ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/users/123",
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        id: "123",
        email: "test@example.com",
        name: "Test User",
      });
    });

    it("returns 404 for non-existent user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/users/non-existent",
        headers: { authorization: `Bearer ${testToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: "Not found" });
    });

    it("returns 401 without auth token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/users/123",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
```

## Supertest Alternative

If using Express or need HTTP-level testing:

```typescript
import request from "supertest";
import { buildApp } from "../app";

describe("Users API", () => {
  let app: Express;

  beforeAll(async () => {
    app = await buildApp();
  });

  it("creates a user", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${testToken}`)
      .send({
        email: "new@example.com",
        name: "New User",
        password: "password123",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: "new@example.com",
      name: "New User",
    });
    expect(response.body).not.toHaveProperty("password");
  });
});
```

## CRUD Test Patterns

### Create

```typescript
it("creates a resource and returns 201", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/appointments",
    headers: { authorization: `Bearer ${patientToken}` },
    payload: {
      doctorId: "doctor-123",
      dateTime: "2024-06-15T10:00:00Z",
      notes: "Consulta general",
    },
  });

  expect(response.statusCode).toBe(201);
  const appointment = response.json();
  expect(appointment).toMatchObject({
    id: expect.any(String),
    doctorId: "doctor-123",
    status: "scheduled",
  });
});

it("rejects invalid input with 400", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/appointments",
    headers: { authorization: `Bearer ${patientToken}` },
    payload: {
      // Missing required doctorId
      dateTime: "not-a-date",
    },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json().details).toHaveProperty("doctorId");
});
```

### Read (List + Filter)

```typescript
it("lists appointments with pagination", async () => {
  // Arrange: seed test data
  await seedAppointments(5);

  const response = await app.inject({
    method: "GET",
    url: "/appointments?page=1&limit=3",
    headers: { authorization: `Bearer ${patientToken}` },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.data).toHaveLength(3);
  expect(body.meta).toMatchObject({
    page: 1,
    limit: 3,
    total: 5,
  });
});

it("filters appointments by status", async () => {
  await seedAppointments(3, { status: "scheduled" });
  await seedAppointments(2, { status: "completed" });

  const response = await app.inject({
    method: "GET",
    url: "/appointments?status=scheduled",
    headers: { authorization: `Bearer ${patientToken}` },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().data).toHaveLength(3);
});
```

### Update

```typescript
it("updates a resource and returns 200", async () => {
  const appointment = await seedAppointment();

  const response = await app.inject({
    method: "PATCH",
    url: `/appointments/${appointment.id}`,
    headers: { authorization: `Bearer ${patientToken}` },
    payload: { notes: "Updated notes" },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().notes).toBe("Updated notes");
});

it("returns 403 when updating another user's resource", async () => {
  const appointment = await seedAppointment({ userId: "other-user" });

  const response = await app.inject({
    method: "PATCH",
    url: `/appointments/${appointment.id}`,
    headers: { authorization: `Bearer ${patientToken}` },
    payload: { notes: "Trying to modify" },
  });

  expect(response.statusCode).toBe(403);
});
```

### Delete

```typescript
it("deletes a resource and returns 204", async () => {
  const appointment = await seedAppointment();

  const response = await app.inject({
    method: "DELETE",
    url: `/appointments/${appointment.id}`,
    headers: { authorization: `Bearer ${adminToken}` },
  });

  expect(response.statusCode).toBe(204);

  // Verify deletion
  const getResponse = await app.inject({
    method: "GET",
    url: `/appointments/${appointment.id}`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(getResponse.statusCode).toBe(404);
});
```

## Auth Test Patterns

### Token Generation for Tests

```typescript
// test/helpers/auth.ts
import jwt from "jsonwebtoken";

export function generateTestToken(overrides: Partial<TokenPayload> = {}): string {
  return jwt.sign(
    {
      sub: "test-user-id",
      role: "patient",
      ...overrides,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
}

export const patientToken = generateTestToken({ role: "patient" });
export const doctorToken = generateTestToken({ sub: "doctor-id", role: "doctor" });
export const adminToken = generateTestToken({ sub: "admin-id", role: "admin" });
```

### Testing Protected Routes

```typescript
describe("authorization", () => {
  it("allows admin to delete any user", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/users/123",
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

  it("denies access with expired token", async () => {
    const expiredToken = jwt.sign(
      { sub: "user-id", role: "patient" },
      process.env.JWT_SECRET!,
      { expiresIn: "0s" }
    );

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expect(response.statusCode).toBe(401);
  });
});
```

## Database Setup for Tests

### Per-Test Cleanup

```typescript
import { prisma } from "../db/client";

beforeEach(async () => {
  // Clean tables in reverse dependency order
  await prisma.appointment.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Test Data Factories

```typescript
// test/factories/user.ts
let counter = 0;

export function createTestUser(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  counter++;
  return {
    email: `test-${counter}@example.com`,
    name: `Test User ${counter}`,
    role: "patient",
    ...overrides,
  };
}

export async function seedUser(overrides: Partial<CreateUserInput> = {}) {
  const data = createTestUser(overrides);
  return prisma.user.create({ data });
}

export async function seedAppointment(overrides: Partial<CreateAppointmentInput> = {}) {
  const user = await seedUser();
  const doctor = await seedUser({ role: "doctor" });
  return prisma.appointment.create({
    data: {
      userId: user.id,
      doctorId: doctor.id,
      dateTime: new Date("2024-06-15T10:00:00Z"),
      status: "scheduled",
      ...overrides,
    },
  });
}
```

## Anti-Patterns

### Don't Test Framework Internals

```typescript
// ❌ Wrong — testing Fastify's JSON parsing
it("parses JSON body", async () => {
  const response = await app.inject({ method: "POST", payload: { a: 1 } });
  expect(response.json()).toBeDefined();
});

// ✅ Correct — test YOUR business logic
it("creates appointment with valid data", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/appointments",
    payload: validAppointmentData,
  });
  expect(response.statusCode).toBe(201);
});
```

### Don't Share State Between Tests

```typescript
// ❌ Wrong — tests depend on each other
let createdUserId: string;

it("creates a user", async () => {
  const res = await createUser();
  createdUserId = res.json().id;
});

it("reads the created user", async () => {
  await getUser(createdUserId); // Depends on previous test
});

// ✅ Correct — each test is independent
it("reads a user", async () => {
  const user = await seedUser(); // Set up own data
  const res = await getUser(user.id);
  expect(res.statusCode).toBe(200);
});
```
