import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config = {
  darkMode: ['class'],
  content: ['./components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        tondo: ['var(--font-tondo)', ...fontFamily.sans],
        'rooney-sans': ['var(--font-rooney-sans)', ...fontFamily.sans],
      },
      colors: {
        // Semantic tokens (shadcn/ui compatible)
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

        // =====================================================================
        // CRAYON PALETTE - Our unique brand colors
        // =====================================================================

        // Primary - Sunset Orange
        crayon: {
          orange: {
            DEFAULT: 'hsl(var(--crayon-orange))',
            light: 'hsl(var(--crayon-orange-light))',
            dark: 'hsl(var(--crayon-orange-dark))',
          },
          // Secondary - Ocean Teal
          teal: {
            DEFAULT: 'hsl(var(--crayon-teal))',
            light: 'hsl(var(--crayon-teal-light))',
            dark: 'hsl(var(--crayon-teal-dark))',
          },
          // Accent - Bubblegum Pink
          pink: {
            DEFAULT: 'hsl(var(--crayon-pink))',
            light: 'hsl(var(--crayon-pink-light))',
            dark: 'hsl(var(--crayon-pink-dark))',
          },
          // Highlight - Sunshine Yellow
          yellow: {
            DEFAULT: 'hsl(var(--crayon-yellow))',
            light: 'hsl(var(--crayon-yellow-light))',
            dark: 'hsl(var(--crayon-yellow-dark))',
          },
          // Success - Meadow Green
          green: {
            DEFAULT: 'hsl(var(--crayon-green))',
            light: 'hsl(var(--crayon-green-light))',
            dark: 'hsl(var(--crayon-green-dark))',
          },
          // Creative - Grape Purple
          purple: {
            DEFAULT: 'hsl(var(--crayon-purple))',
            light: 'hsl(var(--crayon-purple-light))',
            dark: 'hsl(var(--crayon-purple-dark))',
          },
          // Sky Blue - For backgrounds
          sky: {
            DEFAULT: 'hsl(var(--crayon-sky))',
            light: 'hsl(var(--crayon-sky-light))',
            dark: 'hsl(var(--crayon-sky-dark))',
          },
        },

        // Text colors
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          muted: 'hsl(var(--text-muted))',
          inverted: 'hsl(var(--text-inverted))',
        },

        // Background colors
        paper: {
          cream: 'hsl(var(--bg-cream))',
          'cream-dark': 'hsl(var(--bg-cream-dark))',
          lavender: 'hsl(var(--bg-lavender))',
          white: 'hsl(var(--bg-white))',
        },

        // Legacy support - now uses CSS variable for consistency
        orange: 'hsl(var(--crayon-orange))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-lg)',
        '2xl': 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
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
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 hsl(var(--crayon-orange) / 0.4)',
          },
          '50%': {
            boxShadow: '0 0 20px 10px hsl(var(--crayon-orange) / 0)',
          },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        wiggle: 'wiggle 0.5s ease-in-out',
        float: 'float 3s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        shake: 'shake 0.5s ease-in-out',
      },
      boxShadow: {
        // Legacy shadow (keeping for backwards compatibility)
        perfect:
          '0 24px 24px -12px rgba(14, 63, 126, 0.04), 0 12px 12px -6px rgba(14, 63, 126, 0.04), 0 6px 6px -3px rgba(42, 51, 70, 0.04), 0 3px 3px -1.5px rgba(42, 51, 70, 0.04), 0 1px 1px -0.5px rgba(42, 51, 70, 0.04), 0 4px 4px 1px rgba(14, 63, 126, 0.04)',
        // New crayon shadows with brand color tint
        crayon:
          '0 4px 6px -1px hsl(var(--crayon-orange) / 0.1), 0 2px 4px -2px hsl(var(--crayon-orange) / 0.1)',
        'crayon-lg':
          '0 10px 15px -3px hsl(var(--crayon-orange) / 0.1), 0 4px 6px -4px hsl(var(--crayon-orange) / 0.1)',
        'crayon-xl':
          '0 20px 25px -5px hsl(var(--crayon-orange) / 0.1), 0 8px 10px -6px hsl(var(--crayon-orange) / 0.1)',
        // Soft inner glow for inputs
        'inner-glow': 'inset 0 2px 4px 0 hsl(var(--crayon-orange) / 0.06)',
        // Card shadow
        card: '0 4px 6px -1px hsl(var(--crayon-orange) / 0.08), 0 2px 4px -2px hsl(var(--crayon-orange) / 0.06), 0 0 0 1px hsl(var(--border))',
        'card-hover':
          '0 10px 15px -3px hsl(var(--crayon-orange) / 0.12), 0 4px 6px -4px hsl(var(--crayon-orange) / 0.08), 0 0 0 1px hsl(var(--border))',
        // Button shadows
        'btn-primary':
          '0 4px 14px 0 hsl(var(--crayon-orange) / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.2)',
        'btn-primary-hover':
          '0 6px 20px 0 hsl(var(--crayon-orange) / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25)',
        'btn-secondary':
          '0 4px 14px 0 hsl(var(--crayon-teal) / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.2)',
        'btn-secondary-hover':
          '0 6px 20px 0 hsl(var(--crayon-teal) / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25)',
      },
      backgroundImage: {
        // Gradient backgrounds
        'paper-gradient':
          'linear-gradient(135deg, hsl(var(--bg-cream)) 0%, hsl(var(--bg-cream-dark)) 100%)',
        'paper-lavender':
          'linear-gradient(135deg, hsl(var(--bg-lavender)) 0%, hsl(270 60% 95%) 100%)',
        // Button gradients
        'btn-orange':
          'linear-gradient(135deg, hsl(var(--crayon-orange)) 0%, hsl(var(--crayon-orange-dark)) 100%)',
        'btn-teal':
          'linear-gradient(135deg, hsl(var(--crayon-teal)) 0%, hsl(var(--crayon-teal-dark)) 100%)',
        'btn-pink':
          'linear-gradient(135deg, hsl(var(--crayon-pink)) 0%, hsl(var(--crayon-pink-dark)) 100%)',
        // Text gradients
        'text-rainbow':
          'linear-gradient(90deg, hsl(var(--crayon-orange)) 0%, hsl(var(--crayon-pink)) 33%, hsl(var(--crayon-purple)) 66%, hsl(var(--crayon-teal)) 100%)',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
