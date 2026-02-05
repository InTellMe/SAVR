# InTellMe Microservice Template

Use this template to scaffold new microservice projects.

## Quick Start

```bash
# Create new project from template
npx create-next-app@latest my-service --typescript --tailwind --app

# Or clone this template
gh repo create InTellMe/my-service --template InTellMe/microservice-template
```

## Project Structure

```
my-service/
├── .cursor/
│   └── agents/                 # Agent configurations
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI workflow
│       └── deploy.yml          # Deploy workflow
├── docs/
│   ├── api/
│   │   └── openapi.yaml        # API specification
│   └── README.md               # User documentation
├── public/
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Public pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── pricing/
│   │   │   └── about/
│   │   ├── (dashboard)/        # Auth-required pages
│   │   │   ├── layout.tsx      # Dashboard layout
│   │   │   └── dashboard/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts    # Health check endpoint
│   │   │   └── v1/             # API v1 routes
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Shadcn components
│   │   ├── forms/              # Form components
│   │   └── layouts/            # Layout components
│   ├── lib/
│   │   ├── auth.ts             # Auth configuration
│   │   ├── db.ts               # Database client
│   │   ├── utils.ts            # Utility functions
│   │   └── validations.ts      # Zod schemas
│   ├── services/               # Business logic
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   └── config/                 # Configuration
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/
├── .cursorrules                # Cursor AI rules
├── .env.example                # Environment template
├── .gitignore
├── docker-compose.yml          # Local dev services
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Configuration Files

### package.json
```json
{
  "name": "@intellme/my-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^1.0.0",
    "@prisma/client": "^5.0.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0",
    "next": "14.x",
    "next-auth": "^5.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.x",
    "postcss": "^8.4.0",
    "prisma": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### .env.example
```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/my_service"

# Authentication
AUTH_SECRET="your-secret-key-min-32-chars-long"
AUTH_URL=http://localhost:3000

# Optional: OAuth Providers
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# External Services
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# RESEND_API_KEY=re_...

# Monitoring
# SENTRY_DSN=
# NEXT_PUBLIC_POSTHOG_KEY=

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_BETA_FEATURES=false
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: my_service
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

## Essential Components

### Health Check Endpoint
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0',
  };

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { ...checks, status: 'unhealthy' },
      { status: 503 }
    );
  }

  return NextResponse.json(checks);
}
```

### Database Client
```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### Utility Functions
```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function absoluteUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}
```

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Getting Started Checklist

- [ ] Clone template / create project
- [ ] Configure environment variables
- [ ] Set up database (local Docker or cloud)
- [ ] Run initial migrations
- [ ] Configure authentication provider
- [ ] Set up CI/CD workflows
- [ ] Deploy to staging
- [ ] Configure monitoring
- [ ] Write initial tests

---

*Template maintained by the InTellMe development team.*
