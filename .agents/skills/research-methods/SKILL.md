---
name: research-methods
description: >
  Research, learn, and explain topics with clear, beginner-friendly output.
  Use when the user asks to research, learn about, explain, or understand a topic.
  Triggers on phrases like "research X", "how does X work", "explain X to me",
  "I want to learn about X", "what is X and how do I use it", "deep dive into X",
  or any request to investigate, explore, or study a technical or non-technical subject.
  Also triggers via /m:explain, /m:research, and /m:refactor commands.
---

# Research Methods

Standards for conducting research and presenting findings in clear, friendly, easy-to-digest documents that take someone from zero knowledge to solid understanding.

## Step 1: Classify the Request

Before doing anything, determine the depth of research needed. This is the router — get this right and everything else follows.

### Quick Question

**Signals:** Single concept, definition, syntax lookup, "what is X", "how do I do Y" (narrow scope)

**Examples:**
- "What is a CLOB?"
- "How do I amend a git commit?"
- "What's the difference between PUT and PATCH?"

**Action:** Answer inline using the appropriate template (How-To or Reference). After choosing the template, read it: `Read: templates/how-to.md` or `Read: templates/reference.md`. Do your own web searches if needed. No agents. No save prompt. Just answer well.

### Explain

**Signals:** Broader topic but focused, "explain X to me", "how does X work", "help me understand X", "give me an intro to X", "I need to get up to speed on X", explicit `/m:explain` command

**Examples:**
- "Explain how OAuth works"
- "How does database indexing work?"
- "Help me understand WebSockets"
- Any `/m:explain` invocation

**Action:** Run the Explain flow (Steps 2e-4e below). Launch 2 parallel agents (web + local), synthesize into a 3-5 minute read using the Introduction template, then offer to save.

### Deep Research

**Signals:** Broad topic, multiple angles, implementation guidance needed, "research X for our project", "deep dive into X", explicit `/m:research` command, or any request that clearly needs thorough investigation across docs, community, libraries, and local codebase.

**Examples:**
- "Research sharding strategies for our Postgres setup"
- "I need to understand on-chain settlement end to end"
- "Deep dive into event sourcing with our stack"
- Any `/m:research` invocation

**Action:** Run the full orchestration flow (Steps 2-6 below). Parallel agents, tech stack detection, synthesis, save prompt.

### Refactor Impact

**Signals:** "what's the impact of changing X", "find everywhere we use Y", "what would it take to change X", explicit `/m:refactor` command

**Examples:**
- "What's the impact of switching from REST to GraphQL?"
- "Find everywhere we use the old auth middleware"
- "What would it take to change our logging library?"
- Any `/m:refactor` invocation

**Action:** Run the Refactor Impact flow (Steps 2r-4r below). Launch 2 agents (web research + codebase scan), synthesize into a Refactor Impact document, then save.

### When in Doubt

If the request is ambiguous, use AskUserQuestion:
- **Question:** "How deep should I go on this?"
- **Header:** "Research Depth"
- **Options:**
  1. "Quick answer — just explain it briefly"
  2. "Explain it — a solid 3-5 minute introduction"
  3. "Deep research — full investigation with multiple sources"
  4. "Refactor impact — find what code changes and where"
- **multiSelect:** false

---

## Core Philosophy

The goal of every research output — regardless of depth — is **learning**. The reader should finish understanding the topic well enough to make decisions, have conversations about it, or start implementing. Write as if explaining to a smart colleague who happens to know nothing about this specific topic.

### Writing Principles

1. **Plain language first** — Use everyday words. When a technical term is unavoidable, define it immediately in simple language.
2. **Build from the ground up** — Start with what the reader already knows. Introduce one concept at a time. Each section should build on the previous one.
3. **Show, don't just tell** — Use examples, analogies, and diagrams. A concrete example is worth a paragraph of abstraction.
4. **Friendly tone** — Write like you're explaining over coffee, not writing a textbook. Be direct but warm.
5. **Scannable structure** — Use headers, bullets, tables, and bold text so readers can jump to what they need.
6. **Mermaid for all diagrams** — Every visual (architecture, flow, sequence, relationships) uses Mermaid syntax.
7. **Always cite sources** — Every claim should be traceable. Sources are not optional.

