import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#E5E5E5',
        surface: '#FFFFFF',
        'surface-muted': '#EFEFEF',
        primary: '#0D0D0D',
        accent: '#314344',
        'accent-teal': '#317e6a',
        'accent-purple': '#69419d',
        text: '#000000',
        'text-muted': '#3e424d',
        'text-nav': '#4d4d4d',
        muted: '#6B7280',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: {
        display: ['var(--font-golos-text)', 'sans-serif'],
        body: ['var(--font-golos-text)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        sans: ['var(--font-golos-text)', 'sans-serif'],
        superground: ['var(--font-super-ground)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glow-primary': 'radial-gradient(ellipse at center, rgba(108,99,255,0.12) 0%, transparent 70%)',
        'glow-accent': 'radial-gradient(ellipse at center, rgba(0,153,170,0.10) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-primary': '0 0 24px rgba(108,99,255,0.25), 0 0 60px rgba(108,99,255,0.08)',
        'glow-accent': '0 0 24px rgba(0,153,170,0.25), 0 0 60px rgba(0,153,170,0.08)',
        'glow-sm': '0 0 12px rgba(108,99,255,0.2)',
        card: '0 2px 16px rgba(108,99,255,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 32px rgba(108,99,255,0.14), 0 2px 8px rgba(0,0,0,0.06)',
      },
      animation: {
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
