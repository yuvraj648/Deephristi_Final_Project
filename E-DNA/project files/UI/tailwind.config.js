/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--paper)',
          raised: 'var(--paper-raised)',
          sunk: 'var(--paper-sunk)',
        },
        rule: {
          DEFAULT: 'var(--rule)',
          strong: 'var(--rule-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        survey: {
          DEFAULT: 'var(--survey)',
          hover: 'var(--survey-hover)',
          tint: 'var(--survey-tint)',
        },
        abyss: {
          950: 'var(--abyss-950)',
          900: 'var(--abyss-900)',
          800: 'var(--abyss-800)',
          line: 'var(--abyss-line)',
          text: 'var(--abyss-text)',
          accent: 'var(--abyss-accent)',
        },
        biological: 'var(--biological)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        aubergine: 'var(--aubergine)',
      },
      fontFamily: {
        serif: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        plate: '4px',
        control: '2px',
      },
      boxShadow: {
        floating: '0 8px 24px rgba(20, 34, 43, 0.12)',
        'floating-dark': '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
