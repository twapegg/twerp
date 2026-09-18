/** @type {import('tailwindcss').Config} */

// Every colour is a CSS variable holding a space-separated RGB triplet
// (see :root in src/index.css). Light and dark themes swap the variables;
// components never need to know which theme is active.
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Text
        ink: rgb('--c-ink'),
        muted: rgb('--c-muted'),
        faint: 'rgb(var(--c-muted) / 0.6)',
        // Subtle fills that flip with the theme (dark on light, light on dark)
        paper: 'rgb(var(--c-ink) / 0.04)',
        surface: 'rgb(var(--c-ink) / 0.07)',
        line: rgb('--c-ink'),
        // Navy accent. `blue` is the solid fill for primary buttons; `pine` is
        // the accent used for text, icons and active states (lighter in dark
        // mode so it stays readable).
        blue: {
          DEFAULT: rgb('--c-accent-solid'),
          light: 'rgb(var(--c-accent) / 0.16)',
        },
        pine: {
          DEFAULT: rgb('--c-accent'),
          light: 'rgb(var(--c-accent) / 0.14)',
        },
        // Semantic
        mint: {
          DEFAULT: rgb('--c-positive'),
          light: 'rgb(var(--c-positive) / 0.14)',
        },
        rust: {
          DEFAULT: rgb('--c-negative'),
          light: 'rgb(var(--c-negative) / 0.14)',
        },
        onaccent: '#FFFFFF',
        // Chart marks
        chart: {
          cyan: rgb('--c-chart-blue'),
          rose: rgb('--c-negative'),
          amber: rgb('--c-amber'),
          violet: rgb('--c-chart-violet'),
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        tile: '36px',
        'tile-sm': '26px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