---

## Templates

Choose the template based on what the user needs:

| Template | When to Use | Read Time | Example Requests |
|----------|------------|-----------|------------------|
| **Introduction** | Get oriented on a topic quickly | 3-5 min | "Explain OAuth", "Help me understand WebSockets" |
| **Learning Guide** | Understand a topic deeply from scratch | 10-20 min | "Research sharding in Postgres", "Deep dive into event sourcing" |
| **How-To** | Practical steps to accomplish something | 5-10 min | "How do I set up Redis caching?", "How to deploy with Docker Compose" |
| **Reference** | Quick lookup, comparison, or cheat sheet | 2-3 min | "Compare ORMs for Node", "What are the options for state management?" |
| **Refactor Impact** | Analyze impact of a change to existing code | varies | "What's the impact of changing X", "Find everywhere we use Y" |

If unclear, default to **Introduction** for explain requests, **Learning Guide** for deep research.

Template files are in `templates/`. Each orchestration step reads only the template it needs.

---

## Explain Orchestration (Steps 2e-4e)

These steps run for **Explain** requests (classified in Step 1) or when invoked via `/m:explain`.

### Step 2e: Parse Input

Analyze the request to classify the input type:

- **URL** — starts with `http://` or `https://` — explain the content at this URL
- **Local path** — starts with `/`, `./`, or matches a file/directory pattern — explain patterns in these files
- **General query** — everything else

If the input is empty or ambiguous, use AskUserQuestion to ask what topic to explain.

### Step 3e: Execute Research

Launch **2 agents in a single message** using the Task tool with `subagent_type: general-purpose`.

#### Agent 1: Web Research Agent

**Prompt template:**
```
Research query: {query}

You are a web research agent. Find the best explanations and official documentation for this topic. Focus on:
- Official docs that explain the concept clearly
- Well-written introductory articles or guides
- Key diagrams or visual explanations

Use WebSearch to discover sources, then WebFetch to read the 2-3 most relevant pages.

Return:
- A clear explanation of what this is and how it works
- Key terminology with plain-language definitions
- The best analogies or examples you found
- 3-5 source URLs ranked by quality (best first)
```

#### Agent 2: Local Context Agent

**Prompt template:**
```
Research query: {query}

You are a local codebase research agent. Search the current project to see if this topic is already in use or relevant. Use Glob, Grep, and Read.

Focus on:
- Is this technology/pattern already used in the project?
- Any existing configuration, dependencies, or code related to this topic
- Project conventions that would affect how this topic applies here

Return:
- Whether and how this topic relates to the current project
- Any relevant files or dependencies found
- Brief context only — keep it short
```

### Step 4e: Synthesize and Save

Read the Introduction template:
```
Read: templates/introduction.md
```

After both agents return, assemble the findings into a document using the **Introduction** template.

- Apply the same Writing Principles (plain language, friendly tone, analogies, Mermaid diagrams)
- If the local agent found relevant project context, weave it in naturally (e.g., "In your project, you're already using X, which relates to this because...")
- Stay within 600-1200 words

After presenting the document, use AskUserQuestion to offer saving:

- **Question:** "Save this as `research/{suggested-slug}.md`?"
- **Header:** "Save"
- **Options:**
  1. "Save to research/{suggested-slug}.md"
  2. "Copy to clipboard"
- **multiSelect:** false

Follow the same save flow as deep research (Step 6).

---

## Refactor Impact Orchestration (Steps 2r-4r)

These steps run for **Refactor Impact** requests (classified in Step 1) or when invoked via `/m:refactor`.

### Step 2r: Parse Input

Analyze the request to understand what change the user wants:

- What is being changed (technology, pattern, architecture, API, etc.)
- What is the desired end state
- Any constraints or preferences mentioned

