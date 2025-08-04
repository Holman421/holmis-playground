<script lang="ts">
	import { onMount } from 'svelte';

	const { src, mediaType, alt, index } = $props<{
		src: string;
		mediaType: 'image' | 'video';
		alt: string;
		index: number;
	}>();

	let elementRef: HTMLDivElement;
	let isVisible = $state(false);
	let isLoaded = $state(false);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !isVisible) {
						isVisible = true;
						observer.unobserve(entry.target);
					}
				});
			},
			{
				rootMargin: '100px' 
			}
		);

		if (elementRef) {
			observer.observe(elementRef);
		}

		return () => {
			observer.disconnect();
		};
	});

	function handleLoad() {
		isLoaded = true;
	}

	function handleError() {
		console.warn(`Failed to load ${mediaType}: ${src}`);
	}
</script>

<div bind:this={elementRef} class="w-full h-full relative">
	{#if !isVisible}
		<!-- Placeholder while not in viewport -->
		<div class="w-full h-full bg-black animate-pulse rounded"></div>
	{:else if mediaType === 'video'}
		<video
			{src}
			muted
			loop
			preload="metadata"
			class="w-full h-full object-fill {isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300"
			onloadeddata={handleLoad}
			onerror={handleError}
		></video>
		{#if !isLoaded}
			<div class="absolute inset-0 bg-black rounded flex items-center justify-center">
				<div class="flex items-center">
					<div class="flex space-x-1">
						{#each Array(3) as _, i}
							<div 
								class="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
								style="animation-delay: {i * 0.15}s"
							></div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<img
			{src}
			{alt}
			class="w-full h-full object-fill {isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300"
			onload={handleLoad}
			onerror={handleError}
		/>
		{#if !isLoaded}
			<div class="absolute inset-0 bg-black rounded flex items-center justify-center">
				<div class="flex items-center">
					<div class="flex space-x-1">
						{#each Array(3) as _, i}
							<div 
								class="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
								style="animation-delay: {i * 0.15}s"
							></div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
