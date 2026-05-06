# Feature Slicing

Organize code by business features (vertical slices) rather than by technical layers (horizontal slices). Each feature contains all the code it needs — UI, business logic, data access — in one cohesive module.

## Vertical vs Horizontal

**Horizontal (layered):**
```
/controllers
  userController.js
  productController.js
/services
  userService.js
  productService.js
/models
  user.js
  product.js
```

**Vertical (feature-sliced):**
```
/features
  /user-management
    controller.js
    service.js
    repository.js
    model.js
    tests/
  /product-catalog
    controller.js
    service.js
    repository.js
    model.js
    tests/
```

| Aspect | Feature Slicing | Layered Architecture |
|---|---|---|
| Organization | By business feature | By technical layer |
| Cohesion | High (related code together) | Low (scattered across layers) |
| Coupling | Low (features independent) | High (layers depend on each other) |
| Navigation | Easy (one directory per feature) | Hard (spread across multiple directories) |
| Parallel work | Easy (different features) | Conflicts (same layers) |

## Workflow

### Step 1: Identify the Feature

Ask: What user-facing capability is being built? What is the smallest useful version?

### Step 2: Create Feature Directory

```
/features
  /user-authentication
    /api           # Routes, controllers
    /domain        # Business logic
    /data          # Data access
    /tests         # Feature tests
```

For simple features, a flat structure works:
```
/features
  /user-authentication
    controller.js
    service.js
    repository.js
    model.js
    tests/
```

### Step 3: Implement Outside-In

Start with the API/UI layer, then implement business logic, then data access.

1. **Define the interface** (controller/API) — What the outside world sees
2. **Implement business logic** (service) — Domain rules and orchestration
3. **Implement data access** (repository) — Database queries and persistence
4. **Define data models** — Domain types

### Step 4: Write Tests Within the Feature

Keep all tests for a feature inside its directory.

### Step 5: Integrate

Connect the feature to the main application through routing or module loading.

## Key Rules

1. **Feature first** — Organize by what users see, not technical layers
2. **Vertical slices** — Each feature is a complete slice through all layers
3. **Shared last** — Do not create shared code until the same pattern appears in 3+ features
4. **Independence** — Features must not directly import from other features
5. **Complete features** — Include tests and everything needed in the feature directory
6. **Consistent structure** — All features follow the same internal directory convention

## Anti-Patterns

### Starting with Horizontal Layers

Building all controllers first, then all services, then all models defeats the purpose.

**Fix:** Implement one complete feature at a time, top to bottom.

### Premature Shared Abstractions

Creating base classes or shared utilities after implementing just one feature.

**Fix:** Wait for 3+ instances of the same pattern before extracting shared code.

### Generic Utilities Folder

Dumping everything into a `/utils` or `/helpers` directory.

**Fix:** Keep utilities within features. Extract to `/shared` only after seeing the same code in 3+ features.

### Direct Feature-to-Feature Dependencies

One feature importing directly from another.

```javascript
// BAD: Direct dependency
import { UserService } from '../user-management/userService.js';

// GOOD: Communicate through injected APIs or events
class OrderService {
  constructor(userAPI, productAPI) {
    this.userAPI = userAPI;
    this.productAPI = productAPI;
  }
}
```

### Mixing Framework Code with Business Logic

Putting framework-specific code (routes, middleware) directly in service classes.

**Fix:** Separate framework adapters from pure business logic. The service layer should have no framework dependencies.

### Over-Abstracting on First Implementation

Creating complex factory patterns and generic processors for the first feature.

**Fix:** Start simple and direct. Add abstraction only when the pattern becomes clear across multiple features.

### God Features (Too Large)

A single feature directory with 20+ files covering authentication, profiles, settings, and notifications.

**Fix:** Split into smaller, focused features — each with a single, clear responsibility.

### Inconsistent Structure

Each feature using a different internal directory layout.

**Fix:** Establish one convention and apply it to all features.

## When NOT to Use Feature Slicing

- Very small applications (fewer than 5 features)
- Single-developer projects with simple requirements
- When the team prefers and understands layered architecture

## Trade-offs

**Benefits:** high cohesion, low coupling, easy navigation, clear ownership, parallel development, easy feature removal.

**Costs:** some initial code duplication across features, requires discipline to avoid premature sharing, may feel unfamiliar to developers used to layered architecture.
