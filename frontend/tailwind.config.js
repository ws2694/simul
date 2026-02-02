/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'Quicksand', 'Poppins', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Nunito', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Game UI Pastel Colors
        lavender: {
          DEFAULT: '#c4b5e0',
          light: '#e8e0f0',
          dark: '#9b8ac4',
        },
        mint: {
          DEFAULT: '#a8d5ba',
          light: '#d4ede0',
        },
        peach: '#f5d0c5',
        cream: '#faf8f5',
        'soft-pink': '#f0c6d4',
        'soft-blue': '#b8d4e8',
        'soft-yellow': '#f5e6b8',
        'cosmic-purple': '#9b7ed4',
        'cosmic-pink': '#e491b3',
        'game-text': {
          dark: '#5a5470',
          light: '#8a8498',
        },
        // Domain colors for knowledge graph clusters
        domain: {
          backend: '#a8d5ba',
          frontend: '#c4b5e0',
          database: '#b8d4e8',
          security: '#f5d0c5',
          devops: '#f5e6b8',
          api: '#87ceeb',
          architecture: '#dda0dd',
          testing: '#98d8c8',
        },
        // Indigo primary scale
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'thinking-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'waveform': {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
        },
        // Game UI animations
        'rec-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
        'wave': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'dash-flow': {
          '0%': { strokeDashoffset: '10' },
          '100%': { strokeDashoffset: '0' },
        },
        'panel-spring': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '70%': { transform: 'scale(1.02) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(196, 181, 224, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(196, 181, 224, 0.7)' },
        },
        'hotspot-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.2)', opacity: '0.4' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'thinking-dot': 'thinking-dot 1.4s infinite ease-in-out both',
        'progress-fill': 'progress-fill 0.5s ease-out forwards',
        'waveform': 'waveform 0.5s ease-in-out infinite',
        'count-up': 'count-up 0.5s ease-out forwards',
        'glow': 'glow 2s ease-in-out infinite',
        // Game UI animations
        'rec-pulse': 'rec-pulse 1.5s ease-in-out infinite',
        'wave': 'wave 2s ease-in-out infinite',
        'dash-flow': 'dash-flow 0.5s linear infinite',
        'panel-spring': 'panel-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'hotspot-pulse': 'hotspot-pulse 2s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
        'card-hover': '0 20px 40px -12px rgba(0, 0, 0, 0.15)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
        // Game UI shadows
        'game-panel': '0 25px 50px -12px rgba(90, 84, 112, 0.25)',
        'game-card': '0 4px 20px rgba(90, 84, 112, 0.08)',
        'game-hover': '0 8px 30px rgba(90, 84, 112, 0.12)',
        'cluster-glow': '0 0 30px rgba(196, 181, 224, 0.5)',
        'hotspot': '0 0 15px rgba(196, 181, 224, 0.6)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
