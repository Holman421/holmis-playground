<script lang="ts">
	import { pageTransitionStore } from '$lib/stores/pageTransition.svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let { children } = $props();
</script>

{#if !$pageTransitionStore.isTransitioning}
	<div in:fade={{ duration: 300, easing: quintOut }}>
		{@render children?.()}
	</div>
{:else if $pageTransitionStore.direction === "in"}
	<div out:fade={{ duration: 300, easing: quintOut }}>
		{@render children?.()}
	</div>
{/if}

<!-- Loading overlay during transition -->
{#if $pageTransitionStore.isTransitioning}
	<div 
		class="fixed inset-0 bg-black z-50 flex items-center justify-center"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 150 }}
	>
		<div class="flex space-x-2">
			{#each Array(3) as _, i}
				<div 
					class="w-2 h-2 bg-white rounded-full animate-bounce"
					style="animation-delay: {i * 0.15}s"
				></div>
			{/each}
		</div>
	</div>
{/if}
