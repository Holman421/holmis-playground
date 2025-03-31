<script lang="ts">
	import { gsap } from 'gsap';
	import AnimatedBox from '../../components/AnimatedBox.svelte';

	let isAnimated = false;

	const gridItems = [
		{ cols: 1, rows: 3, startCol: 1, startRow: 1 },
		{ cols: 2, rows: 1, startCol: 1, startRow: 4 },
		{ cols: 2, rows: 2, startCol: 2, startRow: 2 },
		{ cols: 2, rows: 2, startCol: 4, startRow: 3 },
		{ cols: 1, rows: 1, startCol: 2, startRow: 1 },
		{ cols: 2, rows: 1, startCol: 3, startRow: 1 },
		{ cols: 1, rows: 1, startCol: 3, startRow: 4 },
		{ cols: 1, rows: 1, startCol: 6, startRow: 1 },
		{ cols: 1, rows: 2, startCol: 5, startRow: 1 },
		{ cols: 1, rows: 2, startCol: 6, startRow: 3 },
		{ cols: 1, rows: 1, startCol: 4, startRow: 2 },
		{ cols: 1, rows: 1, startCol: 6, startRow: 2 }
	];

	const imageUrl =
		'https://cdn.magicdecor.in/com/2024/09/12175741/Aakashganga-Realistic-Galaxy-Wallpaper-Mural-710x445.jpg';

	const getRandomDelay = () => Math.random() * 0.3; // Random delay between 0-0.3s

	const toggleAnimation = () => {
		isAnimated = !isAnimated;
		const boxes = document.querySelectorAll('.animated-box');
		const randomDelays = Array.from({ length: boxes.length }, getRandomDelay);

		boxes.forEach((box, index) => {
			const baseDelay = randomDelays[index];

			// First layer
			gsap.to(box.querySelector('.layer-1 .top-side'), {
				scaleY: isAnimated ? 0 : 1,
				transformOrigin: 'top',
				duration: 0.8,
				delay: baseDelay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-1 .bottom-side'), {
				scaleY: isAnimated ? 0 : 1,
				transformOrigin: 'bottom',
				duration: 0.8,
				delay: baseDelay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-1 .left-side'), {
				scaleX: isAnimated ? 0 : 1,
				transformOrigin: 'left',
				duration: 0.8,
				delay: baseDelay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-1 .right-side'), {
				scaleX: isAnimated ? 0 : 1,
				transformOrigin: 'right',
				duration: 0.8,
				delay: baseDelay,
				ease: 'power2.inOut'
			});

			// Layer 2 with slightly more delay
			const layer2Delay = baseDelay + 0.2;
			gsap.to(box.querySelector('.layer-2 .top-side'), {
				scaleY: isAnimated ? 0 : 1,
				transformOrigin: 'top',
				duration: 0.8,
				delay: layer2Delay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-2 .bottom-side'), {
				scaleY: isAnimated ? 0 : 1,
				transformOrigin: 'bottom',
				duration: 0.8,
				delay: layer2Delay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-2 .left-side'), {
				scaleX: isAnimated ? 0 : 1,
				transformOrigin: 'left',
				duration: 0.8,
				delay: layer2Delay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-2 .right-side'), {
				scaleX: isAnimated ? 0 : 1,
				transformOrigin: 'right',
				duration: 0.8,
				delay: layer2Delay,
				ease: 'power2.inOut'
			});

			// Layer 3 with even more delay
			const layer3Delay = baseDelay + 0.4;
			gsap.to(box.querySelector('.layer-3 .top-side'), {
				scaleY: isAnimated ? 0 : 1,
				transformOrigin: 'top',
				duration: 0.8,
				delay: layer3Delay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-3 .bottom-side'), {
				scaleY: isAnimated ? 0 : 1,
				transformOrigin: 'bottom',
				duration: 0.8,
				delay: layer3Delay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-3 .left-side'), {
				scaleX: isAnimated ? 0 : 1,
				transformOrigin: 'left',
				duration: 0.8,
				delay: layer3Delay,
				ease: 'power2.inOut'
			});
			gsap.to(box.querySelector('.layer-3 .right-side'), {
				scaleX: isAnimated ? 0 : 1,
				transformOrigin: 'right',
				duration: 0.8,
				delay: layer3Delay,
				ease: 'power2.inOut'
			});
		});
	};
</script>

<div class="w-full h-[calc(100vh-56px)] flex flex-col gap-4 items-center justify-center">
	<button class="border py-2 px-4" on:click={toggleAnimation}>
		{isAnimated ? 'Reset' : 'Animate'}
	</button>
	<div
		class="w-[60rem] h-[40rem] relative grid grid-cols-6 grid-rows-4 bg-cover bg-center bg-no-repeat"
		style="background-image: url('{imageUrl}')"
	>
		{#each gridItems as { cols, rows, startCol, startRow }, index}
			<div
				style="grid-column: {startCol} / span {cols}; grid-row: {startRow} / span {rows};"
				class="w-full h-full box-{index}"
			>
				<AnimatedBox {cols} {rows} />
			</div>
		{/each}
	</div>
</div>
