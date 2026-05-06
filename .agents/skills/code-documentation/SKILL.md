---
name: code-documentation
description: >-
  This skill should be used when creating or updating README.md files for
  codebase directories. It covers LLM-optimized documentation conventions,
  YAML frontmatter, file listings, Mermaid diagrams, and rules for keeping
  READMEs current as the codebase evolves.
user-invocable: false
---

# Code Documentation

Conventions and templates for README.md files that serve as LLM-optimized navigation documents for codebase directories.

## When to Use

- After implementing code that creates or deletes files in a directory
- When a new directory is created that contains code or configuration
- When reviewing documentation freshness during development
- When `/m:dev` Step 8 triggers documentation updates

## Purpose

README.md files are **LLM-optimized navigation documents**. They allow an agent to:

1. **Scan frontmatter** across many directories to decide which are relevant (fast)
2. **Read full content** of relevant READMEs to understand module structure (deep)
3. **Navigate diagrams** to understand relationships, data flow, and state machines

They are NOT traditional human-only documentation. They prioritize structured, scannable content over prose.

## Conventions

### YAML Frontmatter

Every README.md starts with YAML frontmatter containing exactly three fields:

```yaml
---
module: kebab-case-module-name
purpose: One-sentence description of what this directory contains and why it exists
last-updated: YYYY-MM-DD
---
```

- `module`: The directory name in kebab-case. Must match the directory it lives in.
- `purpose`: A single sentence an LLM can use to decide relevance. Be specific — "GraphQL resolvers and helpers for the patient-facing API" not "patient stuff."
- `last-updated`: The date the README was last modified. Update this whenever the README content changes.

### File Listing

Include a table listing every file in the directory (excluding the README.md itself, test directories, and generated files):

```markdown
## Files

| File | Description |
|------|-------------|
| service.go | Core booking service with create, cancel, and reschedule operations |
| repository.go | Database queries for the bookings table |
| model.go | Booking domain types and validation |
```

- One row per file
- Description should be a single sentence explaining what the file does
- Sort files by logical grouping (entry points first, then core logic, then utilities)

### Mermaid Diagrams

Include as many Mermaid diagrams as needed to explain the module. Common types:

- **Flowchart** — how this module relates to other modules, dependency flow
- **Class diagram** — data structures, interfaces, types defined here
- **Sequence diagram** — request/response flows, lifecycle events, business processes
- **State diagram** — state machines, status transitions
- **ER diagram** — database relationships when the module owns tables

Small utility directories might only need the file listing. Complex modules might need 5+ diagrams. Use your judgment — include every diagram that helps understand the module.

### Overview Paragraph

Between frontmatter and the file listing, include a 2-4 sentence overview paragraph explaining:
- What this module does
- How it fits into the broader system
- Key design decisions or patterns used

### Notes Section (Optional)

If the module has important conventions, gotchas, or patterns that aren't obvious from the code, add a `## Notes` section at the bottom.

## Which Directories to Document

**Document** directories containing:
- Source code (Go, TypeScript, React components)
- Configuration files (Docker, nginx, CI/CD)
- Database migrations
- GraphQL schemas
- Shared libraries and utilities

**Skip** directories that are:
- Generated (`node_modules/`, `dist/`, `build/`, `coverage/`, `vendor/`, `.next/`)
- Version control (`.git/`)
- Asset-only (images, fonts, icons with no code)
- Test directories (`__tests__/`) — the parent README covers what's tested
- PRD/docs (`prd/`) — these have their own document structure

## When to Update

Update a directory's README.md when:
- A file is **created** in the directory (add to file listing)
- A file is **deleted** from the directory (remove from file listing)
- A file is **renamed** in the directory (update the listing)
- The module's **public interface changes** significantly (update diagrams)

Do NOT update the README on every code edit. Only structural changes (files added/removed/renamed) or significant interface changes warrant an update.

## References

- [README Template](references/readme-template.md) — blank template to copy
- [README Example](references/readme-example.md) — realistic filled-in example
