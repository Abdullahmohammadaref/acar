# Testing Standards

Standards and patterns for writing effective tests that catch bugs early, document behavior, and enable confident refactoring.

## Core Philosophy

Tests are first-class citizens. Write tests alongside production code, not after. Tests document how code should be used. Good tests enable fearless refactoring.

## Testing Pyramid

Distribute tests by speed, cost, and confidence:

```
        /\
       /  \
      / E2E\        5–10%
     /______\
    /        \
   /Integration\   20–30%
  /____________\
 /              \
/ Unit Tests     \ 60–70%
/________________\
```

### Unit Tests (60–70%)

- Test individual functions or methods in isolation
- Very fast (<100ms each)
- No external dependencies (use mocks/stubs)
- Test one thing at a time
- Provide precise failure feedback

```javascript
describe('Calculator', () => {
  test('adds two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('adds negative numbers', () => {
    expect(add(-2, -3)).toBe(-5);
  });
});
```

Write unit tests for: all business logic, utility functions, data transformations, validation logic.

### Integration Tests (20–30%)

- Test interactions between components
- Moderate speed (<1 second each)
- Use real dependencies where reasonable
- Verify contracts between modules

```javascript
describe('UserService Integration', () => {
  test('saves user to database and retrieves it', async () => {
    const savedUser = await userService.createUser({ name: 'John', email: 'john@example.com' });
    const retrieved = await userService.getUser(savedUser.id);
    expect(retrieved.name).toBe('John');
  });
});
```

Write integration tests for: database interactions, API endpoints, third-party integrations, complex component interactions.

### E2E Tests (5–10%)

- Test complete user workflows through the full stack
- Slow (seconds to minutes)
- Use real systems
- Fragile and expensive to maintain

Write E2E tests for: critical user journeys (registration, login, checkout), core business workflows.

### Distribution by Application Type

| Application | Unit | Integration | E2E |
|---|---|---|---|
| Backend API | 70% | 25% | 5% |
| Frontend | 50–60% | 30–40% | 5–10% |
| Full-stack | 60–70% | 20–30% | 5–10% |

### Anti-Pattern: Ice Cream Cone

An inverted pyramid (many E2E, few unit tests) results in: slow test suites, expensive maintenance, hard-to-debug failures, flaky tests.

## Test Structure — AAA Pattern

Arrange (set up data), Act (execute code), Assert (verify results).

```javascript
test('calculates order total with tax', () => {
  // Arrange
  const items = [{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }];
  const calculator = new OrderCalculator(0.1);

  // Act
  const total = calculator.calculateTotal(items);

  // Assert
  expect(total).toBe(27.5);
});
```

Rules:
- Separate sections with blank lines
- One logical assertion per test
- Single act per test — do not chain multiple actions
- Keep the Arrange section focused — extract complex setup to helper functions

### Given-When-Then (BDD Style)

```javascript
describe('Shopping Cart', () => {
  test('applies discount when cart total exceeds $100', () => {
    // Given a cart with items totaling $120
    const cart = new ShoppingCart();
    cart.addItem({ price: 100 });
    cart.addItem({ price: 20 });

    // When a 10% discount is applied
    cart.applyDiscount(0.10);

    // Then the total should be $108
    expect(cart.getTotal()).toBe(108);
  });
});
```

## Test Naming

Use descriptive names that state what is being tested and the expected outcome:

```javascript
// BAD
test('test1', () => {});
test('user test', () => {});

// GOOD
test('creates user with valid email', () => {});
test('throws error when email is invalid', () => {});
test('applies 10% discount when cart total exceeds $100', () => {});
```

## FIRST Principles

- **Fast** — Unit: <100ms, integration: <1s, E2E: <10s, full suite: minutes not hours
- **Independent** — Each test sets up its own data, runs in any order, one failure does not cascade
- **Repeatable** — Same results every time. No randomness, no external state, no system time dependency (mock it)
- **Self-validating** — Clear pass/fail with assertions, not manual verification
- **Timely** — Written alongside production code, not months later

## Coverage Targets

| Code Type | Target |
|---|---|
| Business logic | 80–100% |
| Utilities/helpers | 90–100% |
| Data access layer | 70–90% |
| API controllers | 60–80% |
| UI components | 40–70% |
| Configuration | 20–40% |

Branch coverage is the most important metric. Do not chase 100% — diminishing returns above ~85%.

### What NOT to Test

- Third-party libraries (do not test that lodash works)
- Framework internals (do not test that Express routes)
- Trivial getters/setters
- Constants and configuration values

## Best Practices

### Test Behavior, Not Implementation

```javascript
// BAD: Testing internals
test('uses correct algorithm', () => {
  const spy = jest.spyOn(calculator, 'quickSort');
  calculator.sortNumbers([3, 1, 2]);
  expect(spy).toHaveBeenCalled();
});

// GOOD: Testing behavior
test('sorts numbers in ascending order', () => {
  expect(calculator.sortNumbers([3, 1, 2])).toEqual([1, 2, 3]);
});
```

### Test Edge Cases and Errors

Do not only test the happy path:

```javascript
describe('divide', () => {
  test('divides positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  test('throws error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
  test('handles decimal results', () => {
    expect(divide(10, 3)).toBeCloseTo(3.333, 2);
  });
});
```

### Use Test Data Helpers

```javascript
function createTestUser(overrides = {}) {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    isActive: true,
    ...overrides
  };
}

test('activates inactive user', () => {
  const user = createTestUser({ isActive: false });
  const updated = activateUser(user.id);
  expect(updated.isActive).toBe(true);
});
```

### Use Test Doubles Appropriately

- **Stubs** — Provide fixed responses
- **Mocks** — Verify interactions
- **Spies** — Observe without changing behavior
- **Fakes** — Working implementations for testing

Use the simplest test double that works.

## Common Anti-Patterns

1. **Testing implementation details** — Do not test private methods or internal state
2. **Fragile tests** — Tests that break when refactoring working code
3. **Slow tests** — Tests that take too long reduce their value
4. **Flaky tests** — Random failures erode trust in the suite
5. **Test interdependence** — Tests relying on execution order or shared state
6. **Logic in tests** — No loops or conditionals inside test bodies
7. **Multiple unrelated assertions** — Each test verifies one logical thing

## Integration with Feature Slicing

When using feature slicing, keep tests within the feature directory:

```
/features
  /user-management
    service.js
    /tests
      service.test.js
      integration.test.js
```

Test features in isolation. Mock interactions with other features.

## Gradual Coverage Improvement

Do not try to reach 80% overnight:

1. Measure current coverage
2. Set target at current + 5–10%
3. Focus on high-value tests first (business logic)
4. Enforce threshold in CI
5. Increase threshold gradually over time
