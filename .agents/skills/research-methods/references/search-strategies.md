# Search Strategies

Advanced techniques for effective research across different domains and tools.

## Search Tools Overview

### WebFetch Tool
**Purpose**: Retrieve and process content from specific URLs

**When to use**:
- You know the exact documentation URL
- Fetching official documentation pages
- Following documentation links
- Reading specific guides or references

**Best practices**:
- Use for primary sources when URL is known
- Provide specific prompts about what to extract
- Follow redirect URLs when provided
- Cache is 15 minutes - repeated fetches are fast

**Example usage**:
```
WebFetch("https://code.claude.com/docs/en/hooks.md",
        "Explain all available hook events")
```

### WebSearch Tool
**Purpose**: Search the web and retrieve relevant results

**When to use**:
- Don't know exact URL
- Exploring a topic
- Finding latest information
- Discovering multiple sources

**Best practices**:
- Use specific, targeted queries
- Filter by domain when possible (allowed_domains/blocked_domains)
- Account for current date in queries
- Combine with WebFetch for detailed reading

**Example usage**:
```
WebSearch("Claude Code hooks tutorial",
         allowed_domains=["code.claude.com"])
```

## Domain-Specific Strategies

### Claude Code Documentation (code.claude.com)

**Structure**:
- Main docs at: `https://code.claude.com/docs/en/`
- Documentation map: `https://code.claude.com/docs/en/claude_code_docs_map.md`

**Strategy**:
1. Start with the docs map to find relevant pages
2. Use WebFetch for specific documentation pages
3. Check for guides vs reference pages
4. Look for related documentation links

**Common pages**:
- `/docs/en/hooks.md` - Hooks reference
- `/docs/en/hooks-guide.md` - Hooks tutorial
- `/docs/en/tools.md` - Tools reference
- `/docs/en/claude_code_docs_map.md` - All docs

**Search patterns**:
```
WebFetch("https://code.claude.com/docs/en/claude_code_docs_map.md",
        "Find documentation about [topic]")
```

### GitHub (github.com)

**Content types**:
- Repository documentation (README.md)
- Wiki pages
- Issues and discussions
- Code examples

**Strategy**:
1. Search for official repositories first
2. Check README.md for overview
3. Look in /docs folder for detailed docs
4. Review issues for common problems/solutions

**Search patterns**:
```
WebSearch("site:github.com [framework] [topic]")
WebFetch("https://github.com/[org]/[repo]/blob/main/README.md",
        "Explain how to use [feature]")
```

**Best practices**:
- Prefer official org repositories
- Check repository activity and stars
- Look for /docs, /examples folders
- Read CONTRIBUTING.md for workflows

### GitHub Gists (gist.github.com)

**Content types**:
- Code snippets
- Quick references
- Configuration examples
- Mini tutorials

**Strategy**:
1. Search for specific code patterns
2. Look for gists by authoritative users
3. Check gist descriptions for context
4. Verify recency (gists can be outdated)

**Search patterns**:
```
WebSearch("site:gist.github.com [specific code/config]")
```

**Caveats**:
- May be outdated
- Often lack full context
- Not always best practices
- Use as examples, not gospel

### General Documentation Sites

**Common patterns**:
- `docs.[domain].com` - Official docs
- `[domain].com/docs` - Documentation section
- `developer.[domain].com` - Developer resources
- `[domain].readthedocs.io` - ReadTheDocs hosted

**Strategy**:
1. Identify official documentation domain
2. Look for "Getting Started" or "Guide" sections
3. Check version compatibility
4. Find API reference vs tutorial distinction

### Stack Overflow

**When to use**:
- Specific error messages
- "How to" for common tasks
- Troubleshooting issues
- Code examples

**Strategy**:
1. Search for exact error messages
2. Sort by votes/accepted answers
3. Check answer dates (prefer recent)
4. Read multiple answers for context

**Search patterns**:
```
WebSearch("site:stackoverflow.com [technology] [specific issue]")
```

**Caveats**:
- Verify answer dates
- May be version-specific
- Not always best practices
- Cross-reference with official docs

