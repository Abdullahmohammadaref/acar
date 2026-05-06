---
name: project-management
description: >-
  This skill should be used when planning products, defining features, writing
  requirements, creating specifications, breaking work into tasks, or managing
  product development workflows. It covers document standards, ID schemes,
  formatting rules, estimation with story points, and vertical feature slicing.
user-invocable: false
---

# Project Management

Standards, templates, and conventions for product planning and feature development documents.

## When to Use

- Establishing product vision, mission, and roadmap
- Defining feature requirements (use cases, user stories, functional/non-functional requirements)
- Writing technical specifications with data models and API contracts
- Breaking specifications into implementation tasks
- Tracking implementation progress via changelog
- Creating or updating any document in the `prd/` directory

## Document Hierarchy

Product documents follow a progressive disclosure model. Each level adds detail:

```
prd/
├── README.md           # Master index linking all documents
├── mission.md          # Vision, users, differentiators, metrics
├── tech-stack.md       # Architecture, technology choices
├── roadmap.md          # Now/Next/Later feature priorities
├── changelog.md        # LLM memory: what's been built, mapped to requirements
└── specs/
    └── YYYYMMDD-HHmm-{slug}/
        ├── requirements.md   # UC/US/FR/NFR definitions
        ├── spec.md           # Data models, API contracts, diagrams
        └── tasks.md          # Vertical slices with story points
```

## ID Scheme

Every ID includes a 4-character **feature tag** derived from the feature folder's creation timestamp. This prevents collisions across parallel branches.

| Prefix | Meaning | Format | Example |
|--------|---------|--------|---------|
| UC | Use Case | UC-{tag}-NNN | UC-0Fy0-001 |
| US | User Story | US-{tag}-NNN | US-0Fy0-001 |
| FR | Functional Requirement | FR-{tag}-NNN | FR-0Fy0-001 |
| NFR | Non-Functional Requirement | NFR-{tag}-NNN | NFR-0Fy0-001 |

### Base-62 Tag Algorithm

Compute the tag from the feature folder's `YYYYMMDD-HHmm` timestamp (always UTC):

1. Parse the timestamp as a UTC datetime
2. Compute total minutes since epoch **2026-01-01 00:00 UTC**
3. Repeatedly divide by 62, collecting remainders
4. Map remainders: `0-9` → `'0'-'9'`, `10-35` → `'A'-'Z'`, `36-61` → `'a'-'z'`
5. Read characters MSB-first (last quotient to first remainder)
6. Left-pad to 4 characters with `'0'`

**Worked example:** `20260212-1500` → 42 days × 1440 + 15 × 60 + 0 = 61,380 min → 61380 ÷ 62 = 990 r 0, 990 ÷ 62 = 15 r 60, 15 ÷ 62 = 0 r 15 → digits `[F, y, 0]` → pad to `0Fy0` → `UC-0Fy0-001`

Tasks use dot notation within their feature: `N.M` (e.g., `1.1`, `3.7`). Task references include the full UC ID: `UC-{tag}-NNN/N.M`.

## Formatting Rules

### Text checkboxes only

Use `- [ ]` and `- [x]` for all checklists. Never use HTML checkboxes, Unicode symbols, or custom markers.

### No emojis

Never use emojis in any product document. Use text labels and markdown formatting instead.

### Mermaid-only diagrams

All diagrams in spec.md must use Mermaid syntax. No ASCII art, no embedded images. Acceptable diagram types: sequence, class, flowchart, state, ER.

### Single-checklist rule

Each document has exactly ONE canonical checklist for tracking progress. Never duplicate tracking sections. In tasks.md, the feature-level checkboxes (`## N. [x] Feature title`) and task-level checkboxes (`- N.M [x] Task title`) are the single source of truth. Do not add separate "Progress Tracking" or "Status" tables.

### Tables for structured data

Use markdown tables for requirements, metrics, risks, and any data with consistent columns. Use bullet lists only for narrative content.

## Feature Folder Naming

Feature specification folders use the format: `YYYYMMDD-HHmm-{slug}/`

- Timestamp is when the feature was first scoped, **always in UTC**
- Slug uses underscores, lowercase, derived from the feature name
- Example: `20260131-1430-patient_onboarding/`

## Estimation

Use story points on a Fibonacci-like scale. Never use time estimates (hours, days, sprints).

| Points | Meaning |
|--------|---------|
| 1 | Trivial — config change, rename, copy-paste with minor edits |
| 2 | Small — single-file change with clear approach |
| 3 | Medium — multi-file change, some decisions required |
| 5 | Large — cross-layer feature slice, multiple decisions |
| 8 | Very large — significant complexity, unknowns, or integration work |

If a task exceeds 8 points, split it into smaller tasks.

## Vertical Feature Slicing

Tasks must be organized as vertical slices through all layers, not horizontal layers. Each task delivers a complete, testable piece of functionality from database to UI.

**Correct (vertical):** "Create patient generals form with GraphQL mutation and database migration"
**Wrong (horizontal):** "Create all database migrations", "Create all GraphQL schemas", "Create all forms"

Organize tasks by use case (UC-{tag}-NNN). Within each use case, order tasks by dependency — earlier tasks unblock later ones.

## Changelog as LLM Memory

The changelog (`prd/changelog.md`) is designed as an LLM memory document — organized by domain area rather than chronologically. It describes what exists in the codebase, mapped back to requirement IDs. This allows any agent to quickly understand what has been built without reading every file.

## Reference Templates

| Template | Purpose |
|----------|---------|
| [references/readme-template.md](./references/readme-template.md) | Master index linking all product context |
| [references/mission-template.md](./references/mission-template.md) | Vision, target users, differentiators, metrics |
| [references/tech-stack-template.md](./references/tech-stack-template.md) | Architecture, technology choices, integrations |
| [references/roadmap-template.md](./references/roadmap-template.md) | Now/Next/Later feature prioritization |
| [references/changelog-template.md](./references/changelog-template.md) | LLM memory: what's built, mapped to requirements |
| [references/requirements-template.md](./references/requirements-template.md) | UC/US/FR/NFR with consistent IDs |
| [references/spec-template.md](./references/spec-template.md) | Data models, API contracts, Mermaid diagrams |
| [references/tasks-template.md](./references/tasks-template.md) | Vertical slices organized by UC, with story points |
