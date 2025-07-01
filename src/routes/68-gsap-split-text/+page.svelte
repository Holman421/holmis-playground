<script>
	import { gsap } from 'gsap';
	import { onMount } from 'svelte';
	import { SplitText } from 'gsap/SplitText';

	gsap.registerPlugin(SplitText);

	let nameElement;
	let currentName = 'Aleš';
	let mySplitText;

	function handleMouseEnter(event) {
		const newName = event.target.getAttribute('data-name');
		if (newName !== currentName) {
			currentName = newName;
			nameElement.innerText = newName;
		}
	}
	$effect(() => {});
</script>

<div class="size-full min-h-[calc(100vh-56px)] flex flex-col justify-center items-center gap-20">
	<div class="flex items-center gap-2">
		<img
			src="/pictures/team-members/ales.jpg"
			alt="bro"
			class="size-28 rounded-xl transition-all hover:size-40 cursor-pointer"
			data-name="Aleš"
			onmouseenter={handleMouseEnter}
		/>
		<img
			src="/pictures/team-members/krystof.png"
			alt="bro"
			class="size-28 rounded-xl transition-all hover:size-40 cursor-pointer"
			data-name="Gabe"
			onmouseenter={handleMouseEnter}
		/>
		<img
			src="/pictures/team-members/gabe.jpg"
			alt="bro"
			class="size-28 rounded-xl transition-all hover:size-40 cursor-pointer"
			data-name="Kryštof"
			onmouseenter={handleMouseEnter}
		/>
		<img
			src="/pictures/team-members/lukas.jpg"
			alt="bro"
			class="size-28 rounded-xl transition-all hover:size-40 cursor-pointer"
			data-name="Lukáš"
			onmouseenter={handleMouseEnter}
		/>
		<img
			src="/pictures/team-members/vojta.jpg"
			alt="bro"
			class="size-28 rounded-xl transition-all hover:size-40 cursor-pointer"
			data-name="Vojta"
			onmouseenter={handleMouseEnter}
		/>
		<img
			src="/pictures/team-members/filip.jpg"
			alt="bro"
			class="size-28 rounded-xl transition-all hover:size-40 cursor-pointer"
			data-name="Filip"
			onmouseenter={handleMouseEnter}
		/>
	</div>
	<div class="flex overflow-hidden">
		<h2
			bind:this={nameElement}
			class="text-9xl uppercase whitespace-nowrap overflow-visible boldonse absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[150%] transition-all duration-500 ease-in-out"
		>
			Aleš
		</h2>
		<h2
			bind:this={nameElement}
			class="text-9xl uppercase whitespace-nowrap overflow-visible boldonse absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[150%] transition-all duration-500 ease-in-out"
		>
			Aleš
		</h2>
	</div>
</div>

<style>
	.char {
		display: inline-block !important;
		position: relative !important;
		transform-origin: center bottom;
		will-change: transform, opacity;
		white-space: nowrap;
		float: none !important;
	}
</style>
