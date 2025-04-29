<script lang="ts">
	import { onMount } from 'svelte';
	import Sketch from './app.js';
	let container: HTMLElement;
	let sketch: any;

	onMount(() => {
		sketch = new Sketch({
			dom: container
		});

		return () => {
			sketch?.stop();
		};
	});
</script>

<div bind:this={container} class="w-screen h-[calc(100vh-56px)]"></div>

<style>
	div {
		touch-action: none;
	}
</style>
