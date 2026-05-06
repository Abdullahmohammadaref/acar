# Database Access

## Prisma

### Setup

```bash
pnpm add prisma @prisma/client
pnpm dlx prisma init
```

### Schema Definition

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(PATIENT)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  appointments Appointment[]
  profile      Profile?

  @@map("users")
}

model Appointment {
  id        String            @id @default(uuid())
  userId    String            @map("user_id")
  doctorId  String            @map("doctor_id")
  dateTime  DateTime          @map("date_time")
  status    AppointmentStatus @default(SCHEDULED)
  notes     String?
  createdAt DateTime          @default(now()) @map("created_at")

  user   User @relation(fields: [userId], references: [id])
  doctor User @relation("DoctorAppointments", fields: [doctorId], references: [id])

  @@index([userId])
  @@index([doctorId])
  @@index([dateTime])
  @@map("appointments")
}

enum Role {
  PATIENT
  DOCTOR
  ADMIN
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}
```

### CRUD Operations

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create
const user = await prisma.user.create({
  data: {
    email: "patient@example.com",
    name: "Juan García",
    role: "PATIENT",
  },
});

// Read
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { profile: true },
});

// Update
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: "Juan García López" },
});

// Delete
await prisma.user.delete({ where: { id: userId } });

// List with filtering and pagination
const appointments = await prisma.appointment.findMany({
  where: {
    userId,
    status: "SCHEDULED",
    dateTime: { gte: new Date() },
  },
  orderBy: { dateTime: "asc" },
  take: 20,
  skip: 0,
  include: { doctor: { select: { id: true, name: true } } },
});
```

### Migrations

```bash
# Create migration from schema changes
pnpm dlx prisma migrate dev --name add_appointments

# Apply migrations in production
pnpm dlx prisma migrate deploy

# Reset database (dev only)
pnpm dlx prisma migrate reset

# Generate client after schema change
pnpm dlx prisma generate
```

### Transactions

```typescript
// Interactive transaction
const [user, appointment] = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const appointment = await tx.appointment.create({
    data: { ...appointmentData, userId: user.id },
  });
  return [user, appointment];
});

// Sequential transaction (simpler, auto-rollback)
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.profile.create({ data: profileData }),
]);
```

## Drizzle ORM

### Setup

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### Schema Definition

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["patient", "doctor", "admin"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "completed", "cancelled"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("patient"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  doctorId: uuid("doctor_id").notNull().references(() => users.id),
  dateTime: timestamp("date_time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### CRUD Operations

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, gte, desc } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// Create
const [user] = await db.insert(schema.users).values({
  email: "patient@example.com",
  name: "Juan García",
}).returning();

// Read
const user = await db.query.users.findFirst({
  where: eq(schema.users.id, userId),
  with: { profile: true },
});

// Update
await db.update(schema.users)
  .set({ name: "Juan García López" })
  .where(eq(schema.users.id, userId));

// Delete
await db.delete(schema.users).where(eq(schema.users.id, userId));

// List with filtering
const appointments = await db.select()
  .from(schema.appointments)
  .where(and(
    eq(schema.appointments.userId, userId),
    eq(schema.appointments.status, "scheduled"),
    gte(schema.appointments.dateTime, new Date()),
  ))
  .orderBy(schema.appointments.dateTime)
  .limit(20);
```

### Drizzle Migrations

```bash
# Generate migration
pnpm dlx drizzle-kit generate

# Apply migration
pnpm dlx drizzle-kit migrate

# Push schema directly (dev only)
pnpm dlx drizzle-kit push
```

## Query Optimization

### N+1 Prevention

```typescript
// ❌ N+1 — one query per appointment's doctor
const appointments = await prisma.appointment.findMany({ where: { userId } });
for (const apt of appointments) {
  apt.doctor = await prisma.user.findUnique({ where: { id: apt.doctorId } });
}

// ✅ Correct — include in a single query
const appointments = await prisma.appointment.findMany({
  where: { userId },
  include: { doctor: { select: { id: true, name: true, specialty: true } } },
});
```

### Select Only Needed Fields

```typescript
// ❌ Wrong — fetches all columns
const users = await prisma.user.findMany();

// ✅ Correct — fetch only what you need
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});
```

### Pagination

```typescript
// Offset-based pagination
const { page = 1, limit = 20 } = params;
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: "desc" },
});

// Cursor-based pagination (better for large datasets)
const users = await prisma.user.findMany({
  take: 20,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0, // Skip the cursor itself
  orderBy: { createdAt: "desc" },
});
```

### Indexing

```prisma
model Appointment {
  // ...
  @@index([userId, status])    // Composite index for filtered queries
  @@index([dateTime])          // Index for date range queries
  @@index([doctorId, dateTime]) // Index for doctor schedule queries
}
```

## Connection Management

### Singleton Pattern

```typescript
// db/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### Graceful Shutdown

```typescript
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

## Anti-Patterns

### Don't Use Raw Queries for Simple Operations

```typescript
// ❌ Wrong — raw SQL when ORM handles it
const users = await prisma.$queryRaw`SELECT * FROM users WHERE role = 'doctor'`;

// ✅ Correct — use the ORM
const users = await prisma.user.findMany({ where: { role: "DOCTOR" } });
```

### Don't Skip Migrations

```bash
# ❌ Wrong — pushing directly in production
pnpm dlx prisma db push

# ✅ Correct — use migrations for trackable schema changes
pnpm dlx prisma migrate dev --name add_specialty_field
```

### Don't Ignore Connection Limits

```typescript
// ❌ Wrong — creating new client per request
app.get("/users", async () => {
  const prisma = new PrismaClient(); // New connection pool each time!
  return prisma.user.findMany();
});

// ✅ Correct — shared singleton
import { prisma } from "./db/client";
app.get("/users", async () => {
  return prisma.user.findMany();
});
```
