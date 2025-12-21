import type { Config } from 'tailwindcss'

export default {
    content: [],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#a0a0a0',
                'primary-hover': '#c0c0c0',
                'background-light': '#f5f5f5',
                'background-dark': '#0d0d0d',
                'surface-dark': '#1a1a1a',
                'surface-highlight': '#2a2a2a',
                'text-secondary': '#8a8a8a',
                'accent': '#6b7280',
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
        },
    },
    plugins: [],
} satisfies Config
