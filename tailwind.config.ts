import type { Config } from 'tailwindcss'

export default {
    content: [],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#3b82f6',
                'primary-hover': '#60a5fa',
                'primary-dark': '#1d4ed8',
                'background-light': '#f8fafc',
                'background-dark': '#0a0a0f',
                'surface-dark': '#12121a',
                'surface-highlight': '#1e1e2e',
                'text-secondary': '#64748b',
                'accent': '#0ea5e9',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
                mono: [
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'Monaco',
                    'Consolas',
                    'Liberation Mono',
                    'Courier New',
                    'monospace'
                ]
            },
            borderRadius: {
                DEFAULT: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
                '2xl': '1rem',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
                    '100%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
                },
            },
        },
    },
    plugins: [],
} satisfies Config
