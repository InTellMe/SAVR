# InTellMe Cursor Agent System

A comprehensive AI agent system for building, maintaining, and supporting world-class microservice applications.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Cursor](https://img.shields.io/badge/Cursor-Compatible-green)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

This repository contains a complete Cursor AI agent ecosystem designed for InTellMe's microservice development workflow. It provides specialized agents for every phase of the software development lifecycle.

## Features

- 🏗️ **7 Specialized Agents** - Architect, Builder, QA, UX, Docs, DevOps, Support
- 📋 **Comprehensive Standards** - Coding, UI/UX, architecture, and deployment standards
- 🎨 **World-Class Design System** - High-resolution, responsive, accessible interfaces
- 🚀 **CI/CD Ready** - GitHub Actions workflows included
- 📚 **Full Documentation** - Architecture docs, style guide, contributing guide

## Repository Structure

```
intellme-cursor-agents/
├── .cursorrules                    # Master Cursor AI rules
├── .cursor/
│   └── agents/
│       ├── architect.md            # System design agent
│       ├── builder.md              # Implementation agent
│       ├── qa.md                   # Testing/review agent
│       ├── ux.md                   # Design/accessibility agent
│       ├── docs.md                 # Documentation agent
│       ├── devops.md               # Deployment/infra agent
│       └── support.md              # Maintenance/support agent
├── docs/
│   ├── ARCHITECTURE.md             # System architecture guide
│   ├── CONTRIBUTING.md             # Development standards
│   └── STYLE_GUIDE.md              # Visual design system
├── templates/
│   └── MICROSERVICE_TEMPLATE.md    # New project template
├── USAGE_GUIDE.md                  # How to use the agents
└── README.md                       # This file
```

## Quick Start

### Installation

```bash
# Clone this repository
git clone https://github.com/InTellMe/cursor-agents.git

# Copy to your project
cp -r cursor-agents/.cursorrules your-project/
cp -r cursor-agents/.cursor your-project/
cp -r cursor-agents/docs your-project/

# Open in Cursor
cd your-project
cursor .
```

### Basic Usage

In Cursor's chat, invoke agents with their directive:

```
@architect Design an API for user authentication

@builder Implement the authentication endpoints

@qa Write tests for the auth system

@ux Review the login page for accessibility

@docs Create API documentation

@devops Deploy to staging

@support Create a runbook for auth issues
```

## Agents Overview

| Agent | Purpose | Key Capabilities |
|-------|---------|------------------|
| **@architect** | System Design | API contracts, data models, architecture decisions |
| **@builder** | Implementation | Code generation, feature development, refactoring |
| **@qa** | Quality | Testing, code review, bug detection, coverage |
| **@ux** | Design | Responsive design, accessibility, visual polish |
| **@docs** | Documentation | User guides, API docs, technical writing |
| **@devops** | Operations | CI/CD, deployment, monitoring, infrastructure |
| **@support** | Maintenance | Issue triage, incident response, ongoing support |

## Typical Workflow

```
1. @architect → Design the solution
2. @builder   → Implement the code
3. @qa        → Test and review
4. @ux        → Verify design quality
5. @docs      → Document the feature
6. @devops    → Deploy to production
7. @support   → Maintain and monitor
```

## Standards Included

### Coding Standards
- TypeScript/JavaScript best practices
- React/Next.js patterns
- API design conventions
- Error handling guidelines
- Security requirements

### Design Standards
- Visual hierarchy principles
- Typography system (Inter, system fonts)
- Color system with dark mode
- Responsive breakpoints
- Animation guidelines
- WCAG 2.1 AA accessibility

### Infrastructure Standards
- Vercel/Railway deployment configs
- Docker configurations
- GitHub Actions CI/CD
- Environment management
- Monitoring setup

## Target Domains

- **www.intellmeai.com** - AI and technology services
- **www.goldengoosetools.com** - B2B SaaS microtools
- **Custom domains** - Specialized microservice applications

## Documentation

- [Usage Guide](./USAGE_GUIDE.md) - Complete instructions
- [Architecture](./docs/ARCHITECTURE.md) - System design patterns
- [Contributing](./docs/CONTRIBUTING.md) - Development workflow
- [Style Guide](./docs/STYLE_GUIDE.md) - Visual design system
- [Template](./templates/MICROSERVICE_TEMPLATE.md) - New project scaffold

## Requirements

- [Cursor IDE](https://cursor.com/) or compatible editor
- Node.js 20.x LTS
- Git 2.x+
- Docker (for local development)

## Customization

### Project-Specific Rules

Add custom rules to `.cursorrules`:

```markdown
## PROJECT-SPECIFIC RULES

### Custom Technology
- Using Supabase for authentication
- GraphQL instead of REST APIs
```

### Custom Agents

Create new agents in `.cursor/agents/`:

```markdown
# .cursor/agents/custom.md

## @custom Agent

Your custom agent configuration...
```

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development standards.

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by InTellMe**

*Making world-class software, one microservice at a time.*
