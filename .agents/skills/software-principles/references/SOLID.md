# SOLID — Object-Oriented Design Principles

Five principles by Robert C. Martin for more understandable, flexible, and maintainable designs.

---

## S — Single Responsibility Principle (SRP)

**A class has only one reason to change.**

Each class handles one job. If a class has multiple responsibilities, those responsibilities become coupled.

```javascript
// BAD: Multiple responsibilities
class User {
  getName() { return this.name; }
  save() { database.save('users', this); }          // Database operations
  sendEmail(msg) { emailService.send(this.email, msg); } // Email operations
  validate() { /* ... */ }                               // Validation
}

// GOOD: Separated responsibilities
class User {
  constructor(name, email) { this.name = name; this.email = email; }
}

class UserRepository {
  save(user) { database.save('users', user); }
}

class UserNotifier {
  sendEmail(user, message) { emailService.send(user.email, message); }
}

class UserValidator {
  validate(user) { /* ... */ }
}
```

Common violations: god classes, mixing business logic with infrastructure, combining presentation with domain logic.

---

## O — Open/Closed Principle (OCP)

**Open for extension, closed for modification.**

Add new functionality without changing existing code. Use abstraction and polymorphism.

```javascript
// BAD: Modification required for each new type
class PaymentProcessor {
  processPayment(payment) {
    if (payment.type === 'credit_card') { /* ... */ }
    else if (payment.type === 'paypal') { /* ... */ }
    // Adding new payment type requires modifying this class
  }
}

// GOOD: Extension without modification
class CreditCardPayment {
  process(amount) { /* credit card logic */ }
}

class PayPalPayment {
  process(amount) { /* PayPal logic */ }
}

class PaymentProcessor {
  processPayment(paymentMethod, amount) {
    paymentMethod.process(amount); // Works with any payment method
  }
}
```

Common violations: switch/case statements that grow with features, if/else chains checking object types.

---

## L — Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types without breaking the application.**

```javascript
// BAD: Square violates Rectangle expectations
class Square extends Rectangle {
  setWidth(w) { this.width = w; this.height = w; } // Unexpected side effect
}

// GOOD: Separate hierarchy
class Shape { getArea() { throw new Error('Must implement'); } }
class Rectangle extends Shape {
  constructor(w, h) { super(); this.width = w; this.height = h; }
  getArea() { return this.width * this.height; }
}
class Square extends Shape {
  constructor(size) { super(); this.size = size; }
  getArea() { return this.size * this.size; }
}
```

Common violations: subclasses throwing exceptions for base class methods, returning different types, adding preconditions.

---

## I — Interface Segregation Principle (ISP)

**Never force a class to depend on methods it does not use.**

Many specific interfaces beat one general-purpose interface.

```javascript
// BAD: Robot forced to implement eat() and sleep()
class Worker {
  work() { throw new Error('Must implement'); }
  eat() { throw new Error('Must implement'); }
  sleep() { throw new Error('Must implement'); }
}

class Robot extends Worker {
  work() { /* works */ }
  eat() { throw new Error("Robots don't eat"); }  // Forced to implement
  sleep() { throw new Error("Robots don't sleep"); }
}

// GOOD: Segregated capabilities
class Workable { work() { throw new Error('Must implement'); } }

class Human extends Workable {
  work() { /* works */ }
  // Also implements eating and sleeping via composition
}

class Robot extends Workable {
  work() { /* works */ }
  // No need for eat() or sleep()
}
```

---

## D — Dependency Inversion Principle (DIP)

**High-level modules depend on abstractions, not low-level modules.**

```javascript
// BAD: Direct dependency on concrete class
class UserService {
  constructor() {
    this.database = new MySQLDatabase(); // Hard-coded
  }
}

// GOOD: Dependency injection with abstraction
class UserService {
  constructor(database) {
    this.database = database; // Injected — easy to swap or test
  }
}

const service = new UserService(new MySQLDatabase());
const testService = new UserService(new MockDatabase());
```

---

## Application Order

1. **Start with SRP** — Identify and separate responsibilities
2. **Add DIP** — Inject dependencies, depend on abstractions
3. **Add OCP** — Create extension points where change is frequent
4. **Ensure LSP** — Verify subclass substitutability
5. **Apply ISP** — Split large interfaces as they grow

## When to Apply

- **Always**: SRP and DIP — foundational for maintainable code
- **Often**: OCP — in areas that change frequently
- **When needed**: LSP — when using inheritance
- **Judiciously**: ISP — when interfaces grow large

## Common Mistakes

1. **Over-engineering** — Applying all principles everywhere regardless of need
2. **Premature abstraction** — Creating interfaces before understanding the domain
3. **Analysis paralysis** — Spending too much time on design instead of building
4. **Ignoring pragmatism** — Following principles over shipping working software