If the input is empty or ambiguous, use AskUserQuestion to ask what change they want to analyze.

### Step 3r: Execute Research

Launch **2 agents in a single message** using the Task tool.

#### Agent 1: Web Research Agent

**subagent_type:** `general-purpose`

Only runs if the change involves new technology, patterns, or external APIs. Skip if the change is purely internal refactoring.

**Prompt template:**
```
Change description: {description}

You are a web research agent. Based on the change described, search for relevant documentation, patterns, and best practices that inform how this change should be implemented.

This could involve:
- A new technology/library being introduced — research its API surface and integration patterns
- A pattern change — research best practices for the target pattern
- A bug fix or architectural correction — research the correct approach

If the change is purely internal (no new technology or pattern to research), return a brief note saying no external research was needed.

Use WebSearch and WebFetch if external research is relevant. Read the 2-3 most relevant pages.

Return:
- What you found that's relevant to implementing this change
- Any new packages/dependencies needed (with install commands)
- Key patterns or APIs the implementation should use
- 3-5 source URLs if applicable
```

#### Agent 2: Deep Codebase Scan

**subagent_type:** `Explore`
**Thoroughness:** "very thorough"

**Prompt template:**
```
Change description: {description}

Find EVERY place in the codebase affected by this change. Be thorough — missing a file means something breaks or stays stale.

Search for:
- Direct references (files that directly use the thing being changed)
- Indirect dependencies (files that depend on files being changed)
- Configuration (env vars, config objects, initialization code)
- Tests (test files that cover affected functionality)
- Documentation (READMEs, comments referencing affected patterns)

For EACH file found, return:
- **File path**
- **What it does** (1 sentence)
- **Why it's affected** (what about this file relates to the change)
- **What needs to change** (specific: what code, what pattern, what behavior)
- **Complexity** (Low / Medium / High)

Also return:
- Total file count
- Files grouped by module/directory
- Any files that are especially complex or risky
```

### Step 4r: Synthesize and Save

Read the Refactor Impact template:
```
Read: templates/refactor-impact.md
```

After both agents return, assemble the findings into a document using the **Refactor Impact** template.

- Apply the Writing Principles (plain language, friendly tone, Mermaid diagrams)
- List every affected file — do not skip files to shorten the document
- Omit template sections that don't apply

**Save behavior:**
- If a save path was provided by the caller (e.g., a command passes a path), use it directly — do not ask the user
- If no save path was provided (natural language trigger), use AskUserQuestion to offer saving:
  - **Question:** "Save this as `research/{suggested-slug}.md`?"
  - **Header:** "Save"
  - **Options:**
    1. "Save to research/{suggested-slug}.md"
    2. "Copy to clipboard"
  - **multiSelect:** false

---

## Deep Research Orchestration (Steps 2-6)

These steps run only for **Deep Research** requests (classified in Step 1) or when invoked via `/m:research`.

### Step 2: Detect Tech Stack

Scan the project root for these files to determine `DETECTED_STACK`. Multiple matches are additive (e.g., `package.json` + `tsconfig.json` + `next.config.js` = "TypeScript + Next.js").

| File | Stack |
|------|-------|
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pyproject.toml` / `setup.py` | Python |
| `package.json` + `tsconfig.json` | TypeScript/Node |
| `package.json` (no tsconfig) | JavaScript/Node |
| `next.config.*` | Next.js (React) |
| `vite.config.*` | Vite (React/Vue/Svelte) |
| `Makefile` only | C/C++ or mixed |
| none found | Language-agnostic |

Also read `README.md` if present for additional project context.

Store the result as `DETECTED_STACK` — pass it to every agent and use it during synthesis.

### Step 3: Parse Input

Analyze the research request to classify the input type:

- **URL** — starts with `http://` or `https://` — research the content at this URL in depth
- **Local path** — starts with `/`, `./`, or matches a file/directory pattern — research patterns in these files
- **General query** — everything else (search terms, questions, topic descriptions)

