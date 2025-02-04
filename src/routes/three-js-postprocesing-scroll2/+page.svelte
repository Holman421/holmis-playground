<script lang="ts">
	import { browser } from '$app/environment';
	import { gsap } from 'gsap/dist/gsap';

	// Configuration constants
	const SCROLL_SENSITIVITY = 0.00015; // Lower = slower scroll (previous was 0.0003)
	const MOMENTUM_DECAY = 0.9; // Higher = more inertia
	const LERP_FACTOR = 0.08; // Lower = smoother but slower response

	const imgArray = [
		'/pictures/planet-img.jpg',
		'/pictures/galaxy-img.jpg',
		'/pictures/galaxy-img2.jpg',
		'/pictures/universe.jpg',
		'/pictures/red-universe.jpg',
		'/pictures/green-universe.jpg',
		'/pictures/yellow-universe.jpg',
		'/pictures/purple-universe.jpg',
		'/pictures/white-universe.jpg',
		'/pictures/blue-universe.jpg',
		'/pictures/black-hole.jpg',
		'/pictures/orange-universe.jpg'
	];
	let tl: gsap.core.Timeline;
	let currentProgress = 0;
	let targetProgress = 0;
	let rafId: number;
	let scrollWrapper: HTMLElement;
	let lastTouchX: number;
	let isTouching = false;

	const lerp = (start: number, end: number, t: number) => {
		return start * (1 - t) + end * t;
	};

	$effect(() => {
		if (!browser) return;

		const items = scrollWrapper?.children;
		const itemsInOneSet = imgArray.length;
		const gridGap = parseInt(getComputedStyle(scrollWrapper).gap) || 16;
		const itemWidth = 150; // Width of each item
		let itemsPerRow = window.innerWidth <= 768 ? 3 : 4; // Calculate rows directly

		// Calculate the height needed for all items in one set
		const rowCount = Math.ceil(itemsInOneSet / itemsPerRow);
		const singleSetWidth = (itemWidth + gridGap) * rowCount;

		let momentum = 0;

		tl = gsap.timeline({
			paused: true,
			defaults: { ease: 'none' }
		});

		tl.to('.scroll-wrapper', {
			x: -singleSetWidth,
			duration: 1,
			ease: 'none'
		});

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			momentum += e.deltaY * SCROLL_SENSITIVITY;
		};

		const handleTouchStart = (e: TouchEvent) => {
			e.preventDefault();
			isTouching = true;
			lastTouchX = e.touches[0].clientX;
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (!isTouching) return;
			e.preventDefault();
			const touchX = e.touches[0].clientX;
			const deltaX = lastTouchX - touchX;
			momentum += deltaX * SCROLL_SENSITIVITY;
			lastTouchX = touchX;
		};

		const handleTouchEnd = (e: TouchEvent) => {
			e.preventDefault();
			isTouching = false;
		};

		const animate = () => {
			// Add momentum to target with decay
			targetProgress += momentum;
			momentum *= MOMENTUM_DECAY; // Decay factor

			// Smoother lerp
			currentProgress = lerp(currentProgress, targetProgress, LERP_FACTOR);

			// Handle wrapping with momentum preservation
			if (targetProgress > 0.95) {
				// Start transition early
				const excess = targetProgress - 1;
				targetProgress = excess;
				currentProgress -= 1;
				momentum = momentum; // Preserve momentum through wrap
			} else if (targetProgress < 0.05) {
				// Same for reverse
				const excess = targetProgress;
				targetProgress = 1 + excess;
				currentProgress += 1;
				momentum = momentum; // Preserve momentum through wrap
			}

			const wrappedProgress = ((currentProgress % 1) + 1) % 1; // Ensure positive wrapping
			tl.progress(wrappedProgress);

			rafId = requestAnimationFrame(animate);
		};

		window.addEventListener('wheel', handleWheel, { passive: false });
		window.addEventListener('touchstart', handleTouchStart, { passive: false });
		window.addEventListener('touchmove', handleTouchMove, { passive: false });
		window.addEventListener('touchend', handleTouchEnd, { passive: false });
		rafId = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener('wheel', handleWheel);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('touchend', handleTouchEnd);
			cancelAnimationFrame(rafId);
		};
	});
</script>

<div class="overflow-hidden bg-black h-[calc(100vh-56px)]">
	<section class="w-full h-[calc(100vh-56px)] flex items-center">
		<div class="scroll-container relative w-full h-full">
			<div
				bind:this={scrollWrapper}
				class="scroll-wrapper grid grid-flow-col grid-rows-3 md:grid-rows-4 items-center gap-16 absolute left-0 h-full py-20"
			>
				{#each imgArray as img, i}
					<div class="w-[150px] h-[150px] flex-shrink-0 bg-gray-800">
						<img
							src={img}
							alt={`Scrolling image ${i}`}
							class="w-full h-full object-cover"
							loading="eager"
						/>
					</div>
				{/each}
				{#each imgArray as img, i}
					<div class="w-[150px] h-[150px] flex-shrink-0 bg-gray-800">
						<img
							src={img}
							alt={`Scrolling image ${i}`}
							class="w-full h-full object-cover"
							loading="eager"
						/>
					</div>
				{/each}
				{#each imgArray as img, i}
					<div class="w-[150px] h-[150px] flex-shrink-0 bg-gray-800">
						<img
							src={img}
							alt={`Scrolling image ${i}`}
							class="w-full h-full object-cover"
							loading="eager"
						/>
					</div>
				{/each}
				{#each imgArray as img, i}
					<div class="w-[150px] h-[150px] flex-shrink-0 bg-gray-800">
						<img
							src={img}
							alt={`Scrolling image ${i}`}
							class="w-full h-full object-cover"
							loading="eager"
						/>
					</div>
				{/each}
			</div>
		</div>
	</section>
</div>

<style>
	.scroll-container {
		overflow: hidden;
		white-space: nowrap;
	}
</style>
