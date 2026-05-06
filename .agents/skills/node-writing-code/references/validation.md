# Validation with Zod

## Core Principles

1. **Validate at system boundaries** — HTTP handlers, environment variables, external API responses
2. **Trust internal code** — Don't re-validate data that's already been validated
3. **Parse, don't validate** — Zod transforms raw input into typed, validated data in one step

## Schema Definition

### Basic Schemas

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email("Correo electrónico no válido"),
  name: z.string().min(1, "Nombre requerido").max(100),
  age: z.number().int().positive().optional(),
  role: z.enum(["patient", "doctor", "admin"]),
  createdAt: z.coerce.date(),
});

type User = z.infer<typeof UserSchema>;
```

### Complex Schemas

```typescript
// Nested objects
const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}$/, "Código postal de 5 dígitos"),
});

// Arrays
const AppointmentListSchema = z.array(
  z.object({
    id: z.string().uuid(),
    doctorId: z.string().uuid(),
    dateTime: z.coerce.date(),
    status: z.enum(["scheduled", "completed", "cancelled"]),
  })
);

// Discriminated unions
const NotificationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("email"), email: z.string().email(), subject: z.string() }),
  z.object({ type: z.literal("sms"), phone: z.string(), message: z.string() }),
  z.object({ type: z.literal("push"), deviceToken: z.string(), title: z.string() }),
]);
```

### Schema Composition

```typescript
// Base schema
const BaseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// Extend for creation (password required)
const CreateUserSchema = BaseUserSchema.extend({
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Extend for update (all fields optional)
const UpdateUserSchema = BaseUserSchema.partial();

// Pick specific fields
const LoginSchema = BaseUserSchema.pick({ email: true }).extend({
  password: z.string().min(1),
});

// Omit fields
const PublicUserSchema = BaseUserSchema.omit({ email: true });
```

## API Request Validation

### Fastify Integration

```typescript
import { z } from "zod";

const CreateAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  dateTime: z.coerce.date().refine(
    (date) => date > new Date(),
    "La fecha debe ser futura"
  ),
  notes: z.string().max(500).optional(),
});

type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

fastify.post("/appointments", async (request, reply) => {
  const result = CreateAppointmentSchema.safeParse(request.body);

  if (!result.success) {
    return reply.code(400).send({
      error: "Validation Error",
      details: result.error.flatten().fieldErrors,
    });
  }

  const appointment = await service.create(result.data);
  return reply.code(201).send(appointment);
});
```

### Validation Middleware

```typescript
function validate<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        error: "Validation Error",
        details: result.error.flatten().fieldErrors,
      });
    }
    request.body = result.data;
  };
}

// Usage
fastify.post("/appointments", {
  preHandler: [authenticate, validate(CreateAppointmentSchema)],
  handler: async (request) => {
    const data = request.body as CreateAppointmentInput;
    return service.create(data);
  },
});
```

### Query Parameter Validation

```typescript
const SearchParamsSchema = z.object({
  q: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "date", "rating"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

fastify.get("/doctors", async (request) => {
  const params = SearchParamsSchema.parse(request.query);
  return service.search(params);
});
```

### Path Parameter Validation

```typescript
const IdParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

fastify.get("/users/:id", async (request) => {
  const { id } = IdParamSchema.parse(request.params);
  return service.findById(id);
});
```

## Environment Variable Validation

```typescript
// config/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default("15m"),
  REDIS_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().transform((s) => s.split(",")),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
```

Validate environment variables at startup — fail fast if configuration is invalid.

## Error Formatting

### Flatten Errors for API Response

```typescript
const result = schema.safeParse(data);
if (!result.success) {
  const errors = result.error.flatten();
  // { formErrors: string[], fieldErrors: { [key]: string[] } }

  return {
    error: "Validation Error",
    details: errors.fieldErrors,
  };
  // { details: { email: ["Correo no válido"], name: ["Nombre requerido"] } }
}
```

### Custom Error Messages

```typescript
const schema = z.object({
  email: z.string({
    required_error: "El correo es requerido",
    invalid_type_error: "El correo debe ser texto",
  }).email("Formato de correo no válido"),

  age: z.number({
    required_error: "La edad es requerida",
  }).int("Debe ser un número entero").positive("Debe ser positiva"),
});
```

## Anti-Patterns

### Don't Validate Deep in Business Logic

```typescript
// ❌ Wrong — validating in the service layer
class UserService {
  async create(data: unknown) {
    const parsed = CreateUserSchema.parse(data); // Too late
    return this.repo.create(parsed);
  }
}

// ✅ Correct — validate at the boundary, pass typed data
fastify.post("/users", async (request) => {
  const data = CreateUserSchema.parse(request.body);
  return userService.create(data); // Already validated
});
```

### Don't Use `.parse()` for Optional Validation

```typescript
// ❌ Wrong — throws on invalid input
try {
  const data = schema.parse(input);
} catch (e) {
  // handle error
}

// ✅ Correct — safeParse for expected failures
const result = schema.safeParse(input);
if (!result.success) {
  return { error: result.error.flatten() };
}
return result.data;
```

### Don't Duplicate Schemas and Types

```typescript
// ❌ Wrong — manual type that drifts from schema
interface User { email: string; name: string; }
const UserSchema = z.object({ email: z.string(), name: z.string() });

// ✅ Correct — derive type from schema
const UserSchema = z.object({ email: z.string(), name: z.string() });
type User = z.infer<typeof UserSchema>;
```
