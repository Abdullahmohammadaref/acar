---
name: working-framework
description: This is the Navigravity project working framework. Use this skill IMMEDIATELY and WITHOUT EXCEPTION whenever the user drops this file into the chat and describes features they want to add. This skill defines the exact sequence of steps Claude/Gemini must follow — reading project docs, understanding the design system, coding the feature, documenting it, and updating the project map. Never skip a step. Never start coding before reading all required files.
---

# Navigravity Working Framework

This file is your complete instruction set for implementing features in the anigravity project. Follow every step in order. Do not start coding until all reading steps are done.

---

## STEP 1 — Read Core Project Files (in this exact order)

Before writing a single line of code, read all of the following files. They are attached to the chat as uploads or already on disk. Use the `view` tool to read each one.

1. **`idea.md`** — Understand the overall product vision and purpose
2. **`developer_guide.md`** — Understand the technical architecture, stack, conventions, and patterns used
3. **`PROJECT_MAP.md`** — Understand what has already been built so you don't duplicate or conflict with existing work
4. **`design-system`** (folder or file) — Understand the design language: colors, spacing, components, typography, naming conventions. This is LAW — do not deviate from it

After reading these four, you should have a complete mental model of the project. If anything seems contradictory or unclear, flag it briefly before proceeding.

---

## STEP 2 — Read the Feature Plan

Read the feature plan file the user has provided. It will typically be named something like:

- `plan-ui-changes-2.md`
- `plan-ui-changes-3.md`
- `plan-backend-X.md`
- or whatever the user names it

This file contains:
- Exact features to implement
- Things the user explicitly does NOT like and wants changed
- Design decisions and interaction expectations
- Any constraints or edge cases the user cares about

Read it thoroughly. Extract a mental checklist of every discrete task.

---

## STEP 3 — Read the Error Handling Skill

Before coding, read the skill file:

- **`.agents\skills\skill-unexpected-error`** (or whatever path it's at on disk)

Apply its patterns throughout your implementation. Every feature must handle errors gracefully using the conventions defined there.

---

## STEP 4 — Use MCP Tools to Your Advantage

You have access to **Context7** and **Tavily** MCP servers. Use them proactively:

- **Context7** → look up library docs, component APIs, framework patterns you're unsure about
- **Tavily** → search for best practices, edge cases, or implementation patterns when needed

Do not skip this — using these tools prevents mistakes and improves code quality.

---

## STEP 5 — Implement the Features

Now implement everything described in the feature plan. Rules:

- Follow the design system exactly — spacing, colors, component patterns, naming
- Follow the developer guide conventions — file structure, imports, state management patterns, etc.
- Handle all error states using the error skill patterns
- Do NOT stop in the middle and ask for confirmation — complete the full implementation
- If a feature was already partially implemented but the user says they don't like something about it, change it. "Already implemented" is not a reason to skip it
- Work feature by feature, not file by file — complete each feature end-to-end before moving to the next
- If something in the plan is ambiguous, make the most reasonable decision, note it briefly, and keep moving

---

## STEP 6 — Create the Documentation File

When all features are implemented, create a file called:

```
docs-ui-changes.md
```

(or `docs-backend-changes.md` etc. depending on the type of work — follow whatever naming pattern the user has established when naming the feature plan files but just swaping the plan word with docs in the file name)

This file must include:

- A summary of every feature added or changed
- What files were modified and why
- Any design decisions made that weren't explicitly specified
- Any known limitations or things to watch out for
- Any deviations from the plan and the reason why

---

## STEP 7 — Update PROJECT_MAP.md

Open `PROJECT_MAP.md` and add entries for everything that was built or changed. Follow the exact format and structure already used in that file. Do not rewrite sections that weren't touched — only add/update what changed.

---

## STEP 8 — Update the Design System (if needed)

If any of your implementation introduced new patterns, components, colors, spacing conventions, or interaction behaviors that aren't already documented in the design system, update the design system file/folder accordingly.

Only update what actually changed or was added. Do not rewrite the whole thing.

---

## STEP 9 — Final Check

Before wrapping up, run through this checklist mentally:

- [ ] All features from the plan are implemented
- [ ] Design system was followed throughout
- [ ] Error handling skill patterns were applied
- [ ] `docs-ui-changes.md` (or equivalent) was created
- [ ] `PROJECT_MAP.md` was updated
- [ ] Design system was updated if new patterns were introduced
- [ ] No half-finished features left open

Only stop when all boxes are checked.

---

## How the User Will Use This File

The user will:
1. Drag this file into a new chat
2. Write their feature request in plain language below it (or in the same message)
3. Also drag in any new plan file (e.g. `plan-ui-changes-3.md`) and any other files that changed since last session

You should start immediately from Step 1 without asking for clarification about the process — the process is defined here.

---

## Notes for Future Modifications

The user may update this file over time to:
- Change the reading order
- Add new required files
- Add new MCP servers
- Change documentation naming conventions
- Add new post-implementation steps

Always read this file fresh at the start of each session — do not rely on memory of previous versions.
