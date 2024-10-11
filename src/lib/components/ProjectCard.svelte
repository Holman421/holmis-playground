<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import Badge from './ui/badge/badge.svelte';
	import Button from './ui/button/button.svelte';
	import Card from './ui/card/card.svelte';

	const { title, description, href, technologies } = $props<{
		title: string;
		description: string;
		href: string;
		technologies: string[];
	}>();

	// onMount(() => {
	// 	const tl = gsap.timeline({ ease: 'power4.out', defaults: { duration: 1 } });

	// 	tl.to('#projectCard', {
	// 		background: 'linear-gradient(135deg, rgba(0, 235, 39, 0) 0%, rgba(100, 100, 100, 1) 0%)'
	// 	});
	// });
</script>

<a {href} class="h-full">
	<div id="cardBorderEffect">
		<div id="cardGooEffect">
			<div id="projectCard" class="px-6 pt-5 pb-6 max-w-[400px] bg-white relative h-fit">
				<div class="font-bold text-xl">{title}</div>
				<div>
					<p class="text-gray-700 text-base mt-4">{description}</p>
				</div>
				<div class="flex gap-2 mt-4 flex-wrap">
					{#each technologies as technology}
						<div class="border rounded-full px-3 border-black">{technology}</div>
					{/each}
				</div>
				<div></div>
			</div>
		</div>
	</div>
</a>

<style>
	#projectCard {
		clip-path: polygon(
			0 1.5rem,
			1rem 0.5rem,
			3rem 0.5rem,
			3.5rem 0,
			6.5rem 0,
			7rem 0.5rem,
			calc(100% - 1rem) 0.5rem,
			100% 1.5rem,
			100% calc(100% - 5rem),
			calc(100% - 0.5rem) calc(100% - 4.5rem),
			calc(100% - 0.5rem) calc(100% - 2.5rem),
			100% calc(100% - 2rem),
			100% calc(100% - 0.5rem),
			3rem calc(100% - 0.5rem),
			2.5rem 100%,
			0.5rem 100%,
			0 calc(100% - 0.5rem)
		);
		/* background: linear-gradient(135deg, rgba(0, 235, 39, 0) 0%, rgba(100, 100, 100, 0) 100%); */
		background: linear-gradient(135deg, rgba(0, 235, 39, 1) 0%, rgb(34, 88, 158) 100%);
	}

	#cardBorderEffect {
		filter: url('#borderSVG');
		overflow: hidden;
	}

	#cardGooEffect {
		filter: url('#goo');
	}
</style>
