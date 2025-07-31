<script lang="ts">
	import '../app.css';
	import { getCounterState, setCounterState } from '../stores/store.svelte';
	import Lenis from '@studio-freight/lenis';
	import { lenisStore } from '$lib/stores/lenis';
	import { onMount } from 'svelte';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	injectSpeedInsights();
	injectAnalytics();

	setCounterState();

	let { children } = $props();

	$effect(() => {
		getCounterState().restoreFromLocalStorage();
	});

	onMount(() => {
		const lenis = new Lenis({
			duration: 1.2,
			easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			touchMultiplier: 2
		});

		lenisStore.set(lenis);

		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}

		requestAnimationFrame(raf);

		const tweakPaneContainer = document.querySelector(
			'.tp-dfwv'
		) as HTMLElement;
		if (tweakPaneContainer) {
			tweakPaneContainer.style.zIndex = '9999';
		}

		return () => {
			lenis.destroy();
			lenisStore.set(null);
		};
	});
</script>

<div class="w-full min-h-screen flex flex-col overflow-hidden">
	<nav
		class="h-[56px] flex justify-center items-center z-[1] bg-black relative border-[#a6a8b1] border-b"
	>
		<a href="/">
			<h1 class="font-bold text-2xl font-audiowide">Holmis Playground</h1>
		</a>
	</nav>
	<div>
		{@render children?.()}
	</div>

	<!-- <slot class="flex-1" /> -->
</div>

<style>
</style>
