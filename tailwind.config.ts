import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
				mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
			},
			fontSize: {
				'2xs': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '-0.3px' }],
				xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '-0.36px' }],
				sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.42px' }],
				base: ['1rem', { lineHeight: '1.6', letterSpacing: '-0.48px' }],
				lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.72px' }],
				xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.8px' }],
				'2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-1.04px' }],
				'3xl': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-1.2px' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-1.44px' }],
				'5xl': ['3rem', { letterSpacing: '-1.6px' }],
				'6xl': ['3.75rem', { letterSpacing: '-1.8px' }],
			},
			letterSpacing: {
				tighter: '-0.58px',
				tight: '-0.48px',
				normal: '-0.24px',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				'soft': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 4px 0 rgb(0 0 0 / 0.04)',
				'elevated': '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 4px 12px -4px rgb(0 0 0 / 0.06)',
				'neon': '0 0 2px 2px var(--tw-shadow), 0 0 6px 3px var(--tw-ring-offset-shadow), 0 0 8px 4px var(--tw-ring-shadow)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				'scale-in': {
					from: { opacity: '0', transform: 'scale(0.95)' },
					to: { opacity: '1', transform: 'scale(1)' }
				},
				'slide-up': {
					from: { opacity: '0', transform: 'translateY(8px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-down': {
					from: { height: '0px' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'pulse-soft': {
					'50%': { opacity: '0.6' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 200ms ease',
				'fade-out': 'fade-out 200ms ease',
				'scale-in': 'scale-in 200ms ease',
				'slide-up': 'slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-down': 'slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1)',
				'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
