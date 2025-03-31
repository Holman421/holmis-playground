<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import GUI from 'lil-gui';
</script>

<div class="flex-1 relative bg-black">
	<div class="card_wrapper">
		<div class="card">
			<div class="card-image-with-svg-mask"></div>
			<h1
				class="uppercase absolute top-0 left-1/2 pb-5 -translate-x-1/2 rounded-2xl bg-blue-800 font-bold text-3xl px-[3.25rem] py-4"
			>
				Earth
			</h1>
			<p
				class="absolute top-1/2 -translate-y-1/2 left-8 w-[18.5rem] font-mono bg-black/20 p-4 rounded-3xl"
			>
				Earth, our remarkable blue planet, orbits the Sun at an average distance of 93 million
				miles. As the only known world to harbor life, it completes one rotation on its axis every
				24 hours while performing its yearly dance around our star.
			</p>
			<p class="absolute right-0 bg-cyan-950 rounded-2xl bottom-0 w-[18.25rem] h-[8rem] pl-5 pt-3">
				Did you know that Earth is not perfectly spherical? It's actually slightly flattened at the
				poles at the equator due to its rotation!
			</p>
		</div>
	</div>
</div>

<style>
	.card_wrapper {
		width: 60rem;
		height: 25rem;
		margin: auto;
		margin-top: 10rem;
		object-fit: cover;
	}

	.card {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.card-image-with-svg-mask {
		background-image: url('/pictures/earth/earth-1.jpg');
		width: 100%;
		height: 100%;
		background-position: 0%;
		background-repeat: no-repeat;
		background-size: cover;
		background-attachment: scroll;
		border-top-left-radius: 2.5rem;
		border-top-right-radius: 2.5rem;
		border-bottom-left-radius: 2.5rem;
		position: relative;
	}

	.card-image-with-svg-mask {
		mask:
			url('/svg/invertedSVG.png') center / contain no-repeat,
			url('/svg/invertedSVGCorner.png') center / contain no-repeat,
			linear-gradient(#000000 0 0);
		mask-size: 18rem, 22rem; /* Increased from 22rem to 23rem */
		mask-position:
			top center,
			bottom -0.1rem right 0; /* Adjusted positioning */
		mask-composite: exclude;
	}
</style>
