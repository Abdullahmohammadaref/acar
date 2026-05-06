# Deep Research Document Template

For `/m:research` deep research output. Extends the Learning Guide template with tech stack context, library comparisons, tiered sources, and knowledge gaps.

## Structure

```markdown
---
date: YYYY-MM-DD
query: <original research input>
stack: <detected tech stack>
---

# {Topic Title}

**{One sentence: what this document covers}**

_{2-3 sentence summary: what this is, why it matters, what you'll know by the end}_

---

**What you'll learn:**
- {Concept 1 -- the basics}
- {Concept 2 -- how it works}
- {Concept 3 -- the options}
- {Concept 4 -- how to implement it}

---

## Part 1: Understanding the Basics

### 1.1 {Core concept in plain language}
{Explain as if the reader has never heard of this. Use an everyday analogy.}

#### Key Terms
{Table: Term | What it means -- plain language, 1-2 sentences each}

### 1.2 {Why this matters / the problem it solves}
{Motivation, context, what was life like before}

## Part 2: How It Works

### 2.1 {The mechanism / architecture}
{Mermaid diagram showing the flow/architecture}

### 2.2 {Component by component}
{Break down each piece with bold names and clear explanations}

## Part 3: Options and Approaches

### Tech Stack Context
{DETECTED_STACK and how it affects the recommendations}

### {Option A}
{What, when to use, pros/cons}

### {Option B}
{Same structure}

### Comparison
{Table comparing all options side by side}

### Library / Tool Comparison
{Table from Agent 3: name | what it does | popularity | license | when to use}

## Part 4: How To Do It

### Step 1: {Action}
{Clear instruction with code in the detected language}

### Step 2: {Next action}
{Continue step by step, combining Agent 1 docs + Agent 4 local patterns}

## Part 5: Scenarios and Edge Cases
{Table or subsections: basic case, edge cases, production considerations}

## Part 6: Things to Watch Out For
{Gotchas, pitfalls, common mistakes -- be honest}

## Part 7: Key Takeaways
{Numbered list of the most important points}

## Knowledge Gaps
{What this research didn't cover, where to look next}

## Sources

### Tier 1 -- Official Documentation
- {URL} -- {What info came from here}

### Tier 2 -- Authoritative Secondary
- {URL} -- {Description}

### Tier 3 -- Community
- {URL} -- {Description}

### Tier 4 -- Unverified
- {URL} -- {Description and why included}
```

## Rules

All Learning Guide rules apply, plus:

- Include YAML frontmatter with date, query, and stack
- Add a **Tech Stack Context** section explaining how the detected stack affects recommendations
- Add a **Library / Tool Comparison** table from the library discovery agent
- Add a **Scenarios and Edge Cases** section covering basic, edge, and production cases
- Always include a **Knowledge Gaps** section -- be honest about what wasn't covered
- Organize **Sources** by tier (Tier 1 through Tier 4)
- Include code examples in the detected language -- never use a different language unless the query is about a different language