If the input is empty or ambiguous, use AskUserQuestion to ask:
- What topic or question to research
- Any specific focus areas or constraints

### Step 4: Execute Research

Launch **all 4 agents in a single message** using the Task tool with `subagent_type: general-purpose`. Each agent receives the research query AND `DETECTED_STACK`.

#### Agent 1: Web Docs Agent

**Prompt template:**
```
Research query: {query}
Detected tech stack: {DETECTED_STACK}

You are a documentation researcher. Search for official documentation, API references, and guides related to this query. Focus on:
- Official docs from framework/library creators
- API references and specifications
- Getting started guides and tutorials from official sources
- Version-specific documentation matching the detected stack

Use WebSearch to discover sources, then WebFetch to read the most relevant pages in detail.

Tag each finding with its source tier:
- [Tier 1] Official documentation, specs, official repos
- [Tier 2] Well-known educators, official community resources
- [Tier 3] Stack Overflow, developer blogs, tutorials

Return structured findings with:
- Key facts and concepts discovered
- Code examples found (note the language/framework)
- Source URLs with tier labels
- Any version-specific notes
```

#### Agent 2: Community Agent

**Prompt template:**
```
Research query: {query}
Detected tech stack: {DETECTED_STACK}

You are a community research agent. Search for real-world usage patterns, discussions, and practical experience related to this query. Focus on:
- GitHub issues and discussions about common problems and solutions
- Stack Overflow questions and accepted answers
- Developer blog posts with real-world implementation experience
- Conference talks or published case studies

Use WebSearch to find community sources. Use WebFetch to read the most relevant ones in detail.

Tag each finding with its source tier:
- [Tier 2] Well-known contributors, verified expert blogs
- [Tier 3] Stack Overflow, GitHub issues, developer blogs
- [Tier 4] Unverified tutorials, content farms (note why included)

Return structured findings with:
- Real-world patterns and gotchas discovered
- Common problems and their solutions
- Community consensus on best practices
- Source URLs with tier labels
```

#### Agent 3: Library Discovery Agent

**Prompt template:**
```
Research query: {query}
Detected tech stack: {DETECTED_STACK}

You are a library and tool discovery agent. Search the appropriate package registry based on the detected stack:
- TypeScript/JavaScript/Node/Next.js/Vite -> npm (npmjs.com)
- Go -> pkg.go.dev
- Python -> PyPI (pypi.org)
- Rust -> crates.io

Search for libraries, tools, and packages related to this query. For each relevant library found, return:
- **Name**: Package name
- **Description**: What it does (1-2 sentences)
- **Popularity**: Stars, weekly downloads, or other metrics
- **License**: MIT, Apache-2.0, etc.
- **When to use**: Best use case for this library
- **Maintenance**: Last publish date, active/abandoned

Use WebSearch to discover libraries, then WebFetch their registry pages or GitHub READMEs for details.

Return a structured comparison table and a recommendation for which library best fits the query and detected stack.
```

#### Agent 4: Local Codebase Agent

**Prompt template:**
```
Research query: {query}
Detected tech stack: {DETECTED_STACK}

You are a local codebase research agent. Search the current project to understand existing patterns, dependencies, and conventions related to this query. Use these tools:

1. **Glob** — find files by name pattern (e.g., config files, test files, specific modules)
2. **Grep** — search file contents for relevant patterns, imports, function names
3. **Read** — read specific files to understand implementation details

Focus on:
- Existing dependencies in package.json / go.mod / Cargo.toml / pyproject.toml that relate to the query
- Current implementation patterns for similar functionality
- Project conventions (file structure, naming, error handling patterns)
- Test patterns used in the project
- Configuration and environment setup

Return structured findings with:
- Relevant files and what they contain
- Existing patterns that should be followed
- Dependencies already in use that relate to the query
- Conventions the project follows
```

### Step 5: Synthesize

After all 4 agents return their findings, read the deep research template and assemble a long-form research document:

