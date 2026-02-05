# InTellMe Cursor Agent System - Usage Guide

## Overview

This guide explains how to effectively use the InTellMe Cursor agent system for building, maintaining, and supporting microservice applications.

## Quick Start

### 1. Copy Files to Your Repository

```bash
# Clone the agent system
git clone https://github.com/InTellMe/cursor-agents.git

# Copy to your project
cp cursor-agents/.cursorrules your-project/
cp -r cursor-agents/.cursor your-project/
cp -r cursor-agents/docs your-project/
```

### 2. Open in Cursor

```bash
cd your-project
cursor .
```

### 3. Start Using Agents

In Cursor's chat, invoke agents by including their directive:

```
@architect Design the API for a subscription billing system
```

## Agent Reference

| Agent | Directive | Primary Use |
|-------|-----------|-------------|
| Architect | `@architect` | System design, API contracts, repo structure |
| Builder | `@builder` | Implementation, coding, feature development |
| QA | `@qa` | Testing, code review, bug detection |
| UX | `@ux` | Design review, accessibility, responsive design |
| Docs | `@docs` | Documentation, user guides, API specs |
| DevOps | `@devops` | Deployment, CI/CD, infrastructure |
| Support | `@support` | Issue triage, maintenance, incident response |

## Common Workflows

### New Feature Development

```
Step 1: @architect
"@architect Design the architecture for a user notification system"

Step 2: @builder
"@builder Implement the notification system based on the architecture"

Step 3: @qa
"@qa Write tests for the notification system"

Step 4: @docs
"@docs Create user documentation for the notification feature"

Step 5: @devops
"@devops Deploy the notification system to staging"
```

### Bug Fix Workflow

```
Step 1: @support
"@support Triage this bug: users can't update their profile"

Step 2: @builder
"@builder Fix the profile update bug identified in triage"

Step 3: @qa
"@qa Verify the fix and add regression tests"

Step 4: @devops
"@devops Deploy the hotfix to production"
```

### Repository Assessment

```
"@architect Assess this repository and identify architectural issues"
```

The architect will:
1. Analyze the codebase structure
2. Review dependencies and security
3. Identify anti-patterns
4. Provide prioritized recommendations

### UI/UX Improvement

```
"@ux Review the dashboard page for accessibility and mobile responsiveness"
```

The UX agent will:
1. Check WCAG compliance
2. Verify responsive breakpoints
3. Review visual hierarchy
4. Suggest improvements

## Advanced Usage

### Chaining Agents

For complex tasks, chain multiple agents:

```
"@architect + @builder Create and implement a payment processing service"
```

### Context from Previous Responses

Reference previous agent outputs:

```
"@builder Implement the API contract @architect designed above"
```

### Specific File Focus

Direct agents to specific files:

```
"@qa Review and add tests for src/services/user-service.ts"
```

### Multi-Agent Review

Request multiple perspectives:

```
"@architect @qa @ux Review this PR for the new checkout flow"
```

## Project-Specific Customization

### Extend .cursorrules

Add project-specific rules to `.cursorrules`:

```markdown
## PROJECT-SPECIFIC RULES

### Technology Stack
- This project uses Supabase instead of Prisma
- GraphQL API instead of REST

### Business Rules
- All prices must be in cents
- Users must verify email before accessing paid features
```

### Create Custom Agents

Add new agents in `.cursor/agents/`:

```markdown
# .cursor/agents/analytics.md

## @analytics Agent

Role: Analytics and tracking specialist

Capabilities:
- Implement event tracking
- Set up conversion funnels
- Configure analytics dashboards
```

## Best Practices

### 1. Be Specific

❌ "Fix the bug"
✅ "@support Triage the login failure bug affecting users on mobile Safari"

### 2. Provide Context

❌ "Add a feature"
✅ "@architect Design a feature for users to export their data as CSV. Users should be able to select date ranges and data types."

### 3. Break Down Large Tasks

