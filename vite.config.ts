import glsl from 'vite-plugin-glsl';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		target: 'esnext', // Ensures the build output supports modern JavaScript
		outDir: 'dist', // The output directory for your build files
		rollupOptions: {
			output: {
				format: 'cjs' // Ensure CommonJS format for compatibility with serverless functions
			}
		}
	},
	optimizeDeps: {
		include: ['three-custom-shader-material']
	},
	ssr: {
		noExternal: ['three-custom-shader-material']
	},
	plugins: [sveltekit(), glsl()]
});
