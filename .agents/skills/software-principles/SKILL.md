---
name: software-principles
description: >-
  This skill should be used when designing features, refactoring code, reviewing
  code quality, making architectural decisions, writing tests, or applying design
  principles like DRY, SOLID, KISS, and YAGNI. It covers feature slicing,
  testing strategies, and code quality standards.
---

# Software Principles

Fundamental design principles, testing strategies, and code quality standards for building maintainable software.

## Core Design Principles

### DRY — Don't Repeat Yourself

Every piece of knowledge must have a single, unambiguous, authoritative representation within the system. DRY applies to knowledge and intent, not just code text.

**Rule of Three:** Wait until code appears three times before extracting an abstraction. Premature extraction creates wrong abstractions. Two instances of similar code may be coincidental — three confirms a real pattern.

Key distinctions:
- **Real duplication** — Same logic, same intent. Extract it into a shared function or module.
- **Coincidental duplication** — Similar code, different intent. Leave it alone. Two functions formatting strings for different purposes should not be merged just because they look alike.
- **Over-abstraction** — Forced generalization that obscures meaning. A 5-parameter generic function is worse than two clear, specific functions.

Prevention strategies: extract common logic into named functions, use configuration-driven approaches for repeated patterns, prefer composition over inheritance for code reuse.

See [references/DRY.md](./references/DRY.md) for detection methods, prevention strategies, and code examples.

### SOLID

Five principles for object-oriented design by Robert C. Martin:

1. **Single Responsibility (SRP)** — A class has only one reason to change. Separate concerns into distinct classes. A `User` class should not handle database operations, email sending, and validation — split those into `UserRepository`, `UserNotifier`, and `UserValidator`.
2. **Open/Closed (OCP)** — Open for extension, closed for modification. Use polymorphism instead of conditionals. Adding a new payment method should not require modifying the payment processor — define a `PaymentMethod` interface and add new implementations.
3. **Liskov Substitution (LSP)** — Subtypes must be substitutable for their base types without breaking behavior. If a function accepts a `Shape`, any subclass of `Shape` must work without surprises.
4. **Interface Segregation (ISP)** — Many specific interfaces beat one general-purpose interface. Never force classes to implement methods they do not use. A `Robot` class should not be forced to implement `eat()` and `sleep()` just because it shares a `Worker` interface with `Human`.
5. **Dependency Inversion (DIP)** — Depend on abstractions, not concrete implementations. Use dependency injection. Pass a `database` parameter to a service constructor instead of hard-coding `new MySQLDatabase()` inside it.

Application order: start with SRP and DIP (foundational). Add OCP where change is frequent. Apply LSP when using inheritance. Use ISP when interfaces grow large.

Common mistakes: applying all principles everywhere regardless of need, creating interfaces before understanding the domain, spending too much time on design instead of building.

See [references/SOLID.md](./references/SOLID.md) for detailed examples and application guidance.

### KISS — Keep It Simple, Stupid

Favor simplicity over cleverness. Simple code is easier to understand, maintain, test, and debug. Complexity should be justified by real, measured need — not hypothetical future requirements.

Core rules:
- **Choose readable over compact.** Use descriptive names, not abbreviations. `adultNames` is better than `r`.
- **Choose standard over custom.** Use built-in features and libraries. `arr.sort()` is better than a custom quicksort.
- **Choose direct over abstract.** Avoid abstraction layers that add no value. A direct `database.query()` call is better than a `DataAccessLayerFactory` chain.
- **Choose specific over generic.** Solve the actual problem, not a theoretical one. Two specific functions are better than one over-parameterized generic function.

Red flags: more than 3 levels of indentation, functions longer than 30 lines, configuration for settings that never change, generic solutions for one-off problems, multiple abstraction layers for simple operations.

Simplification strategies: extract complex conditions into named functions, remove unnecessary configuration options, replace custom implementations with standard library methods, split large functions into smaller focused ones.

See [references/KISS.md](./references/KISS.md) for examples of over-engineering and simplification strategies.

