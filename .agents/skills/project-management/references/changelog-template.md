# {Product Name} Changelog

Chronological record of implemented changes. Each entry links to its plan file and per-task changelog file for detailed context.

## How to Use This Document

- **Organized chronologically** — newest entries first within each date group.
- **Entries link to detail files**: plan files describe what was planned, per-task changelog files describe what was implemented.
- **Update after each task**: add a dated entry when a task or fix is completed.
- Per-task changelog files live in `prd/specs/{feature}/plans/changelog-*.md`.

---

## {YYYY-MM-DD}

- [{HH:MM}] {Change title}
  {1-2 sentence description of what was delivered, mapped to requirement IDs.}
  - Plan: [{plan-filename}](specs/{feature}/plans/{plan-filename})
  - Changelog: [{changelog-filename}](specs/{feature}/plans/{changelog-filename})

- [{HH:MM}] {Another change title}
  {Description.}
  - Plan: [{plan-filename}](specs/{feature}/plans/{plan-filename})
  - Changelog files:
    - [{changelog-1}](specs/{feature}/plans/{changelog-1})
    - [{changelog-2}](specs/{feature}/plans/{changelog-2})

## {Earlier YYYY-MM-DD}

- [{HH:MM}] {Change title}
  {Description.}
  - Plan: [{plan-filename}](specs/{feature}/plans/{plan-filename})
  - Changelog: [{changelog-filename}](specs/{feature}/plans/{changelog-filename})
