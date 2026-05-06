# Code Quality

Standards for maintaining high-quality, maintainable code through proper commenting, testing, documentation, and review practices.

## Core Philosophy

Code quality is not optional. Quality code is:
- **Readable** — Easy to understand
- **Maintainable** — Easy to modify
- **Tested** — Verified to work
- **Documented** — Purpose is clear

## Quality Checklist

Before committing code, verify:

- Code is self-documenting (clear names, simple logic)
- Complex logic has explanatory comments
- All public APIs have documentation
- Tests are written and passing
- Test coverage meets standards for the code type
- No commented-out code
- No TODO comments (create issues instead)
- README updated if needed

## Self-Documenting Code

### Prefer Clarity Over Comments

```javascript
// BAD: Needs comments to explain
const t = i.reduce((a, c) => a + c.p * c.q, 0);

// GOOD: Self-explanatory
const total = items.reduce((sum, item) => {
  return sum + (item.price * item.quantity);
}, 0);
```

### Meaningful Comments Add Context

```javascript
// BAD: Restates the code
counter++; // Increment counter

// GOOD: Explains the reason
failedLoginAttempts++; // Track for rate limiting
```

### Document Public APIs

```javascript
/**
 * Processes an order through the payment gateway and updates inventory.
 *
 * @param {Object} order - The order to process
 * @param {string} order.id - Unique order identifier
 * @param {Array} order.items - Items in the order
 * @param {number} order.total - Order total in cents
 * @returns {Promise<Object>} Processed order with payment confirmation
 * @throws {PaymentError} If payment processing fails
 */
function processOrder(order) { /* ... */ }
```

## Documentation Standards

### Inline Documentation

Document: public APIs, complex algorithms, non-obvious code, function parameters and return values, important caveats or side effects.

### README Files

Every feature or module should have a README covering: overview, usage examples, API reference, configuration, dependencies, how to test.

### Architecture Decisions

Record significant decisions using Architecture Decision Records (ADRs): context, decision, consequences (positive and negative), alternatives considered.

### Documentation Rules

- Keep documentation close to code
- Update documentation with every behavioral change
- Use examples liberally
- Link related documentation
- Document "why", not just "what"

## Common Anti-Patterns

### Over-Commenting

```javascript
// BAD: Every line commented
const user = new User();   // Create a new user
user.name = 'John';        // Set the name
user.email = 'j@test.com'; // Set the email
user.save();               // Save the user
```

### Commented-Out Code

```javascript
// BAD: Dead code
function processPayment() {
  // const oldMethod = chargeCard();
  // return oldMethod;
  return newPaymentGateway.charge();
}

// GOOD: Delete it, trust version control
function processPayment() {
  return newPaymentGateway.charge();
}
```

### Misleading Comments

```javascript
// BAD: Comment does not match code
// Returns user by ID
function getUserByEmail(email) {
  return db.query('SELECT * FROM users WHERE email = ?', [email]);
}
```

### Untested Complex Logic

```javascript
// BAD: 50 lines of complex calculation without any tests
function calculatePricing(items, discounts, taxes, shipping, loyalty) {
  // Complex logic — no tests!
}
```

## Code Review Criteria

When reviewing code, check:

1. **Readability** — Is the code understandable?
2. **Tests** — Are there tests? Do they pass? Do they cover edge cases?
3. **Documentation** — Is complex logic explained?
4. **Standards** — Does it follow team conventions?
5. **Quality** — Would maintaining this code be comfortable?

## Integration with Other Principles

- **KISS** — Simple code needs fewer comments
- **DRY** — Document shared code once, in the shared location
- **YAGNI** — Do not document unused features
- **Testing standards** — Coverage targets guide quality thresholds