Instead of:
❌ "Build an e-commerce platform"

Do this:
✅ 
1. "@architect Design the product catalog microservice"
2. "@architect Design the shopping cart service"
3. "@architect Design the checkout/payment flow"
Then implement each:
4. "@builder Implement the product catalog service"
...

### 4. Verify Before Deploying

Always run verification:
```
"@qa Run all tests and verify the build passes"
"@devops Do a pre-deployment checklist"
```

### 5. Document Decisions

Keep documentation current:
```
"@docs Update the README with the new environment variables"
"@docs Create an ADR for the database migration decision"
```

## Integration with Your Workflow

### GitHub Integration

The agents work well with GitHub workflow:

1. **New Branch**: "@builder Create a feature branch for user-settings"
2. **Implementation**: "@builder Implement the settings page"
3. **PR Review**: "@qa Review this PR before merging"
4. **Merge**: "@devops Merge and deploy to staging"

### Continuous Integration

The `.github/workflows/` files created by @devops integrate with your CI:

```yaml
# Automatically runs on PR
- Lint check
- Type check
- Unit tests
- Build verification
```

### Monitoring

Set up alerts with @devops:
```
"@devops Configure error alerting for production"
```

## Troubleshooting

### Agent Not Responding as Expected

1. Ensure `.cursorrules` is in project root
2. Check that agent files exist in `.cursor/agents/`
3. Be explicit about which agent you're invoking

### Conflicting Advice

When agents give different advice:
1. Consider the context each agent provides
2. Defer to the domain expert (e.g., @ux for design, @architect for structure)
3. Ask for clarification: "@architect and @ux please reconcile your suggestions"

### Complex Decisions

For major decisions, use the architecture decision record (ADR) process:
```
"@architect Create an ADR for choosing between PostgreSQL and MongoDB"
```

## Maintenance

### Keeping Agents Updated

Periodically review and update:
- `.cursorrules` for new project standards
- Agent files for new capabilities
- Documentation for accuracy

### Adding New Team Knowledge

Encode team learnings:
```
"@docs Document the workaround for the Stripe webhook timing issue"
```

## Example Session

Here's a complete example session for adding a new feature:

```
User: @architect I need to add user preferences for notification settings (email, push, SMS)

Architect: [Provides architecture design with data model, API endpoints, and service structure]

User: @builder Implement this architecture starting with the database schema

Builder: [Creates Prisma schema, service layer, and API routes]

User: @ux Design the settings UI following our style guide

UX: [Provides component specifications and responsive design patterns]

User: @builder Implement the settings UI component

Builder: [Creates React components with proper accessibility]

User: @qa Write comprehensive tests for the notification preferences feature

QA: [Creates unit, integration, and e2e tests]

User: @docs Create user documentation for the notification settings

Docs: [Writes user guide and API documentation]

User: @devops Deploy to staging and set up feature flag

DevOps: [Deploys and configures feature flag]

User: @support Create runbook for notification preference issues

Support: [Creates troubleshooting documentation]
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 INTELLME CURSOR AGENTS                      │
├─────────────────────────────────────────────────────────────┤
│ @architect  → Design, structure, API contracts              │
│ @builder    → Code, implement, develop                      │
│ @qa         → Test, review, verify                          │
│ @ux         → Design, accessibility, responsiveness         │
│ @docs       → Document, guides, specifications              │
│ @devops     → Deploy, CI/CD, infrastructure                 │
│ @support    → Triage, maintain, respond                     │
├─────────────────────────────────────────────────────────────┤
│ WORKFLOW: @architect → @builder → @qa → @docs → @devops     │
├─────────────────────────────────────────────────────────────┤
│ TIPS:                                                       │
│ • Be specific with requests                                 │
│ • Provide context                                           │
│ • Chain agents for complex tasks                            │
│ • Always verify before deploying                            │
└─────────────────────────────────────────────────────────────┘
```

---

*Happy building! 🚀*
*InTellMe Development Team*
