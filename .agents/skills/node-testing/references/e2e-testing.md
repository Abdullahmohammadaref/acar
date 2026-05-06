# End-to-End Testing (Backend)

## Overview

E2E tests for backend services verify complete user flows through the entire system — from HTTP request to database to response. They test the full stack without mocking internal components.

## Test Architecture

```
E2E Test → HTTP Request → App Server → Middleware → Handler → Service → Database → Response
```

Everything is real — real database (via Testcontainers), real middleware, real validation.

## Complete User Flow Tests

### Registration → Login → Access Protected Resource

```typescript
describe("Auth flow (E2E)", () => {
  let app: FastifyInstance;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    process.env.DATABASE_URL = container.getConnectionUri();

    execSync("pnpm dlx prisma migrate deploy", { env: process.env });

    app = await buildApp({ logger: false });
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE refresh_tokens, users CASCADE`;
  });

  it("completes registration → login → profile access", async () => {
    // Step 1: Register
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "nuevo@example.com",
        password: "securePass123!",
        name: "Juan García",
      },
    });
    expect(registerResponse.statusCode).toBe(201);
    const { accessToken: registerToken } = registerResponse.json();
    expect(registerToken).toBeDefined();

    // Step 2: Login with the registered credentials
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "nuevo@example.com",
        password: "securePass123!",
      },
    });
    expect(loginResponse.statusCode).toBe(200);
    const { accessToken, refreshToken } = loginResponse.json();
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // Step 3: Access protected resource
    const profileResponse = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(profileResponse.statusCode).toBe(200);
    expect(profileResponse.json()).toMatchObject({
      email: "nuevo@example.com",
      name: "Juan García",
    });
    // Ensure password is never returned
    expect(profileResponse.json()).not.toHaveProperty("password");
    expect(profileResponse.json()).not.toHaveProperty("passwordHash");
  });

  it("handles token refresh flow", async () => {
    // Register and login
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "test@example.com", password: "pass123!", name: "Test" },
    });
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@example.com", password: "pass123!" },
    });
    const { refreshToken } = loginResponse.json();

    // Refresh token
    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    });
    expect(refreshResponse.statusCode).toBe(200);
    const newTokens = refreshResponse.json();
    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();
    expect(newTokens.refreshToken).not.toBe(refreshToken); // Rotated

    // Old refresh token should be invalid
    const replayResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken }, // Using old token
    });
    expect(replayResponse.statusCode).toBe(401);
  });
});
```

### Appointment Booking Flow

```typescript
describe("Appointment booking (E2E)", () => {
  let patientToken: string;
  let doctorToken: string;
  let doctorId: string;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE appointments, users CASCADE`;

    // Setup: create patient and doctor
    const patient = await seedUser({ role: "patient" });
    const doctor = await seedUser({ role: "doctor" });
    doctorId = doctor.id;
    patientToken = generateTestToken({ sub: patient.id, role: "patient" });
    doctorToken = generateTestToken({ sub: doctor.id, role: "doctor" });
  });

  it("books → confirms → completes appointment", async () => {
    // Patient books appointment
    const bookResponse = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${patientToken}` },
      payload: {
        doctorId,
        dateTime: "2024-06-15T10:00:00Z",
        notes: "Consulta general",
      },
    });
    expect(bookResponse.statusCode).toBe(201);
    const appointment = bookResponse.json();
    expect(appointment.status).toBe("scheduled");

    // Doctor views their appointments
    const listResponse = await app.inject({
      method: "GET",
      url: "/appointments?role=doctor",
      headers: { authorization: `Bearer ${doctorToken}` },
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data).toHaveLength(1);

    // Doctor completes the appointment
    const completeResponse = await app.inject({
      method: "PATCH",
      url: `/appointments/${appointment.id}`,
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: { status: "completed" },
    });
    expect(completeResponse.statusCode).toBe(200);
    expect(completeResponse.json().status).toBe("completed");
  });

  it("prevents double booking at same time", async () => {
    const dateTime = "2024-06-15T10:00:00Z";

    // First booking succeeds
    const first = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${patientToken}` },
      payload: { doctorId, dateTime },
    });
    expect(first.statusCode).toBe(201);

    // Second booking at same time fails
    const second = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${patientToken}` },
      payload: { doctorId, dateTime },
    });
    expect(second.statusCode).toBe(409);
  });
});
```

## Multi-Service Integration

When testing interactions between multiple services:

```typescript
describe("Notification on appointment booking", () => {
  it("sends notification when appointment is booked", async () => {
    // Mock external notification service
    const notificationSpy = vi.spyOn(notificationService, "send");

    const response = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${patientToken}` },
      payload: { doctorId, dateTime: "2024-06-15T10:00:00Z" },
    });

    expect(response.statusCode).toBe(201);
    expect(notificationSpy).toHaveBeenCalledWith({
      type: "appointment_booked",
      recipientId: doctorId,
      data: expect.objectContaining({ appointmentId: expect.any(String) }),
    });
  });
});
```

## Error Scenario Testing

```typescript
describe("Error handling (E2E)", () => {
  it("returns structured error on validation failure", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "not-an-email",
        password: "short",
        name: "",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe("Validation Error");
    expect(body.details).toHaveProperty("email");
    expect(body.details).toHaveProperty("password");
    expect(body.details).toHaveProperty("name");
  });

  it("handles concurrent requests gracefully", async () => {
    const dateTime = "2024-06-15T10:00:00Z";

    // Send 5 concurrent booking requests for the same slot
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({
          method: "POST",
          url: "/appointments",
          headers: { authorization: `Bearer ${patientToken}` },
          payload: { doctorId, dateTime },
        })
      )
    );

    const successes = responses.filter((r) => r.statusCode === 201);
    const conflicts = responses.filter((r) => r.statusCode === 409);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(4);
  });
});
```

## Test Organization

```
test/
├── setup/
│   ├── global-setup.ts     # Start Testcontainers
│   └── test-helpers.ts      # Token generation, seed functions
├── integration/
│   ├── auth.test.ts         # Auth routes
│   ├── users.test.ts        # User CRUD
│   └── appointments.test.ts # Appointment CRUD
├── e2e/
│   ├── auth-flow.test.ts    # Full auth flow
│   ├── booking-flow.test.ts # Full booking flow
│   └── admin-flow.test.ts   # Admin operations
└── factories/
    ├── user.factory.ts
    └── appointment.factory.ts
```

## Anti-Patterns

### Don't Mock the Database in E2E Tests

```typescript
// ❌ Wrong — defeats the purpose of E2E
vi.mock("@prisma/client", () => ({ PrismaClient: MockPrismaClient }));

// ✅ Correct — use a real database (Testcontainers)
container = await new PostgreSqlContainer().start();
```

### Don't Test Implementation Details

```typescript
// ❌ Wrong — testing internal service method calls
expect(userService.findById).toHaveBeenCalledWith("123");

// ✅ Correct — test the HTTP contract
expect(response.statusCode).toBe(200);
expect(response.json()).toMatchObject({ id: "123", name: "Test" });
```

### Don't Ignore Response Body in Error Cases

```typescript
// ❌ Wrong — only checking status code
expect(response.statusCode).toBe(400);

// ✅ Correct — verify error details too
expect(response.statusCode).toBe(400);
expect(response.json()).toMatchObject({
  error: "Validation Error",
  details: expect.any(Object),
});
```
