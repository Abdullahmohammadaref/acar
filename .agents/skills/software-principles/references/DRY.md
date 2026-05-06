# DRY — Don't Repeat Yourself

## Definition

Every piece of knowledge must have a single, unambiguous, authoritative representation within a system. DRY targets knowledge and intent, not just identical code text.

Four forms of duplication:
- **Code duplication** — Same code in multiple places
- **Logic duplication** — Same logic expressed differently
- **Data duplication** — Same data stored in multiple locations
- **Process duplication** — Same process executed in multiple ways

## Detection Methods

### Identical Code Blocks

```javascript
// BAD: Repeated validation logic
function createUser(data) {
  if (!data.email) throw new Error('Email required');
  if (!data.email.includes('@')) throw new Error('Invalid email');
}

function updateUser(id, data) {
  if (!data.email) throw new Error('Email required');
  if (!data.email.includes('@')) throw new Error('Invalid email');
}
```

### Similar Patterns with Variations

```javascript
// BAD: Same structure with different table names
function getUserById(id) {
  return database.query('SELECT * FROM users WHERE id = ?', [id]);
}

function getProductById(id) {
  return database.query('SELECT * FROM products WHERE id = ?', [id]);
}
```

### Copy-Paste Indicators

- Multiple files change for a single logical change
- Similar bug fixes needed in multiple places
- Difficulty finding all instances of a pattern

## Prevention Strategies

### Extract Functions

```javascript
// GOOD: Shared validation
function validateEmail(email) {
  if (!email) throw new Error('Email required');
  if (!email.includes('@')) throw new Error('Invalid email');
}

function createUser(data) {
  validateEmail(data.email);
}

function updateUser(id, data) {
  validateEmail(data.email);
}
```

### Use Abstraction

```javascript
// GOOD: Generic function with parameters
function getEntityById(tableName, id) {
  return database.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
}

const getUserById = (id) => getEntityById('users', id);
const getProductById = (id) => getEntityById('products', id);
```

### Configuration Over Code

```javascript
// GOOD: Configuration-driven validation
const validationRules = {
  email: [
    { test: (v) => !!v, message: 'Email required' },
    { test: (v) => v.includes('@'), message: 'Invalid email' }
  ],
  password: [
    { test: (v) => v.length >= 8, message: 'Password too short' }
  ]
};

function validate(field, value) {
  const rules = validationRules[field];
  for (const rule of rules) {
    if (!rule.test(value)) throw new Error(rule.message);
  }
}
```

## When NOT to DRY

### 1. Premature Abstraction

Do not extract after one instance. Wait until the pattern appears three times before abstracting (Rule of Three).

```javascript
// After seeing the pattern once — do NOT abstract yet
function processUserData(data) { /* ... */ }

// After seeing it three times — NOW consider extraction
function processUserData(data) { /* ... */ }
function processProductData(data) { /* ... */ }
function processOrderData(data) { /* ... */ }
// Consider: function processData(type, data) { /* ... */ }
```

### 2. Coincidental Duplication

Similar code does not mean same intent. Two functions that look alike but serve different purposes should stay separate.

```javascript
// These look similar but serve different purposes — do NOT combine
function formatUserDisplayName(user) {
  return `${user.firstName} ${user.lastName}`;
}

function formatProductDescription(product) {
  return `${product.brand} ${product.model}`;
}
```

### 3. Over-Abstraction

Too much abstraction makes code harder to understand.

```javascript
// BAD: Over-abstracted pipeline
function process(config) {
  const { validator, transformer, persistor, notifier } = config;
  const validated = validator(config.data);
  const transformed = transformer(validated);
  const persisted = persistor(transformed);
  notifier(persisted);
}

// GOOD: Clear and explicit
function createUser(data) {
  validateUser(data);
  const user = transformUserData(data);
  const saved = saveUser(user);
  sendWelcomeEmail(saved);
}
```

## Benefits and Costs

**Benefits:** easier maintenance (one place to change), fewer bugs (no inconsistencies), better readability (clear intent), faster development (reuse), consistent behavior.

**Costs:** increased coupling (changes affect multiple callers), added complexity (abstraction layers), performance overhead (indirection), harder debugging (deeper stack traces).

## Best Practices

1. **Rule of Three** — Wait until code appears 3 times before extracting
2. **Name well** — Abstractions must have clear, descriptive names
3. **Keep it simple** — Do not over-parameterize
4. **Test thoroughly** — Shared code affects multiple consumers
5. **Refactor gradually** — Extract incrementally, not all at once
