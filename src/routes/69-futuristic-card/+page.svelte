<script lang="ts">
	import { gsap } from 'gsap';
	import { SplitText } from 'gsap/SplitText';
	import { onMount } from 'svelte';
	
	gsap.registerPlugin(SplitText);
		let containerRef: HTMLDivElement;
	let splitText1: SplitText;
	let splitText2: SplitText;
	let splitText3: SplitText;
	
	onMount(() => {
		// Initialize SplitText for all text elements
		splitText1 = new SplitText('.split-text-1', { type: 'chars' });
		splitText2 = new SplitText('.split-text-2', { type: 'chars' });
		splitText3 = new SplitText('.split-text-3', { type: 'chars' });
		
		// Set initial opacity to 0 for all characters
		gsap.set([splitText1.chars, splitText2.chars, splitText3.chars], { opacity: 0 });
				// Add hover listeners
		const card = containerRef.querySelector('.card-hover-target');
				card?.addEventListener('mouseenter', () => {
			// Kill any existing animations
			gsap.killTweensOf([splitText1.chars, splitText2.chars, splitText3.chars]);
			
			// Create new timeline for each hover
			const tl = gsap.timeline();
			
			// Animate each set of characters with instant opacity change (no fade)
			tl.to(splitText1.chars, {
				opacity: 1,
				duration: 0,
				ease: 'none',
				stagger: {
					amount: 0.4,
					from: 'random'
				}
			}, 0)
			.to(splitText2.chars, {
				opacity: 1,
				duration: 0,
				ease: 'none',
				stagger: {
					amount: 0.4,
					from: 'random'
				}
			}, 0.1)
			.to(splitText3.chars, {
				opacity: 1,
				duration: 0,
				ease: 'none',
				stagger: {
					amount: 0.4,
					from: 'random'
				}
			}, 0.2);
		});
		
		card?.addEventListener('mouseleave', () => {
			// Kill any existing animations
			gsap.killTweensOf([splitText1.chars, splitText2.chars, splitText3.chars]);
			
			// Reset all characters to opacity 0 instantly for next hover
			gsap.set([splitText1.chars, splitText2.chars, splitText3.chars], { opacity: 0 });
		});
	});
</script>

<div bind:this={containerRef} id="container" class="w-screen h-[calc(100vh-56px)] flex items-center justify-center">
	<div class="cursor-pointer group card-hover-target size-[300px] overflow-hidden relative">
		<img
			src="/pictures/universe/universe-4.jpg"
			alt="Futuristic Card"
			class="size-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[85%]"
		/>
		<div
			class="absolute inset-0 bg-black opacity-0 transition-opacity duration-[400ms] ease-out group-hover:opacity-10"
		></div>
		<div class="h-1/2 w-full bottom-0 absolute flex gap-3 p-3">
			<div
				class="card-clip-path-left flex flex-col justify-between px-3 py-2 flex-1 opacity-0 group-hover:opacity-100 transition-all duration-[400ms] ease-out -translate-x-[100%] translate-y-[100%] group-hover:translate-y-[0px] group-hover:translate-x-[0px] backdrop-filter backdrop-blur-sm bg-opacity-15 bg-gray-300"
			>
				<p class="font-audiowide text-[3rem]/[90%] split-text-1">02</p>
				<p class="font-audiowide text-[0.75rem] split-text-2">#galaxy</p>
			</div>
			<div
				class="card-clip-path-right flex flex-col justify-end items-end p-3 flex-1 opacity-0 group-hover:opacity-100 transition-all duration-[400ms] ease-out translate-x-[100%] translate-y-[100%] group-hover:translate-y-[0px] group-hover:translate-x-[0px] backdrop-filter backdrop-blur-sm bg-opacity-15 bg-gray-300"
			>
				<p class="font-audiowide text-[1.125rem] split-text-3">Adromeda</p>
			</div>
		</div>
	</div>
</div>

<style>
	.card-clip-path-left {
		clip-path: polygon(0% 15%, 15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%);
	}

	.card-clip-path-right {
		clip-path: polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 15% 100%, 0% 85%);
	}
</style>