### YAGNI — You Aren't Gonna Need It

Build for today, not for tomorrow. Do not add functionality until it is actually needed — not when it is merely foreseen.

Every line of unneeded code costs: development time, maintenance burden, increased complexity, wrong abstractions, and opportunity cost. Features built on speculation are often based on incorrect assumptions and end up being rewritten or deleted.

Red flag phrases that signal YAGNI violations: "We might need this someday", "Let's future-proof this", "We should support multiple X", "What if we want to Y?"

When to ignore YAGNI:
- Architecture decisions that are expensive to change later (database schema, API contracts, file formats)
- Security and compliance requirements (authentication, encryption, audit logging)
- Known immediate requirements in the current iteration
- Critical non-functional requirements (performance constraints, reliability targets)

See [references/YAGNI.md](./references/YAGNI.md) for decision frameworks and common violations.

## Feature Slicing

Organize code by business features (vertical slices) rather than technical layers (horizontal slices). Each feature contains all its own code — UI, business logic, data access — in one cohesive module.

**Vertical (feature-sliced) vs Horizontal (layered):**

```
# Horizontal (BAD for most projects)    # Vertical (GOOD)
/controllers                             /features
  userController.js                        /user-management
  productController.js                       controller.js
/services                                    service.js
  userService.js                             repository.js
  productService.js                          tests/
/models                                    /product-catalog
  user.js                                    controller.js
  product.js                                 service.js
```

Key rules:
- **Feature first** — Organize by what users see, not by technical layer.
- **Vertical slices** — Each feature is a complete slice through all layers. Implement one complete feature at a time, top to bottom (outside-in: API → business logic → data access).
- **Shared last** — Do not create shared code until the same pattern appears three or more times. Keep utilities within features until extraction is clearly justified.
- **Independence** — Features must not directly depend on each other. Never import directly from another feature's internals. Communicate through defined APIs, dependency injection, or events.
- **Consistent structure** — All features follow the same internal directory convention. Inconsistent layouts confuse developers and slow navigation.
- **Complete features** — Include tests, and everything else needed within the feature directory.

Benefits: high cohesion within features, low coupling between features, easy navigation (all related code in one place), parallel development without merge conflicts, clear ownership, easy to remove or disable a feature.

When NOT to use: very small applications (fewer than 5 features), single-developer projects with simple requirements.

Anti-patterns to avoid: starting with horizontal layers, premature shared abstractions, features depending directly on other features, over-abstracting on first implementation, mixing framework code with business logic, god features that are too large (split them), inconsistent directory structures across features.

See [references/feature-slicing.md](./references/feature-slicing.md) for workflow steps, anti-patterns, and comparison with layered architecture.

## Testing Strategy

### Testing Pyramid

Distribute tests by speed, cost, and confidence:

- **Unit tests (60–70%)** — Fast (<100ms each), isolated, test single functions or methods. Mock external dependencies. Most numerous.
- **Integration tests (20–30%)** — Moderate speed (<1s each), test interactions between components. Use real dependencies where reasonable.
- **E2E tests (5–10%)** — Slow (seconds to minutes), test complete user workflows through the full stack. Reserve for critical paths only.

### Test Structure — AAA Pattern

Arrange (set up data), Act (execute code under test), Assert (verify results). One logical assertion per test. Separate sections with blank lines. Keep the Arrange section focused — extract complex setup to helper functions.

```javascript
test('calculates order total with tax', () => {
  // Arrange
  const items = [{ price: 10, quantity: 2 }];
  const calculator = new OrderCalculator(0.1);

  // Act
  const total = calculator.calculateTotal(items);

  // Assert
  expect(total).toBe(22);
});
```

### FIRST Principles

- **Fast** — Unit tests run in milliseconds, full suite in minutes.
- **Independent** — Each test sets up its own data, runs in any order.
- **Repeatable** — Same results every time. No randomness, no external state.
- **Self-validating** — Clear pass/fail with assertions, never manual verification.
- **Timely** — Write tests alongside production code, not months later.

