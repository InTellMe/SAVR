/**
 * YooHoo Guru Theme Configuration
 *
 * This file defines the design tokens for the YooHoo Guru platform.
 * Import this in your Tailwind config and components for consistent styling.
 *
 * Usage in tailwind.config.ts:
 *   import { theme } from './theme.config'
 *   // Spread theme.colors into your Tailwind colors
 *
 * Usage in components:
 *   import { theme } from '@/theme.config'
 *   <div style={{ color: theme.colors.primary[500] }}>
 */

export const theme = {
  // ============================================
  // PROJECT IDENTITY
  // ============================================
  project: {
    name: "YooHoo Guru",
    domain: "yoohoo.guru",
    tagline: "Learn anything from anyone, anywhere",
    description: "Skill-sharing platform connecting experts with learners through live video sessions",
  },

  // ============================================
  // COLOR SYSTEM
  // ============================================
  colors: {
    // Primary - Ocean Blue (Trust, Knowledge, Openness)
    primary: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9", // Main brand color
      600: "#0284c7", // Hover state
      700: "#0369a1", // Active state
      800: "#075985",
      900: "#0c4a6e",
      950: "#082f49",
    },

    // Secondary - Sunset Orange (Energy, Creativity, Enthusiasm)
    secondary: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316", // Main secondary
      600: "#ea580c", // Hover
      700: "#c2410c", // Active
      800: "#9a3412",
      900: "#7c2d12",
      950: "#431407",
    },

    // Accent - Purple (Premium, Achievement, Special)
    accent: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7", // Main accent
      600: "#9333ea", // Hover
      700: "#7e22ce", // Active
      800: "#6b21a8",
      900: "#581c87",
      950: "#3b0764",
    },

    // Semantic Colors
    success: {
      light: "#86efac",
      main: "#22c55e",
      dark: "#15803d",
    },
    warning: {
      light: "#fde047",
      main: "#eab308",
      dark: "#a16207",
    },
    error: {
      light: "#fca5a5",
      main: "#ef4444",
      dark: "#b91c1c",
    },
    info: {
      light: "#93c5fd",
      main: "#3b82f6",
      dark: "#1d4ed8",
    },

    // Skill Category Colors
    categories: {
      arts: "#ec4899",        // Pink - Creative arts
      tech: "#3b82f6",        // Blue - Technology
      business: "#10b981",    // Emerald - Business & Finance
      lifestyle: "#f59e0b",   // Amber - Lifestyle & Wellness
      academics: "#6366f1",   // Indigo - Academic subjects
      music: "#ef4444",       // Red - Music & Audio
      sports: "#14b8a6",      // Teal - Sports & Fitness
      languages: "#8b5cf6",   // Violet - Languages
      crafts: "#f97316",      // Orange - Crafts & DIY
      cooking: "#84cc16",     // Lime - Cooking & Food
    },

    // Neutral Scale
    neutral: {
      0: "#ffffff",
      50: "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
      950: "#09090b",
    },

    // Background & Surface (Light Mode)
    background: {
      default: "#ffffff",
      paper: "#fafafa",
      subtle: "#f4f4f5",
    },

    // Background & Surface (Dark Mode)
    backgroundDark: {
      default: "#09090b",
      paper: "#18181b",
      subtle: "#27272a",
    },

    // Text Colors
    text: {
      primary: "#18181b",
      secondary: "#52525b",
      muted: "#a1a1aa",
      inverse: "#fafafa",
    },

    textDark: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
      muted: "#71717a",
      inverse: "#18181b",
    },
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    fontFamily: {
      // Display font for headings, hero text, marketing
      display: ['"Cal Sans"', "Inter", "system-ui", "sans-serif"],
      // Body font for readable content
      sans: ["Inter", "system-ui", "sans-serif"],
      // Monospace for code, timers, data
      mono: ['"JetBrains Mono"', "Consolas", "monospace"],
    },

    // Font sizes (following 1.25 ratio)
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],        // 12px
      sm: ["0.875rem", { lineHeight: "1.25rem" }],    // 14px
      base: ["1rem", { lineHeight: "1.5rem" }],       // 16px
      lg: ["1.125rem", { lineHeight: "1.75rem" }],    // 18px
      xl: ["1.25rem", { lineHeight: "1.75rem" }],     // 20px
      "2xl": ["1.5rem", { lineHeight: "2rem" }],      // 24px
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }],   // 36px
      "5xl": ["3rem", { lineHeight: "1.16" }],        // 48px
      "6xl": ["3.75rem", { lineHeight: "1.1" }],      // 60px
      "7xl": ["4.5rem", { lineHeight: "1.1" }],       // 72px
    },

    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
  },

  // ============================================
  // SPACING (8px Grid)
  // ============================================
  spacing: {
    px: "1px",
    0: "0",
    0.5: "0.125rem",  // 2px
    1: "0.25rem",     // 4px
    1.5: "0.375rem",  // 6px
    2: "0.5rem",      // 8px  ← Base unit
    2.5: "0.625rem",  // 10px
    3: "0.75rem",     // 12px
    3.5: "0.875rem",  // 14px
    4: "1rem",        // 16px
    5: "1.25rem",     // 20px
    6: "1.5rem",      // 24px
    7: "1.75rem",     // 28px
    8: "2rem",        // 32px
    9: "2.25rem",     // 36px
    10: "2.5rem",     // 40px
    11: "2.75rem",    // 44px
    12: "3rem",       // 48px
    14: "3.5rem",     // 56px
    16: "4rem",       // 64px
    20: "5rem",       // 80px
    24: "6rem",       // 96px
    28: "7rem",       // 112px
    32: "8rem",       // 128px
  },

  // ============================================
  // COMPONENT DESIGN TOKENS
  // ============================================
  components: {
    // Button variants
    button: {
      borderRadius: {
        default: "9999px",  // Fully rounded (pill)
        square: "0.5rem",   // For icon buttons
      },
      padding: {
        sm: "0.5rem 1rem",
        md: "0.75rem 1.5rem",
        lg: "1rem 2rem",
      },
      fontSize: {
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
      },
    },

    // Card variants
    card: {
      borderRadius: "1rem",           // 16px
      padding: "1.5rem",              // 24px
      shadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      shadowHover: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },

    // Input fields
    input: {
      borderRadius: "0.75rem",        // 12px
      padding: "0.75rem 1rem",
      borderColor: "#e4e4e7",
      focusBorderColor: "#0ea5e9",
      errorBorderColor: "#ef4444",
    },

    // Avatar
    avatar: {
      sizes: {
        xs: "1.5rem",   // 24px
        sm: "2rem",     // 32px
        md: "2.5rem",   // 40px
        lg: "3rem",     // 48px
        xl: "4rem",     // 64px
        "2xl": "6rem",  // 96px
      },
      statusIndicator: {
        online: "#22c55e",
        offline: "#a1a1aa",
        busy: "#ef4444",
        away: "#f59e0b",
      },
    },

    // Badge / Tag
    badge: {
      borderRadius: "9999px",
      padding: "0.25rem 0.75rem",
      fontSize: "0.75rem",
    },

    // Modal / Dialog
    modal: {
      borderRadius: "1.5rem",         // 24px
      padding: "2rem",                // 32px
      maxWidth: {
        sm: "24rem",    // 384px
        md: "32rem",    // 512px
        lg: "42rem",    // 672px
        xl: "56rem",    // 896px
      },
    },
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    glow: "0 0 20px rgb(14 165 233 / 0.3)",  // Primary color glow
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    none: "0",
    sm: "0.25rem",    // 4px
    DEFAULT: "0.5rem", // 8px
    md: "0.75rem",    // 12px
    lg: "1rem",       // 16px
    xl: "1.5rem",     // 24px
    "2xl": "2rem",    // 32px
    full: "9999px",
  },

  // ============================================
  // ANIMATION
  // ============================================
  animation: {
    // Timing functions
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    },

    // Durations
    duration: {
      instant: "0ms",
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
      slower: "700ms",
    },

    // Named animations
    keyframes: {
      fadeIn: {
        from: { opacity: "0" },
        to: { opacity: "1" },
      },
      slideUp: {
        from: { transform: "translateY(10px)", opacity: "0" },
        to: { transform: "translateY(0)", opacity: "1" },
      },
      pulse: {
        "0%, 100%": { opacity: "1" },
        "50%": { opacity: "0.5" },
      },
      bounce: {
        "0%, 100%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-10px)" },
      },
    },
  },

  // ============================================
  // BREAKPOINTS
  // ============================================
  breakpoints: {
    xs: "475px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  // ============================================
  // Z-INDEX SCALE
  // ============================================
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    toast: 1600,
  },

  // ============================================
  // DARK MODE
  // ============================================
  darkMode: {
    enabled: true,
    default: "system" as const, // "light" | "dark" | "system"
  },
} as const;

// Type exports
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeTypography = typeof theme.typography;

// Helper to get CSS variable name
export const cssVar = (path: string) => `var(--${path.replace(/\./g, "-")})`;

// Category color helper
export const getCategoryColor = (category: keyof typeof theme.colors.categories) => {
  return theme.colors.categories[category] ?? theme.colors.primary[500];
};
