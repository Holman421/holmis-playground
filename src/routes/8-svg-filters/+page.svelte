<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let gooEffect = tweened(2, {
		duration: 300,
		easing: cubicOut
	});

	onMount(() => {
		const tl = gsap.timeline({ ease: 'power4.out', defaults: { duration: 1 } });

		tl.fromTo(
			'#projectCardSVG1',
			{
				background: 'linear-gradient(120deg, green 0%, red 0%)'
			},
			{
				background: 'linear-gradient(120deg, green 0%, red 100%, transparent 100%)'
			}
		);

		const card = document.getElementById('projectCardSVG1')!;

		card.addEventListener('click', () => {
			tl.restart();
		});

		card.addEventListener('mouseenter', () => {
			gooEffect.set(10);
		});

		card.addEventListener('mouseleave', () => {
			gooEffect.set(1);
		});
	});
</script>

<div class="m-10 ml-20">
	<div id="cardBorderEffect" class="cursor-pointer">
		<div id="cardGooEffect">
			<div
				id="projectCardSVG1"
				class="px-5 pt-5 pb-6 w-[400px] min-h-[200px] flex flex-col justify-between bg-white relative"
			>
				<div>
					<h3 class="font-bold text-xl">Test card</h3>
					<p class="text-gray-900 text-base mt-4">Test description</p>
				</div>
				<div class="flex gap-2 mt-4 flex-wrap">
					<div class="border rounded-full px-3 border-black">svg</div>
				</div>
			</div>
		</div>
	</div>
</div>

<svg
	style="visibility: hidden; position: absolute;"
	width="0"
	height="0"
	xmlns="http://www.w3.org/2000/svg"
	version="1.1"
>
	<defs>
		<filter id="goo">
			<feGaussianBlur in="SourceGraphic" stdDeviation={$gooEffect} result="blur" />
			<feColorMatrix
				in="blur"
				mode="matrix"
				values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
				result="goo"
			/>
			<feComposite in="SourceGraphic" in2="goo" operator="atop" />
		</filter>
	</defs>
</svg>

<svg width="0" height="0">
	<filter id="borderSVG" x="-50%" y="-50%" width="200%" height="200%">
		<feMorphology operator="dilate" radius="2" in="SourceAlpha" result="expanded" />
		<feFlood flood-color="white" result="color" />
		<feComposite in="color" in2="expanded" operator="in" result="border" />
		<feMerge>
			<feMergeNode in="border" />
			<feMergeNode in="SourceGraphic" />
		</feMerge>
	</filter>
</svg>

<style>
	#projectCardSVG1 {
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
	}

	#cardBorderEffect {
		filter: url('#borderSVG');
	}

	#cardGooEffect {
		filter: url('#goo');
	}
</style>
