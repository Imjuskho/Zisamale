/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Canvas & Surfaces ──
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        'surface-elevated': '#FFFFFF',

        // ── Borders ──
        border: '#E2E8F0',
        'border-strong': '#CBD5E1',

        // ── Text ──
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'text-tertiary': '#94A3B8',

        // ── Brand ──
        'brand-primary': '#0D9488',
        'brand-primary-hover': '#0F766E',
        'brand-primary-active': '#115E59',
        'brand-secondary': '#0EA5E9',
        'brand-secondary-hover': '#0284C7',

        // ── Semantic ──
        success: '#10B981',
        'success-soft': '#ECFDF5',
        warning: '#F59E0B',
        'warning-soft': '#FFFBEB',
        danger: '#EF4444',
        'danger-soft': '#FEF2F2',
        info: '#0EA5E9',
        'info-soft': '#F0F9FF',

        // ── Chart ──
        'chart-predicted': '#0EA5E9',
        'chart-recommended': '#0D9488',
        'chart-actual': '#0F172A',
        'chart-confidence': 'rgba(14, 165, 233, 0.20)',
        'chart-grid': '#F1F5F9',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        'display': ['30px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'label': ['11px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.05em' }],
        'data': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'data-sm': ['20px', { lineHeight: '1.2', fontWeight: '700' }],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },

      borderRadius: {
        'card': '12px',
        'button': '10px',
        'input': '8px',
        'badge': '9999px',
      },

      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        'card-hover': '0 4px 6px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.02)',
        'elevated': '0 10px 15px rgba(15, 23, 42, 0.04), 0 4px 6px rgba(15, 23, 42, 0.02)',
        'focus': '0 0 0 3px rgba(13, 148, 136, 0.20)',
      },

      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px',
      },

      transitionTimingFunction: {
        'ui': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
    },
  },
  plugins: [],
}
