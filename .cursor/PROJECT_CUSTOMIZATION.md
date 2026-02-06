# Project Customization Guide

This guide explains how to customize the Cursor agent system for different projects, whether they're microservices, large applications like yoohoo.guru, or completely new builds.

---

## Table of Contents

1. [Configuration Architecture](#configuration-architecture)
2. [Project Types](#project-types)
3. [Style Customization](#style-customization)
4. [Cursor Desktop Setup](#cursor-desktop-setup)
5. [New vs Existing Projects](#new-vs-existing-projects)
6. [Examples](#examples)

---

## Configuration Architecture

The system uses a **layered configuration** approach:

```
┌─────────────────────────────────────────┐
│         Project-Specific Override       │  ← .cursorrules.local (optional)
├─────────────────────────────────────────┤
│         Project Configuration           │  ← .cursorrules (in your project)
├─────────────────────────────────────────┤
│         Base Agent Definitions          │  ← .cursor/agents/*.md
├─────────────────────────────────────────┤
│         Shared Style/Theme Config       │  ← theme.config.ts / STYLE_GUIDE.md
└─────────────────────────────────────────┘
```

### How It Works

1. **Base Rules** (`.cursorrules`) - Core standards that apply everywhere
2. **Agent Definitions** (`.cursor/agents/`) - Specialized agent behaviors
3. **Project Override** (`.cursorrules.local`) - Project-specific customizations
4. **Theme Config** (`theme.config.ts`) - Visual design tokens per project

---

## Project Types

### Type 1: Microservices (Small, Focused)
- Use base configuration as-is
- Minimal customization needed
- Examples: goldengoosetools.com microtools, API services

### Type 2: Large Applications (Full-Featured)
- Create project-specific overrides
- Extended agent configurations
- Custom style guide
- Examples: yoohoo.guru, intellmeai.com, almagest

### Type 3: E-commerce / Product Sites
- Product-focused agent additions
- Brand-specific styling
- Examples: goldengoosetees.com

---

## Style Customization

### Option 1: Theme Configuration File (Recommended)

Create a `theme.config.ts` in your project root:

```typescript
// theme.config.ts - Project-specific design tokens

export const theme = {
  // Project Identity
  project: {
    name: "YooHoo Guru",
    domain: "yoohoo.guru",
    description: "Skill-sharing platform connecting experts with learners",
  },

  // Brand Colors
  colors: {
    primary: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",  // Main brand color
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
      950: "#082f49",
    },
    secondary: {
      // Your secondary palette
    },
    accent: {
      // Accent colors for CTAs, highlights
    },
    semantic: {
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },
    neutral: {
      // Gray scale for text, backgrounds
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      display: ["Cal Sans", "Inter", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    // Override base scale if needed
  },

  // Spacing (uses 8px grid by default)
  spacing: {
    // Override only if project needs different grid
  },

  // Component Variants
  components: {
    button: {
      borderRadius: "9999px", // Fully rounded for YooHoo
    },
    card: {
      borderRadius: "16px",
      shadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    },
    input: {
      borderRadius: "12px",
    },
  },

  // Dark Mode
  darkMode: {
    enabled: true,
    default: "system", // "light" | "dark" | "system"
  },
} as const;

export type Theme = typeof theme;
```

### Option 2: Project-Specific Style Guide

Create `docs/STYLE_GUIDE.local.md` for project-specific overrides:

```markdown
# YooHoo Guru Style Guide

> This extends the base InTellMe style guide with project-specific design decisions.

## Brand Identity

**Personality**: Friendly, approachable, educational
**Voice**: Encouraging, clear, supportive

## Color Palette

### Primary - Sky Blue
Represents: Trust, knowledge, openness
- Primary: #0ea5e9
- Hover: #0284c7
- Active: #0369a1

### Secondary - Warm Orange
Represents: Energy, creativity, enthusiasm
- Secondary: #f97316
- Hover: #ea580c

### Accent - Purple
For: Premium features, achievements, badges
- Accent: #8b5cf6

## Component Overrides

### Buttons
- Use fully rounded (pill) buttons for primary CTAs
- Square buttons only for icon-only actions

### Cards
- Skill cards: Include gradient border on hover
- User cards: Include avatar with status indicator

## Unique Components

### Skill Badge
- Circular with level indicator
- Color corresponds to skill category

### Session Timer
- Prominent countdown display
- Pulsing animation in final 5 minutes
```

---

## Cursor Desktop Setup

### Method 1: Copy to Each Project (Recommended for Independence)

```bash
# Clone the agent system
git clone https://github.com/InTellMe/cursor-agents.git

# Copy to your project
cp -r cursor-agents/.cursorrules your-project/
cp -r cursor-agents/.cursor your-project/
cp -r cursor-agents/docs your-project/

# Customize for your project
# Edit .cursorrules, theme.config.ts, etc.
```

**Pros**: Each project is self-contained, can diverge as needed
**Cons**: Updates require manual sync

### Method 2: Git Submodule (Recommended for Consistency)

```bash
# In your project root
git submodule add https://github.com/InTellMe/cursor-agents.git .cursor-base

# Create symlinks or copy what you need
ln -s .cursor-base/.cursor .cursor
cp .cursor-base/.cursorrules .cursorrules
```

**Pros**: Easy to pull updates from base system
**Cons**: Requires submodule management

### Method 3: Cursor Workspace (Multiple Projects)

Create a `intellme.code-workspace` file:

```json
{
  "folders": [
    {
      "name": "🎯 Cursor Agents (Config)",
      "path": "./cursor-agents"
    },
    {
      "name": "🎓 YooHoo Guru",
      "path": "./yoohoo-guru"
    },
    {
      "name": "🛠️ Golden Goose Tools",
      "path": "./goldengoosetools"
    },
    {
      "name": "👕 Golden Goose Tees",
      "path": "./goldengoosetees"
    }
  ],
  "settings": {
    "cursor.chat.agentMode": true
  }
}
```

### Method 4: Cursor Settings (Global Agents)

In Cursor Desktop, you can set global rules:

1. Open Cursor Settings (`Cmd/Ctrl + ,`)
2. Search for "Rules for AI"
3. Add your base rules there (applies to ALL projects)
4. Project-specific `.cursorrules` will override/extend

---

## New vs Existing Projects

### For NEW Projects

The agents automatically scaffold from scratch:

```
@architect Design a skill-sharing platform called YooHoo Guru with:
- User profiles for teachers and learners
- Skill listings with categories
- Booking system for sessions
- Real-time video integration
- Payment processing via Stripe
```

Architect will create:
- System architecture document
- Database schema
- API contracts
- Component hierarchy

Then chain to builder:
```
@builder Implement the user profile system based on the architecture
```

### For EXISTING Projects

Agents assess what exists first:

```
@architect Analyze this repository and document the current architecture
```

This triggers the **Repository Assessment Workflow**:
1. Scans directory structure
2. Identifies tech stack
3. Reviews existing patterns
4. Documents current state
5. Identifies improvement areas

Then you can request targeted changes:
```
@builder Add a notification preferences page following existing patterns
```

### Assessment Commands

```
# Full repo assessment
@architect Perform a complete repository assessment

# Specific area review
@qa Review the authentication flow for security issues

# Style audit
@ux Audit the current UI for accessibility compliance

# Performance check
@devops Analyze the deployment configuration and suggest optimizations
```

---

## Examples

### Example 1: Setting Up YooHoo Guru

```bash
# 1. Clone your project
git clone https://github.com/InTellMe/yoohoo-guru.git
cd yoohoo-guru

# 2. Add cursor agents
cp -r ../cursor-agents/.cursor .
cp ../cursor-agents/.cursorrules .

# 3. Create project-specific theme
touch theme.config.ts
# (Add YooHoo-specific colors, typography)

# 4. Create local override
touch .cursorrules.local
```

`.cursorrules.local` for YooHoo:
```markdown
# YooHoo Guru - Project Overrides

## Project Context
YooHoo Guru is a skill-sharing platform. Key domains:
- Users (teachers, learners, admins)
- Skills (categories, levels, certifications)
- Sessions (booking, video, payments)
- Reviews (ratings, testimonials)

## Tech Stack Additions
- Video: Daily.co or Twilio
- Payments: Stripe Connect (for payouts to teachers)
- Search: Algolia or Meilisearch

## Design Emphasis
- Friendly, approachable UI
- Heavy use of avatars and social proof
- Gamification elements (badges, streaks)

## Priority Features
1. Skill discovery and search
2. Teacher profiles with portfolio
3. Session booking with calendar
4. Real-time video sessions
5. Review and rating system
```

### Example 2: Customizing Colors in Cursor Chat

When working with an agent, you can specify styling inline:

```
@builder Create a hero section for the homepage using:
- Primary color: #0ea5e9 (sky blue)
- Secondary color: #f97316 (orange)
- Large, friendly typography
- Illustrated background with learning motifs
- "Start Learning Today" CTA button (fully rounded, gradient)
```

### Example 3: Building on Existing Code

```
@architect I have an existing Next.js app with basic auth. 
I need to add:
1. Teacher verification system
2. Skill endorsements from other users
3. Session recording and playback

Analyze the current codebase and design these features 
to integrate with existing patterns.
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Assess existing repo | `@architect Perform repository assessment` |
| Design new feature | `@architect Design [feature] system` |
| Build component | `@builder Create [component] with [specs]` |
| Set colors inline | Include hex codes in your prompt |
| Override styles | Edit `theme.config.ts` or `STYLE_GUIDE.local.md` |
| Project rules | Edit `.cursorrules.local` |

---

## File Checklist

For a fully customized project:

```
your-project/
├── .cursorrules              # Base rules (copied from agents repo)
├── .cursorrules.local        # Project-specific overrides
├── .cursor/
│   └── agents/
│       ├── architect.md      # Can extend with project context
│       ├── builder.md
│       ├── qa.md
│       ├── ux.md
│       ├── docs.md
│       ├── devops.md
│       └── support.md
├── theme.config.ts           # Design tokens
├── docs/
│   ├── ARCHITECTURE.md       # Project-specific architecture
│   ├── STYLE_GUIDE.md        # Base style guide
│   └── STYLE_GUIDE.local.md  # Project style overrides
└── ...
```

---

## Need Help?

- **Styling questions**: Ask `@ux` with specific requirements
- **Architecture decisions**: Ask `@architect` to evaluate options
- **Integration issues**: Ask `@support` to diagnose

The agents are designed to be contextual—they'll read your project files and adapt their responses accordingly.
