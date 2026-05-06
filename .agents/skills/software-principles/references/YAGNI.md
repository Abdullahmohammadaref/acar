# YAGNI — You Aren't Gonna Need It

Build for today, not for tomorrow. Do not add functionality until it is actually needed, not when it is merely foreseen.

## The Cost of Premature Features

1. **Development time** — Time spent building unused features could address actual requirements
2. **Maintenance burden** — Every line of code must be maintained, tested, and understood
3. **Increased complexity** — Extra code makes the system harder to understand and modify
4. **Wrong abstractions** — Features built too early are often based on incorrect assumptions
5. **Opportunity cost** — Resources spent on speculation are unavailable for real needs

## Common Violations

### Premature Abstraction

```javascript
// BAD: Strategy patterns for a single storage backend
class UserManager {
  constructor() {
    this.storageStrategy = this.getStorageStrategy();  // Only SQL is ever used
    this.cacheStrategy = this.getCacheStrategy();       // Only LRU is ever used
    this.validationStrategy = this.getValidationStrategy(); // Only standard
  }
}

// GOOD: Direct implementation
class UserManager {
  constructor(database) {
    this.db = database;
  }
  async getUser(id) {
    return await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
// Add abstraction only when multiple storage backends are actually needed
```

### Speculative Features

```javascript
// BAD: 20 math operations when only add and subtract were requested
class Calculator {
  add(a, b) { return a + b; }
  subtract(a, b) { return a - b; }
  multiply(a, b) { return a * b; }     // Nobody asked for this
  power(base, exp) { return Math.pow(base, exp); } // Nobody asked for this
  // ... 15 more unused operations
}

// GOOD: Implement actual requirements
class Calculator {
  add(a, b) { return a + b; }
  subtract(a, b) { return a - b; }
}
// Add multiply() when it is actually needed
```

### Over-Configuration

```javascript
// BAD: 15 config options that nobody ever changes from defaults
class EmailService {
  constructor(config) {
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.compressionLevel = config.compressionLevel || 6;
    // Nobody has ever changed these
  }
}

// GOOD: Only configure what is needed
class EmailService {
  constructor({ host, port, username, password }) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
  }
}
```

### Premature Optimization

```javascript
// BAD: LRU cache, worker pool, batching — for data sets under 100 items
class DataProcessor {
  constructor() {
    this.cache = new LRUCache(10000);
    this.workerPool = new WorkerThreadPool(8);
  }
}

// GOOD: Simple solution first
class DataProcessor {
  process(data) {
    return data.map(item => this.processItem(item));
  }
}
// Optimize only when there is a measured performance problem
```

## Decision Framework

Before implementing, ask:

1. **Is this required NOW?** — If no, do not build it.
2. **Is there a concrete use case?** — If no, do not build it.
3. **Is this based on actual requirements?** — If no, do not build it.
4. **Will this complicate the codebase?** — If yes, the benefit must justify the cost.
5. **Can this be added later without significant refactoring?** — If yes, add it later.

### Red Flag Phrases

- "We might need this someday"
- "This will make it more flexible"
- "Let's future-proof this"
- "We should support multiple X"
- "What if we want to Y?"

## When NOT to Apply YAGNI

YAGNI does not mean "never plan ahead." Do not apply YAGNI to:

1. **Architecture decisions that are hard to change** — Database schema, API contracts, file formats
2. **Security and compliance** — Authentication, authorization, encryption, audit logging
3. **Known immediate requirements** — Features in the current sprint or iteration
4. **Critical non-functional requirements** — Performance constraints, reliability targets

## Balancing YAGNI

- **YAGNI vs DRY** — Do not extract abstractions until duplication is clear. Wait for three instances (Rule of Three).
- **YAGNI vs SOLID** — Do not design for extensibility that is not needed. Apply SOLID when requirements demonstrate the need.
- **YAGNI vs Good Design** — YAGNI does not mean writing bad code. Still write clean, maintainable code. Just do not add unused features.

## Best Practices

1. **Start with MVP** — Build the minimum viable solution first
2. **Iterate based on feedback** — Add features when they are actually needed
3. **Delete unused code** — Remove features that are not being used
4. **Question assumptions** — Challenge "we might need" thinking
5. **Refactor when needed** — Do not fear changing code later; it is often easier than anticipated

## Common Objections

**"Refactoring later will be expensive"** — Building unused features now is expensive too. Refactoring is often easier than anticipated. The feature may never be needed.

**"We need flexibility"** — Build flexibility when it is needed. Premature flexibility adds complexity. The right abstractions come from real usage, not speculation.

**"This will be harder to add later"** — Maybe, but maybe it will never be needed. The cost now is certain; the cost later is uncertain. More information will be available later to make a better decision.
