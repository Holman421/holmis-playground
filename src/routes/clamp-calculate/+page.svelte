<script lang="ts">
	import { onMount } from 'svelte';

	let minValue = $state(16);
	let maxValue = $state(24);
	let screenWidth = $state(0);
	let divWidth = $state(0);
	let divElement: HTMLDivElement;

	// Fixed screen sizes
	const minWidth = 1280;
	const maxWidth = 1920;

	function getClampString() {
		const pixelDiff = maxValue - minValue;
		const widthDiff = maxWidth - minWidth;
		const vw = (pixelDiff / widthDiff) * 100;
		return `clamp(${minValue}px,${vw.toFixed(4)}vw,${maxValue}px)`;
	}

	// Update measurements when component mounts
	onMount(() => {
		// Initial values
		screenWidth = window.innerWidth;
		if (divElement) {
			divWidth = divElement.clientWidth;
		}

		// Setup resize observer for the div
		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				divWidth = entry.contentRect.width;
			}
		});

		if (divElement) {
			resizeObserver.observe(divElement);
		}

		// Handle window resize
		const handleResize = () => {
			screenWidth = window.innerWidth;
		};
		window.addEventListener('resize', handleResize);

		// Cleanup
		return () => {
			window.removeEventListener('resize', handleResize);
			if (divElement) {
				resizeObserver.unobserve(divElement);
			}
		};
	});

	// Update div width when the element reference changes
	$effect(() => {
		if (divElement) {
			divWidth = divElement.clientWidth;
		}
	});
</script>

<div class="bg-white p-6 rounded-lg shadow-lg max-w-xl mx-auto mt-10">
	<div class="space-y-4">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-gray-700 mb-2">Min (px)</label>
				<input
					type="number"
					bind:value={minValue}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label class="block text-gray-700 mb-2">Max (px)</label>
				<input
					type="number"
					bind:value={maxValue}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div class="mt-4">
			<code class="block p-3 bg-gray-50 rounded border border-gray-200 text-sm font-mono">
				{getClampString()}
			</code>
		</div>
	</div>
</div>

<div class="mt-10 mx-auto">
	<div class="h-4 bg-red-500" bind:this={divElement} style:width={getClampString()}></div>
	<div class="mt-4 text-gray-700 space-y-2">
		<p class="text-white">Current screen width: {screenWidth}px</p>
		<p class="text-white">Current div width: {divWidth.toFixed(3)}px</p>
	</div>
</div>
