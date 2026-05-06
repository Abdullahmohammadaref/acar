# Source Evaluation

Criteria and methods for assessing the quality, reliability, and relevance of information sources.

## Source Quality Tiers

### Tier 1: Authoritative Primary Sources
**Characteristics**:
- Official documentation from tool/framework creators
- Published specifications and standards (W3C, IETF, etc.)
- Official repositories and codebases
- First-party blog posts and announcements

**Trust level**: Highest - use as definitive reference

**Examples**:
- https://code.claude.com/docs - Claude Code official docs
- https://react.dev - React official documentation
- https://python.org/docs - Python official documentation
- https://github.com/facebook/react - React official repository

**How to verify**:
- Check domain matches official project
- Look for official branding/authentication
- Verify in official project links
- Check certificate/https

### Tier 2: Authoritative Secondary Sources
**Characteristics**:
- Well-known educators and tutorial sites
- Official community resources
- Verified contributor blogs
- Respected technical publications

**Trust level**: High - good for learning and examples

**Examples**:
- MDN Web Docs (Mozilla Developer Network)
- freeCodeCamp
- Official project blogs (React, Python, etc.)
- Kent C. Dodds, Dan Abramov (for React)

**How to verify**:
- Check author credentials
- Look for community recognition
- Verify recency of content
- Cross-reference with Tier 1 sources

### Tier 3: Community Sources
**Characteristics**:
- Stack Overflow answers
- GitHub issues and discussions
- Developer blogs
- Tutorial websites

**Trust level**: Medium - verify before trusting

**Examples**:
- Stack Overflow accepted answers
- Popular dev.to articles
- Medium technical posts
- Community wikis

**How to verify**:
- Check votes/acceptance
- Review author expertise
- Verify with official docs
- Check publication date
- Look for code quality

### Tier 4: Unverified Sources
**Characteristics**:
- Content farms
- Unattributed tutorials
- Automated/AI-generated content
- Outdated resources

**Trust level**: Low - use with extreme caution

**How to identify**:
- Low-quality writing
- No author information
- Conflicting information
- Very old dates
- No sources cited

## Evaluation Criteria

### Authority

**Questions to ask**:
- Who created this content?
- What are their credentials?
- Is this an official source?
- Do they have expertise in this area?

**Red flags**:
- Anonymous authors
- No credentials listed
- Suspicious domain names
- No organizational backing

**Green flags**:
- Official organization
- Known expert in field
- Verified credentials
- Strong reputation

### Currency

**Questions to ask**:
- When was this published?
- When was it last updated?
- Is this information still current?
- What version does this apply to?

**Red flags**:
- No date listed
- Several years old for fast-moving tech
- References deprecated features
- Uses outdated syntax

**Green flags**:
- Recent publication date
- Last updated timestamp
- Version numbers specified
- Matches current releases

### Accuracy

**Questions to ask**:
- Can I verify this information?
- Does it match other sources?
- Are there citations/sources?
- Does the code work?

**Red flags**:
- Contradicts official docs
- No sources provided
- Claims without evidence
- Code has obvious errors

**Green flags**:
- Matches official documentation
- Cites authoritative sources
- Verified by multiple sources
- Working code examples

### Relevance

**Questions to ask**:
- Does this answer my question?
- Is this the right version/platform?
- Is the context appropriate?
- Is the detail level suitable?

**Red flags**:
- Wrong version/platform
- Different use case
- Too basic/too advanced
- Tangentially related

**Green flags**:
- Directly addresses question
- Correct version/platform
- Appropriate detail level
- Matches use case

### Purpose

**Questions to ask**:
- Why was this created?
- What is the author's goal?
- Is there bias or agenda?
- Is this educational or promotional?

**Red flags**:
- Heavy promotion/sales
- Biased comparisons
- Missing caveats
- One-sided arguments

**Green flags**:
- Educational intent
- Balanced perspective
- Acknowledges limitations
- Transparent about tradeoffs

## Cross-Referencing

### When to Cross-Reference

Always verify:
- Critical technical facts
- Command syntax
- API signatures
- Configuration formats
- Security-related information
- Best practices claims

### How to Cross-Reference

1. **Find official documentation** for the topic
2. **Check 2-3 independent sources** of similar authority
3. **Look for consensus** across sources
4. **Note disagreements** and investigate why
5. **Prefer recent and authoritative** when conflicts exist

### Handling Conflicts

**When sources disagree**:

1. **Check dates**: Newer may reflect updates
2. **Check versions**: May be version-specific
3. **Check context**: May apply to different scenarios
4. **Verify with Tier 1**: Official docs are tie-breaker
5. **Document uncertainty**: Note if unable to resolve

## Code Quality Assessment

### Evaluating Code Examples

**Good code examples**:
- Follows language conventions
- Includes error handling
- Has explanatory comments
- Works without modification
- Uses modern syntax
- Addresses edge cases
- Follows security best practices

**Poor code examples**:
- Outdated syntax
- No error handling
- Security vulnerabilities
- Won't run without fixes
- Missing important details
- Bad practices
- Unexplained magic numbers

## Confidence Levels

When presenting research, indicate confidence:

**High Confidence**:
- Verified in official documentation
- Consistent across multiple Tier 1-2 sources
- Recent and version-appropriate
- Personally verified if code

**Medium Confidence**:
- Found in Tier 2-3 sources
- Cross-referenced but minor conflicts
- Reasonably recent
- Indirect verification

**Low Confidence**:
- Single source
- Tier 3-4 sources only
- Contradictory information
- Uncertain version applicability
- Unable to verify

**Present accordingly**:
- High: State as fact with sources
- Medium: "According to [sources]..."
- Low: "Some sources suggest..." or "This may indicate..."

## Source Priority Decision Tree

```
Start
  |
Is this official documentation?
  |-- Yes -> Tier 1 (Use as primary source)
  |-- No
      |
Is author verified expert or official community resource?
  |-- Yes -> Tier 2 (Good for learning/examples)
  |-- No
      |
Is it from trusted community (Stack Overflow, GitHub)?
  |-- Yes -> Tier 3 (Verify before using)
  |-- No
      |
Can you verify information with Tier 1-2 source?
  |-- Yes -> Use cautiously, cite verification
  |-- No -> Tier 4 (Avoid or note uncertainty)
```

## Best Practices Summary

### Do
- Start with official documentation
- Cross-reference critical information
- Check publication dates
- Verify code examples
- Note version-specific details
- Cite all sources used
- Document uncertainties

### Don't
- Trust single source for critical info
- Ignore publication dates
- Skip official documentation
- Copy code without understanding
- Ignore version mismatches
- Use unverified sources exclusively
- Present uncertain info as fact
