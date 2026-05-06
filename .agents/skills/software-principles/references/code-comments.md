# Code Comments

Good code is self-documenting. Comments explain **why**, not **what**.

Comments add value that the code itself cannot provide. The best comment is no comment — achieved through clear, expressive code.

## When to Comment

### Complex Business Logic

Explain the reasoning behind non-obvious decisions.

```javascript
// Apply progressive discount: 10% for first $100, 15% for next $200, 20% after that
// Business rule from Q3 2024 pricing strategy
function calculateDiscount(total) {
  if (total <= 100) return total * 0.10;
  if (total <= 300) return 10 + ((total - 100) * 0.15);
  return 10 + 30 + ((total - 300) * 0.20);
}
```

### Workarounds and Hacks

Document why the workaround exists and when it can be removed.

```javascript
// WORKAROUND: Safari doesn't support lookbehind regex
// Remove when Safari 16.4 becomes minimum supported version
// Issue: #1234
const regex = /(?<!\\)"/g;
```

### Non-Obvious Algorithms

Explain the algorithm choice and its trade-offs.

```javascript
// Using quickselect (O(n) average) instead of full sort (O(n log n))
// for finding median. Benchmarks show 3x speed improvement for large datasets.
function findMedian(array) {
  return quickselect(array, Math.floor(array.length / 2));
}
```

### Important Caveats or Side Effects

```javascript
// IMPORTANT: This method modifies the array in place.
// Call with a copy to preserve the original.
function sortInPlace(array) { /* ... */ }
```

### External Dependencies or Requirements

```javascript
// Requires API key from config.STRIPE_KEY
// Rate limited to 100 requests/second per Stripe's docs
async function processPayment(amount) { /* ... */ }
```

## When NOT to Comment

### Obvious Code

```javascript
// BAD — restating the code
counter++; // Increment counter
name = 'John'; // Set name to John
```

### Bad Code That Should Be Refactored

```javascript
// BAD — explaining bad code instead of fixing it
// Loop through users and check if email matches
for (let i = 0; i < users.length; i++) {
  if (users[i].email === email) return users[i];
}

// GOOD — clear code needs no comment
return users.find(user => user.email === email);
```

### What the Code Does

```javascript
// BAD — the code already says this
cart.addItem(item); // Add item to cart
const user = await getUserById(id); // Get user by ID
```

## Self-Documenting Code Techniques

### Use Descriptive Names

```javascript
// BAD
const d = u.orders[0].date;

// GOOD
const firstPurchaseDate = user.orders[0].date;
```

### Extract to Named Functions

```javascript
// BAD — complex inline condition
if (user.accountAge > 30 && user.totalSpent > 1000 && user.verified) {
  enablePremiumFeatures();
}

// GOOD — named function makes intent clear
function isEligibleForPremium(user) {
  return user.accountAge > 30 && user.totalSpent > 1000 && user.verified;
}

if (isEligibleForPremium(user)) {
  enablePremiumFeatures();
}
```

### Use Constants for Magic Numbers

```javascript
// BAD
if (Date.now() - session.created > 1800000) { expireSession(); }

// GOOD
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
if (Date.now() - session.created > THIRTY_MINUTES_MS) { expireSession(); }
```

## Comment Rules

- **Never leave commented-out code.** Trust version control. Delete it.
- **Never leave TODO comments.** Create issues in the tracker instead.
- **Update comments when code changes.** Delete obsolete comments immediately.
- **Keep comments accurate.** A wrong comment is worse than no comment.

## Comment Styles

### Single-Line

For brief explanations:
```javascript
// Rate limit: 100 requests per minute
const RATE_LIMIT = 100;
```

### Multi-Line

For longer explanations:
```javascript
/**
 * Calculate compound interest using: A = P(1 + r/n)^(nt)
 * P = principal, r = annual rate (decimal), n = compounds per year, t = years
 */
function calculateCompoundInterest(principal, rate, years, compoundsPerYear) {
  return principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * years);
}
```

### Documentation Comments (JSDoc, docstrings)

For public APIs:
```javascript
/**
 * Fetches user data from the database.
 *
 * @param {string} userId - Unique identifier for the user
 * @param {Object} options - Optional parameters
 * @param {boolean} options.includeOrders - Include order history
 * @returns {Promise<User>} The user object
 * @throws {NotFoundError} If user does not exist
 */
async function fetchUser(userId, options = {}) { /* ... */ }
```
