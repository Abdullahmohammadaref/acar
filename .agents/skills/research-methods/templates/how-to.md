# How-To Template

Practical, step-by-step guide for accomplishing a specific task.

## Structure

```markdown
# How To: [Task]

**[What you'll accomplish by the end of this guide]**

## Prerequisites

- [What you need before starting]
- [Required tools/knowledge]

## Key Terms

| Term | What it means |
|------|--------------|
| **[Term]** | [Definition] |

## Steps

### Step 1: [Action]

[Why this step matters]

```[language]
// what to do
```

[What to expect after this step]

### Step 2: [Action]

[Continue...]

## Verify It Works

[How to confirm everything is set up correctly]

```[language]
// verification command or test
```

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| [Error/symptom] | [Why it happens] | [What to do] |

## Sources

- [URL] -- [Description]
```

## Rules

- Lead with what the reader will accomplish
- List prerequisites upfront -- don't let them get stuck mid-guide
- One action per step
- Show expected output after each step when possible
- Include a "Verify It Works" section
- Add a troubleshooting table for common issues

## Example: Redis Caching

```markdown
# How To: Add Redis Caching to a Node.js API

**By the end of this guide, your API will cache database queries in Redis, reducing response times from ~200ms to ~5ms for repeated requests.**

## Prerequisites

- Node.js 18+ installed
- A running PostgreSQL database with data to cache
- Docker installed (for running Redis locally)

## Key Terms

| Term | What it means |
|------|--------------|
| **Cache** | A fast temporary store. Instead of querying the database every time, you check the cache first. |
| **TTL** | Time To Live -- how long a cached value stays valid before it expires and gets refreshed from the database. |
| **Cache invalidation** | Removing or updating cached data when the source data changes. The hardest part of caching. |

## Steps

### Step 1: Start Redis

Run Redis locally with Docker:

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Expected result:** A Redis container running on port 6379. Verify with `docker ps`.

### Step 2: Install the Redis client

```bash
npm install ioredis
```

### Step 3: Create a cache utility

```typescript
// src/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check cache first
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  // Cache miss -- fetch from source
  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  return data;
}
```

### Step 4: Use it in your route

```typescript
// Before (hits DB every time)
app.get('/users/:id', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(user);
});

// After (checks cache first, DB only on miss)
app.get('/users/:id', async (req, res) => {
  const user = await cached(
    `user:${req.params.id}`,  // cache key
    300,                       // 5 minutes TTL
    () => db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
  );
  res.json(user);
});
```

## Verify It Works

```bash
# First request -- cache miss, hits DB (~200ms)
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/users/1

# Second request -- cache hit (~5ms)
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/users/1
```

You should see a significant time drop on the second request.

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `ECONNREFUSED` on port 6379 | Redis isn't running | Run `docker start redis` |
| Stale data after update | Cache not invalidated | Delete the key after writes: `redis.del('user:42')` |
| Memory growing unbounded | No TTL or too long | Always set a TTL. Start with 5 minutes, adjust based on data freshness needs. |

## Sources

- https://redis.io/docs/getting-started/ -- Redis quickstart guide
- https://github.com/redis/ioredis -- ioredis client documentation
```
