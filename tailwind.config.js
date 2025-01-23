import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ['class'],
	content: ['./src/**/*.{html,js,svelte,ts}'],
	safelist: ['dark'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {},
			borderRadius: {},
			fontFamily: {
				sans: [...fontFamily.sans],
				audiowide: ['Audiowide', 'cursive'],
				cinzel: ['Cinzel', 'serif']
			},
			animation: {
				'fade-in': 'fadeIn 2s ease-in forwards 1s'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				}
			}
		}
	},
	plugins: [require('tailwindcss-motion')]
};

export default config;
