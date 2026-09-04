import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        md: '2rem',
        lg: '3rem',
      },
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      fontFamily: {
        // Brandbook Edition 02: three faces, three jobs.
        sans: ['var(--font-archivo)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: [
          'var(--font-jetbrains-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        // `display` is what ~35 headings already carry. It now resolves to
        // Archivo, which is what the brandbook wants for headings, so those
        // files did not have to be touched one by one.
        display: ['var(--font-archivo)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // Story Script survives here alone: wordmark and perfumer's signature.
        logo: ['var(--font-story-script)', 'Georgia', 'serif'],
      },
      fontSize: {
        // The technical scale: eyebrows and meta lines at `micro`, measured
        // values at `label`. Everything larger uses Tailwind's own steps.
        micro: ['0.625rem', { lineHeight: '1rem' }],
        label: ['0.6875rem', { lineHeight: '1rem' }],
      },
      colors: {
        // Brandbook palette. Amber has no literal name on purpose: it is only
        // ever reachable as `accent` (a fill that carries graphite text), so
        // nobody can reach for it as a text colour by accident.
        offwhite: '#F4F1EA',
        graphite: '#121212',
        gunmetal: {
          DEFAULT: '#4A4B4D', // body text weight — 7.8:1 on off-white
          light: '#8C8D91', // rules and fills only — 2.9:1, never text
        },
        hairline: '#DDD8CC',

        // ── Transition layer ────────────────────────────────────────────────
        // The storefront carries `ink` / `bone` / `brass` / `stone-*` / `amber-*`
        // across ~35 files. Rather than rewrite every className, the names are
        // repointed at brandbook values, so the whole storefront moves at once
        // and each file can be cleaned up on its own schedule.
        bone: '#F4F1EA', // was #FAF8F4 → Raw Off-White
        ink: {
          DEFAULT: '#121212', // was #1A1714 → Deep Graphite
          muted: '#4A4B4D', // was #6B6258 → Gunmetal, 7.8:1 on off-white
        },

        // `brass` was a warm accent used for eyebrows and small labels. Amber
        // measures 1.5:1 on off-white and can never carry text, so the default
        // resolves to gunmetal — which is what the brandbook specifies for
        // those labels anyway. Only the light steps stay amber; they are used
        // on dark panels, where amber clears 11:1.
        brass: {
          DEFAULT: '#4A4B4D',
          50: '#F4F1EA',
          100: '#EAE3D6',
          200: '#D9C3A5',
          300: '#D9C3A5',
          400: '#8C8D91',
          500: '#4A4B4D',
          600: '#3C3D3F',
          700: '#2C2D2E',
          800: '#1F1F20',
          900: '#121212',
        },

        // Tailwind's warm greys, replaced by the single off-white → graphite
        // ramp. Every borrowed `stone-200` border becomes the hairline.
        stone: {
          50: '#F4F1EA',
          100: '#EEEAE0',
          200: '#DDD8CC', // hairline
          300: '#C9C4B8',
          400: '#8C8D91',
          500: '#6E6F72',
          600: '#4A4B4D',
          700: '#3A3B3C',
          800: '#262627',
          900: '#121212',
          950: '#0A0A0A',
        },

        // Amber is reachable ONLY as `accent` (a fill carrying graphite text).
        // Collapsing Tailwind's amber onto the neutral ramp is how "one amber
        // block per page" stops depending on everyone remembering the rule.
        amber: {
          50: '#F4F1EA',
          100: '#EEEAE0',
          200: '#DDD8CC',
          300: '#C9C4B8',
          400: '#8C8D91',
          500: '#6E6F72',
          600: '#4A4B4D',
          700: '#3A3B3C',
          800: '#4A4B4D',
          900: '#262627',
          950: '#121212',
        },
        // shadcn semantic tokens (driven by CSS vars)
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
      // Nothing in this system is rounded — not a chip, not a button, not the
      // cart badge. Collapsing every step (including `full`) is what stops a
      // stray `rounded-xl` from reintroducing the old look; the rule holds
      // without anyone having to remember it.
      // Nothing is raised off the page either. The only separator is a 1 px
      // hairline. Same reasoning as borderRadius: enforce it in the config so a
      // stray `shadow-md` cannot quietly undo it.
      boxShadow: {
        none: 'none',
        xs: 'none',
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [animate],
};

export default config;
