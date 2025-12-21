import type { Config } from 'tailwindcss'

export default {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#06f906',
                'background-light': '#f5f8f5',
                'background-dark': '#0f230f',
                'surface-dark': '#162e16',
                'surface-highlight': '#214a21',
                'text-secondary': '#8ecc8e',
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