## Query Construction

### Effective Query Patterns

**Specific over general**:
- Bad: "react hooks"
- Good: "react hooks useState vs useReducer when to use"

**Include version when relevant**:
- Good: "python 3.12 match statement examples"
- Good: "react 18 concurrent features"

**Use exact terminology**:
- Good: "git rebase interactive"
- Bad: "git change multiple commits"

**Add context for ambiguous terms**:
- Good: "claude code hooks events"
- Bad: "hooks" (could be React, git, claude, fishing, etc.)

### Query Templates

**How-to queries**:
```
"how to [action] in [technology/tool]"
"[technology] [feature] tutorial"
"[technology] [feature] guide"
```

**Comparison queries**:
```
"[option A] vs [option B]"
"when to use [option A] instead of [option B]"
"difference between [A] and [B]"
```

**Reference queries**:
```
"[technology] [feature] reference"
"[technology] [feature] documentation"
"[technology] [command/function] parameters"
```

**Troubleshooting queries**:
```
"[technology] [exact error message]"
"[technology] [problem description] solution"
"why does [technology] [unexpected behavior]"
```

## Multi-Source Research

### Triangulation Strategy

For thorough research, use multiple sources:

1. **Start with official docs** (WebFetch if URL known)
2. **Cross-reference with tutorials** (WebSearch for guides)
3. **Check community examples** (GitHub, Stack Overflow)
4. **Verify with recent sources** (blogs, recent discussions)

### Source Priority

When information conflicts:

1. **Official documentation** - Always primary source
2. **Official blog/changelog** - For version-specific info
3. **Authoritative community** - Well-known educators/contributors
4. **Recent tutorials** - Dated within last year
5. **Stack Overflow** - For specific problems only

### Information Synthesis

Combining multiple sources:

1. **Extract facts** from each source
2. **Note contradictions** (may be version differences)
3. **Identify patterns** across sources
4. **Verify critical claims** in official docs
5. **Synthesize** into coherent narrative

## Domain Filtering

### Allowed Domains

When you want results only from specific sources:

```
WebSearch(query, allowed_domains=["code.claude.com", "github.com"])
```

**Use cases**:
- Researching specific project documentation
- Limiting to official sources only
- Focusing on trusted domains

### Blocked Domains

When you want to exclude specific sources:

```
WebSearch(query, blocked_domains=["example.com"])
```

**Use cases**:
- Excluding low-quality content farms
- Avoiding outdated sources
- Filtering out spam sites

## Date-Aware Searching

### Account for Current Date

The system provides current date - use it:

- Adjust queries with the current year
- Be aware of seasonal/time-based content
- Don't search for previous years when current info is needed

### Version Awareness

- Check documentation for version numbers
- Note "as of" dates in tutorials
- Verify compatibility with current versions
- Flag version-specific information in responses

## Progressive Search Refinement

### Start Broad, Narrow Down

1. **Initial search**: General topic
2. **Review results**: Identify subtopics
3. **Refined search**: Specific aspect
4. **Deep dive**: WebFetch specific docs

Example:
```
1. WebSearch("Claude Code hooks")
2. Review results, identify "Stop hook"
3. WebFetch("https://code.claude.com/docs/en/hooks.md",
           "Explain Stop hook in detail")
```

### When to Broaden

If initial search too narrow returns no results:

1. Remove version numbers
2. Try alternative terminology
3. Search for related concepts
4. Look for parent topic documentation

## Tool Selection Matrix

| Scenario | Primary Tool | Secondary Tool |
|----------|--------------|----------------|
| Know exact URL | WebFetch | - |
| Explore topic | WebSearch | WebFetch for details |
| Official docs | WebFetch | WebSearch to discover |
| Recent info | WebSearch (date-filtered) | Multiple WebFetch |
| Code examples | WebSearch GitHub | WebFetch specific repos |
| Error message | WebSearch | WebFetch official docs |
| Comparison | WebSearch general | WebFetch official docs |
| Tutorial | WebSearch | WebFetch tutorial site |