### Coverage Targets by Code Type

| Code Type | Target |
|---|---|
| Business logic | 80–100% |
| Utilities/helpers | 90–100% |
| Data access layer | 70–90% |
| API controllers | 60–80% |
| UI components | 40–70% |
| Configuration | 20–40% |

Focus on branch coverage over line coverage. Do not chase 100% — diminishing returns above ~85%. Test behavior, not implementation details.

What NOT to test: third-party libraries, framework internals, trivial getters/setters, constants.

### Test Best Practices

- **Test behavior, not implementation.** Assert on output, not on which internal method was called.
- **Test edge cases and errors.** Do not only test the happy path — test null inputs, empty collections, boundary values, error conditions.
- **Use descriptive test names.** `'creates user with valid email'` is better than `'test1'` or `'user test'`.
- **Use test data helpers.** Factory functions like `createTestUser(overrides)` reduce setup boilerplate and keep tests focused.
- **No logic in tests.** Avoid loops, conditionals, and complex calculations inside test bodies.

### Common Test Anti-Patterns

- **Fragile tests** — Tests that break when refactoring working code (usually testing implementation details)
- **Flaky tests** — Random failures that erode trust in the suite
- **Slow tests** — Long-running tests reduce feedback value
- **Test interdependence** — Tests relying on execution order or shared mutable state

See [references/testing-standards.md](./references/testing-standards.md) for the full testing pyramid, test structure patterns, and coverage analysis guidance.

## Code Quality

### Comments

Comments explain **why**, not **what**. Good code is self-documenting.

When to comment:
- Complex business logic and its rationale
- Workarounds with context on when to remove them
- Non-obvious algorithm choices and trade-offs
- Important caveats or side effects
- External dependencies and constraints

When NOT to comment:
- Obvious code that restates itself
- Bad code that should be refactored instead
- What the code does (the code already says this)

Rules:
- Never leave commented-out code. Trust version control.
- Never leave TODO comments. Create issues instead.
- Update comments when code changes. Delete obsolete comments immediately.

### Self-Documenting Code

Prefer code clarity over comments:
- Use descriptive variable and function names
- Extract complex conditions into named functions
- Use constants for magic numbers
- Keep functions focused and small

See [references/code-comments.md](./references/code-comments.md) for detailed comment style guidelines.
See [references/code-quality.md](./references/code-quality.md) for documentation standards, quality checklists, and anti-patterns.

## Balancing Principles

These principles sometimes create tension. Apply judgment:

- **DRY vs YAGNI** — Do not create abstractions until duplication is clear and appears three or more times. Wait for the pattern to emerge.
- **KISS vs SOLID** — Do not add complexity for theoretical extensibility. Apply SOLID where change is expected, KISS where stability is expected.
- **DRY vs KISS** — Extraction can add abstraction complexity. Keep it only if the abstraction makes the code clearer.
- **All principles vs pragmatism** — Follow principles but deliver working software. The goal is better software, not perfect adherence to rules.

## Reference Files

| File | Description |
|---|---|
| [references/DRY.md](./references/DRY.md) | Detection methods, prevention strategies, Rule of Three, when NOT to DRY |
| [references/SOLID.md](./references/SOLID.md) | Each SOLID principle with examples, application order, common violations |
| [references/KISS.md](./references/KISS.md) | Simplicity guidelines, over-engineering examples, simplification strategies |
| [references/YAGNI.md](./references/YAGNI.md) | Cost of premature features, decision framework, when NOT to apply |
| [references/feature-slicing.md](./references/feature-slicing.md) | Vertical vs horizontal, workflow, anti-patterns, trade-offs |
| [references/testing-standards.md](./references/testing-standards.md) | Testing pyramid, AAA pattern, coverage targets, FIRST principles |
| [references/code-comments.md](./references/code-comments.md) | When to comment, comment styles, self-documenting code techniques |
| [references/code-quality.md](./references/code-quality.md) | Documentation standards, quality checklists, code review criteria |