```
Read: templates/deep-research.md
```

### Step 6: Save

After presenting the research, use AskUserQuestion to ask what to do with the results. Suggest a filename based on the research topic (lowercase, hyphens, `.md` extension).

- **Question:** "Save research as `research/{suggested-slug}.md`?"
- **Header:** "Save"
- **Options:**
  1. "Save to research/{suggested-slug}.md" — Save to the project's `research/` directory
  2. "Copy to clipboard" — Copy the full document to the clipboard using `pbcopy`
- **multiSelect:** false

The user can also type a custom option (e.g., a different path or filename).

**After the user responds:**
- **Save**: Create the `research/` directory in the project root if it doesn't exist. Write the document to the chosen path. Confirm the file was saved.
- **Copy to clipboard**: Read `${CLAUDE_PLUGIN_ROOT}/skills/clipboard/SKILL.md`, then follow its rules to copy the content. Confirm it was copied.
- **Custom input**: Follow the user's instructions (different path, different name, etc.).

---

## Source Evaluation

### Source Tiers

| Tier | Type | Examples | Trust Level |
|------|------|----------|-------------|
| **Tier 1** | Official docs, specs, official repos | react.dev, docs.python.org | Highest — use as definitive |
| **Tier 2** | Known educators, official community | MDN, freeCodeCamp, core contributor blogs | High — good for learning |
| **Tier 3** | Community sources | Stack Overflow, GitHub issues, dev blogs | Medium — verify first |
| **Tier 4** | Unverified | Content farms, undated tutorials | Low — use with caution |

### Cross-Referencing

- Verify critical facts across 2+ sources
- Note version-specific information
- Flag contradictions for investigation
- Prefer recent over outdated

### Error Handling

**Insufficient Information:**
```
I found limited information about [topic]. Based on available sources:
[Present what was found]

This might indicate a recent/unreleased feature, deprecated functionality, or different terminology.
Would you like me to search with alternative terms?
```

**Contradictory Sources:**
```
I found conflicting information:
- Source A: [X]
- Source B: [Y]

This appears to be due to [version/context/timing].
The most current information suggests: [recommendation]
```

---

## Formatting Standards

### Markdown Structure

- H1 (`#`) — Title only
- H2 (`##`) — Major sections / Parts
- H3 (`###`) — Subsections
- Keep hierarchy shallow (max 3 levels)

### Code Blocks

- Always specify language
- Include comments explaining non-obvious lines
- Use the project's detected language/framework when applicable

### Diagrams

All diagrams use Mermaid. Common types:
- `flowchart TD` — architecture, decision trees, processes
- `sequenceDiagram` — request/response flows, interactions
- `erDiagram` — data models, relationships
- `graph LR` — simple relationships

### Source Attribution

```markdown
## Sources
- [URL] — [Brief description of what info came from this source]
```

- List in order of importance/relevance
- Include official docs first
- Keep descriptions concise (5-10 words)

---

## Rules

- Use AskUserQuestion for ALL user interaction (clarification, depth selection, save). Never ask questions as plain text.
- For explain requests, launch 2 agents (web + local) in a single message.
- For refactor impact, launch 2 agents (web + Explore) in a single message.
- For deep research, launch ALL 4 agents in a single message for maximum parallelism.
- When a save path is provided by the caller, use it directly instead of asking the user.
- Pass `DETECTED_STACK` to every agent prompt (deep research only).
- Tag every finding with its source tier ([Tier 1] through [Tier 4]).
- Include code examples in the detected language — never use a different language unless the query is about a different language.
- Include at least one Mermaid diagram when the topic involves architecture or data flow.
- Always include a Knowledge Gaps section in deep research — be honest about what wasn't covered.
- Never stage files or create commits — the user manages git.

## Related Files

- `templates/` — Individual template files (introduction, learning-guide, how-to, reference, refactor-impact, deep-research)
- `references/search-strategies.md` — Advanced search techniques per domain
- `references/source-evaluation.md` — Criteria for assessing source quality
