# Testcontainers

## Overview

Testcontainers spins up real Docker containers for integration tests. No mocking databases — test against the real thing with complete isolation.

## Setup

```bash
pnpm add -D @testcontainers/postgresql testcontainers
```

**Requirement**: Docker must be running on the machine.

## PostgreSQL Container

### Basic Setup

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

beforeAll(async () => {
  // Start a PostgreSQL container
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test")
    .withPassword("test")
    .start();

  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = container.getConnectionUri();

  // Run migrations
  execSync("pnpm dlx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });

  // Create Prisma client
  prisma = new PrismaClient({
    datasources: { db: { url: container.getConnectionUri() } },
  });
}, 60_000); // 60s timeout for container startup

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});
```

### Per-Test Isolation

```typescript
beforeEach(async () => {
  // Truncate all tables between tests
  await prisma.$executeRaw`TRUNCATE TABLE appointments, profiles, users CASCADE`;
});
```

### With Seeded Data

```typescript
beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withCopyFilesToContainer([
      { source: "./test/fixtures/seed.sql", target: "/docker-entrypoint-initdb.d/seed.sql" },
    ])
    .start();
});
```

## Container Reuse

### Share Container Across Test Files

```typescript
// test/setup/database.ts
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer | null = null;

export async function getTestDatabase(): Promise<string> {
  if (!container) {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withReuse()
      .start();
  }
  return container.getConnectionUri();
}

export async function stopTestDatabase(): Promise<void> {
  if (container) {
    await container.stop();
    container = null;
  }
}
```

### Global Setup in Vitest

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: ["./test/setup/global-setup.ts"],
  },
});

// test/setup/global-setup.ts
import { PostgreSqlContainer } from "@testcontainers/postgresql";

export async function setup() {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();

  // Run migrations
  execSync("pnpm dlx prisma migrate deploy", {
    env: { ...process.env },
  });

  // Store container reference for teardown
  return () => container.stop();
}

export async function teardown(stop: () => Promise<void>) {
  await stop();
}
```

## Redis Container

```typescript
import { GenericContainer } from "testcontainers";

let redisContainer: StartedTestContainer;

beforeAll(async () => {
  redisContainer = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start();

  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
}, 30_000);

afterAll(async () => {
  await redisContainer.stop();
});
```

## Multi-Container Setup

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer } from "testcontainers";
import { Network } from "testcontainers";

let network: StartedNetwork;
let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedTestContainer;

beforeAll(async () => {
  // Create a shared network
  network = await new Network().start();

  // Start containers on the same network
  [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine")
      .withNetwork(network)
      .withNetworkAliases("postgres")
      .start(),
    new GenericContainer("redis:7-alpine")
      .withNetwork(network)
      .withNetworkAliases("redis")
      .withExposedPorts(6379)
      .start(),
  ]);

  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
}, 90_000);

afterAll(async () => {
  await Promise.all([pgContainer.stop(), redisContainer.stop()]);
  await network.stop();
});
```

## Testing with Testcontainers

### Full Integration Test

```typescript
describe("Appointment Service (integration)", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let service: AppointmentService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    process.env.DATABASE_URL = container.getConnectionUri();

    execSync("pnpm dlx prisma migrate deploy", { env: process.env });

    prisma = new PrismaClient();
    service = new AppointmentService(prisma);
  }, 60_000);

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE appointments, users CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it("creates an appointment", async () => {
    const patient = await prisma.user.create({ data: { email: "p@test.com", name: "Patient", role: "PATIENT" } });
    const doctor = await prisma.user.create({ data: { email: "d@test.com", name: "Doctor", role: "DOCTOR" } });

    const appointment = await service.create({
      userId: patient.id,
      doctorId: doctor.id,
      dateTime: new Date("2024-06-15T10:00:00Z"),
    });

    expect(appointment.id).toBeDefined();
    expect(appointment.status).toBe("SCHEDULED");
  });

  it("prevents double booking", async () => {
    const patient = await prisma.user.create({ data: { email: "p@test.com", name: "Patient", role: "PATIENT" } });
    const doctor = await prisma.user.create({ data: { email: "d@test.com", name: "Doctor", role: "DOCTOR" } });
    const dateTime = new Date("2024-06-15T10:00:00Z");

    await service.create({ userId: patient.id, doctorId: doctor.id, dateTime });

    await expect(
      service.create({ userId: patient.id, doctorId: doctor.id, dateTime })
    ).rejects.toThrow("Time slot not available");
  });
});
```

## Performance Tips

1. **Reuse containers** — `withReuse()` keeps containers between test runs in development
2. **Use Alpine images** — `postgres:16-alpine` instead of `postgres:16`
3. **Parallel startup** — Start multiple containers with `Promise.all`
4. **Truncate, don't recreate** — Truncate tables between tests, don't restart the container
5. **Global setup** — Start containers once in Vitest's `globalSetup`, not per file

## Anti-Patterns

### Don't Start Containers Per Test

```typescript
// ❌ Wrong — extremely slow
it("creates a user", async () => {
  const container = await new PostgreSqlContainer().start();
  // ... test ...
  await container.stop();
});

// ✅ Correct — start once per suite
beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
});
```

### Don't Forget the Timeout

```typescript
// ❌ Wrong — default 5s timeout, container takes 10-30s
beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
});

// ✅ Correct — generous timeout for container startup
beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
}, 60_000);
```
