import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// Design System Tokens — Zero Trust Security Platform
// Inspired by: CrowdStrike, Microsoft Defender, IBM QRadar

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ─── COLOR SYSTEM ──────────────────────────────────────
      colors: {
        // Brand — Cyber Blue
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Cyber Cyan — accent
        cyber: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Threat severity colors
        threat: {
          low:      '#22c55e',  // green
          medium:   '#f59e0b',  // amber
          high:     '#ef4444',  // red
          critical: '#a855f7',  // purple
        },
        // Dark UI surfaces
        surface: {
          base:     '#0a0f1e',  // deepest background
          elevated: '#0f172a',  // sidebar, cards
          overlay:  '#1e293b',  // modals, dropdowns
          border:   '#1e293b',  // dividers
          hover:    '#1e3a5f',  // hover states
        },
        // Status indicators
        status: {
          online:   '#22c55e',
          idle:     '#f59e0b',
          offline:  '#64748b',
          blocked:  '#ef4444',
        },
      },

      // ─── BACKGROUND GRADIENTS ──────────────────────────────
      backgroundImage: {
        'gradient-cyber':     'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a1628 100%)',
        'gradient-brand':     'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
        'gradient-danger':    'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
        'gradient-success':   'linear-gradient(135deg, #14532d 0%, #052e16 100%)',
        'gradient-card':      'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)',
        'glow-brand':         'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        'glow-cyan':          'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
        'glow-danger':        'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
      },

      // ─── TYPOGRAPHY ────────────────────────────────────────
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // ─── BORDER RADIUS ─────────────────────────────────────
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // ─── GLASSMORPHISM BLUR ────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },

      // ─── BOX SHADOWS (glow effects) ─────────────────────────
      boxShadow: {
        'glow-brand':    '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.1)',
        'glow-cyan':     '0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.1)',
        'glow-danger':   '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.1)',
        'glow-success':  '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.1)',
        'glow-warning':  '0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(245, 158, 11, 0.1)',
        'card':          '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover':    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        'inner-glow':    'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },

      // ─── ANIMATIONS ────────────────────────────────────────
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'count-up': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'threat-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.05)', opacity: '0.8' },
        },
        'rotate-slow': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-glow':     'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line':      'scan-line 3s linear infinite',
        'fade-in':        'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        shimmer:          'shimmer 2s linear infinite',
        'threat-pulse':   'threat-pulse 2s ease-in-out infinite',
        'rotate-slow':    'rotate-slow 10s linear infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
