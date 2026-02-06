# Cursor Desktop Setup Guide

Complete guide for using the InTellMe cursor agent system with Cursor Desktop IDE.

---

## Table of Contents

1. [How Cursor Finds Rules](#how-cursor-finds-rules)
2. [Installation Methods](#installation-methods)
3. [Working with Multiple Projects](#working-with-multiple-projects)
4. [Using Agents in Cursor](#using-agents-in-cursor)
5. [New Projects vs Existing Projects](#new-projects-vs-existing-projects)
6. [Customizing Styles](#customizing-styles)
7. [Troubleshooting](#troubleshooting)

---

## How Cursor Finds Rules

Cursor looks for configuration in this order:

```
1. Project root .cursorrules          ← Main project rules
2. .cursor/ directory                 ← Agent definitions and settings
3. Cursor Settings → "Rules for AI"   ← Global rules (all projects)
```

### Key Files

| File | Purpose | Scope |
|------|---------|-------|
| `.cursorrules` | Core rules, standards, behaviors | Project |
| `.cursor/agents/*.md` | Agent-specific instructions | Project |
| `.cursorrules.local` | Personal/project overrides | Project (gitignored) |
| `theme.config.ts` | Design tokens | Project |
| Cursor Settings | Global defaults | All projects |

---

## Installation Methods

### Method 1: Direct Copy (Recommended for Most Projects)

Best for: Independent projects that may diverge from base system.

```bash
# 1. Clone the cursor-agents repo
git clone https://github.com/InTellMe/cursor-agents.git

# 2. Copy to your project
cp cursor-agents/.cursorrules your-project/
cp -r cursor-agents/.cursor your-project/

# 3. (Optional) Copy docs
cp -r cursor-agents/docs your-project/

# 4. Open in Cursor
cursor your-project
```

**Or use the setup script:**

```bash
cd cursor-agents
./setup.sh --target /path/to/your-project
```

### Method 2: Git Submodule (For Synced Updates)

Best for: Multiple projects that should stay in sync with base system.

```bash
# In your project root
git submodule add https://github.com/InTellMe/cursor-agents.git .cursor-base

# Create symlinks to use the configs
ln -s .cursor-base/.cursor .cursor
ln -s .cursor-base/.cursorrules .cursorrules

# For project-specific overrides, create local files
touch .cursorrules.local
touch theme.config.ts
```

To update all projects:
```bash
cd .cursor-base
git pull origin main
cd ..
git add .cursor-base
git commit -m "chore: update cursor agents"
```

### Method 3: Global Cursor Settings

Best for: Personal defaults that apply everywhere.

1. Open Cursor Desktop
2. Press `Cmd/Ctrl + ,` to open Settings
3. Search for "Rules for AI"
4. Add your global rules:

```
You are an expert developer working on InTellMe projects.

Follow these principles:
- TypeScript strict mode, explicit types
- Functional React components with hooks
- Comprehensive error handling
- WCAG 2.1 AA accessibility minimum
- 8px spacing grid system

Use these agents when invoked:
- @architect: System design and API contracts
- @builder: Implementation with tests
- @qa: Testing and code review
- @ux: Design and accessibility
- @docs: Documentation
- @devops: Deployment and infrastructure
- @support: Maintenance and debugging
```

**Note**: Project-level `.cursorrules` override these global settings.

---

## Working with Multiple Projects

### Scenario: Different Projects, Same Standards

Your folder structure:
```
intellme/
├── cursor-agents/           # The agent system repo
├── yoohoo-guru/            # Large app
├── goldengoosetools/       # Microservices collection
├── goldengoosetees-studio/ # E-commerce
└── almagest/               # Another large app
```

**Option A: Copy to each project**

```bash
# For each project
./cursor-agents/setup.sh --target ./yoohoo-guru
./cursor-agents/setup.sh --target ./goldengoosetools
./cursor-agents/setup.sh --target ./goldengoosetees-studio
```

**Option B: Use Cursor Workspace**

Create `intellme.code-workspace`:
```json
{
  "folders": [
    { "name": "📋 Agents Config", "path": "cursor-agents" },
    { "name": "🎓 YooHoo Guru", "path": "yoohoo-guru" },
    { "name": "🛠️ Golden Goose Tools", "path": "goldengoosetools" },
    { "name": "👕 Golden Goose Tees", "path": "goldengoosetees-studio" }
  ],
  "settings": {}
}
```

Open with: `cursor intellme.code-workspace`

**Important**: Even in a workspace, each project needs its own `.cursorrules` file in its root. Cursor reads rules from the **currently active file's project root**.

### Scenario: Project-Specific Customization

After copying base agents, customize for each project:

**YooHoo Guru** (`.cursorrules.local`):
```markdown
## Project: YooHoo Guru

Colors: Primary #0ea5e9, Secondary #f97316
Style: Friendly, pill buttons, lift-on-hover cards
Focus: Two-sided marketplace, video sessions, payments
```

**Golden Goose Tees** (`.cursorrules.local`):
```markdown
## Project: Golden Goose Tees

Colors: Primary #eab308 (gold), Secondary #000000
Style: Bold, edgy, provocative humor
Focus: E-commerce, product catalog, Printful integration
```

---

## Using Agents in Cursor

### Basic Invocation

In Cursor's AI chat (press `Cmd/Ctrl + L`):

```
@architect Design a user authentication system with OAuth support
```

The `@architect` tells Cursor to use the architect agent's instructions.

### Agent Reference

| Invoke | Agent | Best For |
|--------|-------|----------|
| `@architect` | System Architect | Design, APIs, database schemas |
| `@builder` | Implementation | Writing code, components, features |
| `@qa` | Quality Assurance | Testing, code review, bug hunting |
| `@ux` | UX/Design | UI components, accessibility, styling |
| `@docs` | Documentation | READMEs, API docs, guides |
| `@devops` | DevOps | Deployment, CI/CD, infrastructure |
| `@support` | Support | Debugging, maintenance, incidents |

### Chaining Agents

For complex tasks, chain agents together:

```
# Step 1: Design
@architect Design a notification preferences system for YooHoo Guru

# Step 2: Build (reference architect's output)
@builder Implement the notification preferences based on the architecture above

# Step 3: Test
@qa Write tests for the notification preferences system

# Step 4: Document
@docs Create user documentation for notification settings
```

### Providing Context

Be specific with your requests:

**Less Effective:**
```
@builder Add a settings page
```

**More Effective:**
```
@builder Add a notification preferences page with:
- Email notification toggles (marketing, session reminders, messages)
- Push notification toggles
- Quiet hours setting (start/end time)
- Save/Cancel buttons
- Use our existing SettingsLayout component
- Follow the theme in theme.config.ts
```

### File-Specific Context

Reference specific files:

```
@builder Looking at components/SessionCard.tsx, refactor it to:
- Extract the price display into a PriceTag component
- Add skeleton loading state
- Improve accessibility (add proper ARIA labels)
```

---

## New Projects vs Existing Projects

### Starting from Scratch

When you have an empty or nearly empty project:

```
@architect I'm building a new skill-sharing platform called YooHoo Guru.

Users can:
- Create profiles as teachers or learners
- Teachers list their skills with pricing
- Learners browse and book sessions
- Sessions happen via video call
- Payments through Stripe

Design the complete system architecture including:
- Database schema
- API endpoints
- Core components
- Auth flow
```

The architect will create comprehensive design documents. Then:

```
@builder Start implementing the user authentication system
```

### Working with Existing Code

For projects that already have code:

**Step 1: Assess what exists**
```
@architect Analyze this repository and document:
- Current architecture and patterns
- Tech stack in use
- Code organization
- Areas for improvement
```

**Step 2: Plan changes**
```
@architect I want to add real-time notifications. 
How should this integrate with the existing codebase?
```

**Step 3: Implement incrementally**
```
@builder Add the WebSocket connection service following existing patterns
```

### Refactoring Existing Code

```
@qa Review the authentication flow in lib/auth/ for:
- Security vulnerabilities
- Code quality issues
- Missing error handling
- Test coverage gaps

Then provide a prioritized list of improvements.
```

```
@builder Refactor the auth flow based on the QA review.
Start with the highest priority security issue.
```

---

## Customizing Styles

### Method 1: Inline in Prompts

Quick way to specify styles for one-off requests:

```
@builder Create a hero section with:
- Background: gradient from #0ea5e9 to #0284c7
- Headline font: Cal Sans, 72px, white
- Button: fully rounded, orange (#f97316), "Start Learning" text
- Centered layout with max-width 1200px
```

### Method 2: theme.config.ts

For project-wide consistency:

```typescript
// theme.config.ts
export const theme = {
  colors: {
    primary: { 500: "#0ea5e9" },
    secondary: { 500: "#f97316" },
  },
  typography: {
    fontFamily: {
      display: ["Cal Sans", "Inter", "sans-serif"],
    },
  },
  components: {
    button: {
      borderRadius: "9999px",  // Fully rounded
    },
  },
};
```

Then reference it:
```
@builder Create the hero section following theme.config.ts
```

### Method 3: .cursorrules.local

For persistent style rules:

```markdown
# .cursorrules.local

## Design System

### Colors
Always use these colors:
- Primary: #0ea5e9 (sky blue) - CTAs, links, primary actions
- Secondary: #f97316 (orange) - highlights, secondary actions
- Accent: #8b5cf6 (purple) - premium features, achievements

### Components
- All buttons should be fully rounded (pill shape)
- Cards should have 16px border radius and subtle shadow
- Use Inter for body text, Cal Sans for headings

### Tone
- Friendly and encouraging
- Use "you" and "your" language
- Celebrate achievements with animations
```

### Method 4: Full Style Guide

For large projects, maintain `docs/STYLE_GUIDE.local.md`:

```markdown
# YooHoo Guru Style Guide

[Full design system documentation]
[Component specifications]
[Accessibility requirements]
[Animation guidelines]
```

Reference it:
```
@ux Following docs/STYLE_GUIDE.local.md, audit the current homepage for compliance
```

---

## Troubleshooting

### "Agent not found" or No Behavior Change

**Cause**: Cursor isn't finding the agent files.

**Fix**:
1. Verify `.cursor/agents/` directory exists in project root
2. Check file names match: `architect.md`, `builder.md`, etc.
3. Restart Cursor after adding files

### Agents Ignoring Project Rules

**Cause**: Cursor may cache instructions.

**Fix**:
1. Start a new chat session (`Cmd/Ctrl + N`)
2. Clear Cursor's cache: Settings → "Clear Chat History"
3. Explicitly reference rules: "Following .cursorrules, ..."

### Wrong Colors/Styles Applied

**Cause**: Agent doesn't know about your theme.

**Fix**:
1. Reference theme explicitly: "Using colors from theme.config.ts..."
2. Add colors to `.cursorrules.local`
3. Include theme in your prompt context

### Agents Too Verbose/Different Style Than Expected

**Cause**: Base rules may not match your preferences.

**Fix**: Add to `.cursorrules.local`:
```markdown
## Response Style
- Be concise, skip explanations unless asked
- Code first, comments minimal
- No step-by-step tutorials unless requested
```

### Multiple Projects Interfering

**Cause**: When using workspaces, Cursor uses rules from active file's project.

**Fix**:
1. Ensure each project has its own `.cursorrules`
2. Verify you're focused on the correct project's files
3. Start new chat when switching projects

### Permission Denied on Setup Script

**Fix**:
```bash
chmod +x setup.sh
./setup.sh
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                  CURSOR AGENTS QUICK REF                    │
├─────────────────────────────────────────────────────────────┤
│  SETUP                                                      │
│    ./setup.sh --target /path/to/project                     │
│    cursor /path/to/project                                  │
├─────────────────────────────────────────────────────────────┤
│  AGENTS                                                     │
│    @architect  → Design, APIs, database                     │
│    @builder    → Code, components, features                 │
│    @qa         → Testing, review, bugs                      │
│    @ux         → Design, accessibility, style               │
│    @docs       → Documentation                              │
│    @devops     → Deploy, CI/CD, infra                       │
│    @support    → Debug, maintain, incidents                 │
├─────────────────────────────────────────────────────────────┤
│  CUSTOMIZATION                                              │
│    .cursorrules.local  → Project overrides                  │
│    theme.config.ts     → Colors, typography                 │
│    docs/STYLE_GUIDE.local.md → Full design system          │
├─────────────────────────────────────────────────────────────┤
│  COMMON WORKFLOWS                                           │
│    New feature: @architect → @builder → @qa → @docs        │
│    Bug fix:     @support → @builder → @qa                  │
│    Refactor:    @qa review → @architect plan → @builder    │
│    UI polish:   @ux audit → @builder implement             │
└─────────────────────────────────────────────────────────────┘
```

---

## Need More Help?

- See `docs/PROJECT_CUSTOMIZATION.md` for advanced customization
- See `docs/USAGE_GUIDE.md` for detailed workflow examples
- Check `examples/` folder for project-specific configurations

The agents are contextual—they read your project files. The more context you provide (in prompts, rules files, and themes), the better they perform.
