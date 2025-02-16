<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { handleAddGooFilter } from './generic-utils';
	import GUI from 'lil-gui';
	import * as THREE from 'three';
	import gsap from 'gsap';
	import {
		addCamera,
		addControls,
		addLight,
		addRenderer,
		getSizes,
		handleScene1,
		handleScene4,
		handleScene6,
		resizeRenderer
	} from './three-js-utils';

	let containerElement: HTMLDivElement;
	// Generate unique IDs for this instance
	const uniqueId = crypto.randomUUID();
	const state1Vid = '/videos/universe-1.mp4';
	const state2Vid = '/videos/transparent-astronaut.webm';
	const state3Vid = '/videos/red-bg.mp4';
	const state4Vid = '/videos/halftone.mp4';
	const audioUrl = '/audio/avax-audio.mp3';
	const state5Pic = '/pictures/round-transparent-face.png';
	const state5Vid = '/videos/jetpack.mp4';
	const state7vid = '/videos/clouds.mp4';
	const state7Pic = '/pictures/cloud.png';
	const state7Pic2 = '/pictures/infinity.png';

	let maskState = $state(1);
	let autoChange = $state(false);

	const numberOfStates = 8;
	let intervalId: ReturnType<typeof setInterval> | undefined;
	let audioElement: HTMLAudioElement;

	const handleAutoToggle = () => {
		autoChange = !autoChange;
		if (autoChange) {
			maskState = 1;
		}
		if (autoChange) {
			if (audioElement) {
				audioElement.play();
				intervalId = setInterval(() => {
					maskState = maskState === numberOfStates ? 1 : maskState + 1;
				}, 1100);
			}
		} else {
			if (audioElement) {
				audioElement.pause();
				audioElement.currentTime = 0;
			}
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
		}
	};

	const handleStateChange = (newState: number) => {
		maskState = newState;

		const canvasMask = document.getElementById('canvas-mask');
		if (canvasMask) {
			if (newState === 6) {
				canvasMask.classList.add('canvas-mask');
			} else {
				canvasMask.classList.remove('canvas-mask');
			}
		}
	};

	onMount(() => {
		if (containerElement) {
			handleAddGooFilter(containerElement);
		}
	});

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const sizes = getSizes(window);
		const camera = addCamera(sizes, scene);

		const cleanupScene1 = handleScene1(scene, maskState === 1, document, camera);
		const cleanupScene4 = handleScene4(scene, maskState === 4, document, camera);
		const cleanupScene6 = handleScene6(scene, maskState === 6, document, camera);

		addLight(scene);
		const renderer = addRenderer(canvas, sizes);
		const controls = addControls(camera, canvas);
		const cleanupResize = resizeRenderer(camera, renderer, sizes);

		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			cleanupResize();
			cleanupScene4();
		};
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
	});

	const handleButtonClass = (isActive: boolean) => {
		return `bg-black px-4 py-1 hover:bg-black/75 hover:text-white transition-all ${isActive ? 'bg-red-500 hover:bg-red-400' : ''}`;
	};
</script>

<div
	class="w-full h-[calc(100vh-56px)] bg-white border flex flex-col gap-6 items-center justify-center"
>
	<audio bind:this={audioElement} src={audioUrl} loop></audio>
	<div class="mask-parent" bind:this={containerElement}>
		{#if maskState === 6}
			<svg
				width="100%"
				height="100%"
				class="relative z-40"
				viewBox="0 0 400 400"
				preserveAspectRatio="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<clipPath id="canvasClip">
						<!-- <polygon points="0,0 200,0 270,150 140,400 0,400" /> -->
						<polygon points="0,0 200,0 270,150 140,400 0,400" />
						<polygon points="320,240 400,400 240,400" />
					</clipPath>
				</defs>
				<foreignObject width="100%" height="100%" clip-path="url(#canvasClip)">
					<canvas class="webgl relative z-40"></canvas>
				</foreignObject>
			</svg>
		{:else if maskState === 1 || maskState === 4}
			<canvas class="webgl relative z-40 size-full"></canvas>
		{/if}
		<div class="size-full absolute">
			{#if maskState === 1}
				<div
					class="mask-element"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state1Vid} type="video/mp4" />
					</video>
					<h3
						class="absolute top-[13rem] left-[4rem] rotate-[-60deg] text-black text-4xl scale-animation duration-1000"
					>
						<span class="text-red-500">Hyper</span><span class="text-white">SDK</span>
					</h3>
				</div>
				<div class="mask-element" style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)">
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state1Vid} type="video/mp4" />
					</video>
				</div>
			{:else if maskState === 2}
				<div
					class="mask-element bg-blue-500"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				></div>
				<div
					class="mask-element"
					style="clip-path: polygon(0% 0%, 100% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="-translate-x-10 mask-video" autoplay loop muted playsinline>
						<source src={state2Vid} type="video/webm" />
					</video>
				</div>
				<div
					class="mask-element bg-blue-500"
					style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)"
				></div>
			{:else if maskState === 3}
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 400 400"
					preserveAspectRatio="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<defs>
						<clipPath id="multiClip">
							<polygon points="200,0 270,150 140,400 0,400" />
							<polygon points="320,240 400,400 240,400" />
						</clipPath>
					</defs>

					<foreignObject width="100%" height="100%" clip-path="url(#multiClip)">
						<div style="width: 100%; height: 100%;">
							<video
								class="mask-video"
								style="width: 100%; height: 100%; object-fit: cover;"
								autoplay
								loop
								muted
								playsinline
							>
								<source src={state3Vid} type="video/mp4" />
							</video>
						</div>
					</foreignObject>
				</svg>
			{:else if maskState === 4}
				<div
					class="mask-element"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state4Vid} type="video/mp4" />
					</video>
				</div>
				<div class="mask-element" style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)">
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state4Vid} type="video/mp4" />
					</video>
				</div>
			{:else if maskState === 5}
				<div
					class="mask-element z-10 clip-path-animation"
					style="clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%)"
				>
					<img
						class="absolute top-[5rem] left-[-2rem] size-[10rem] face-animation"
						src={state5Pic}
						alt="face"
					/>
				</div>
				<div
					class="mask-element"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state5Vid} type="video/mp4" />
					</video>
				</div>
				<div class="mask-element" style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)">
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state5Vid} type="video/mp4" />
					</video>
				</div>
			{:else if maskState === 6}
				<div
					class="mask-element bg-pink-400"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				></div>
				<div
					class="mask-element bg-pink-400"
					style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)"
				></div>
			{:else if maskState === 7}
				<div
					class="mask-element z-10"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state7vid} type="video/mp4" />
					</video>
				</div>
				<div class="mask-element" style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)">
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state7vid} type="video/mp4" />
					</video>
				</div>
				<div class="relative w-full h-full z-0 move-left-animation">
					<img
						class="absolute top-[10rem] left-[-2rem] size-[10rem] opacity-50"
						src={state7Pic}
						alt="face"
					/>
					<img
						class="absolute top-[7rem] left-[14rem] size-[10rem] opacity-50"
						src={state7Pic}
						alt="face"
					/>
				</div>
				<img
					class="absolute top-[10rem] right-1/2 translate-x-1/2 w-[20rem] z-20 move-up-animation"
					src={state7Pic2}
					alt="face"
				/>
			{:else if maskState === 8}
				<div
					class="mask-element"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state4Vid} type="video/mp4" />
					</video>
				</div>
				<div class="mask-element" style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)">
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state4Vid} type="video/mp4" />
					</video>
				</div>
			{:else}
				<div
					class="mask-element"
					style="clip-path: polygon(50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%)"
				>
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state3Vid} type="video/mp4" />
					</video>
				</div>
				<div class="mask-element" style="clip-path: polygon(80% 60%, 100% 100%, 60% 100%)">
					<video class="mask-video" autoplay loop muted playsinline>
						<source src={state3Vid} type="video/mp4" />
					</video>
				</div>
			{/if}
		</div>
	</div>
	<div class="flex gap-4">
		{#each Array.from({ length: numberOfStates }, (_, i) => i + 1) as state}
			<button
				class={handleButtonClass(maskState === state)}
				onclick={() => handleStateChange(state)}
			>
				State {state}
			</button>
		{/each}
	</div>
	<div>
		<button
			class={`px-4 py-1 bg-black hover:bg-black/75 hover:text-white transition-all ${autoChange ? 'bg-red-500 hover:bg-red-400' : ''}`}
			onclick={handleAutoToggle}>Toggle auto changing</button
		>
	</div>
</div>

<style>
	.mask-parent {
		position: relative;
		overflow: hidden;
		width: 400px;
		height: 400px;
		border: 1px solid white;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
	}
	/* 
	[id^='gooEffect-'] {
		filter: url(#goo);
		position: absolute;
		width: 100%;
		height: 100%;
	} */

	.mask-element {
		position: absolute;
		width: 400px;
		height: 400px;
		overflow: hidden;
	}

	.canvas-mask {
		clip-path: polygon(0% 0%, 50% 0%, 67.5% 37.5%, 35% 100%, 0% 100%);
		overflow: hidden;
	}

	.mask-video {
		position: absolute;
		width: 400px;
		height: 400px;
		object-fit: cover;
	}

	.scale-animation {
		animation: scaleDown 0.5s ease-out;
	}

	@keyframes scaleDown {
		0% {
			transform: rotate(-60deg) scale(2.5);
		}
		100% {
			transform: rotate(-60deg) scale(1);
		}
	}

	@keyframes moveLeft {
		0% {
			transform: translateX(0%);
		}
		100% {
			transform: translateX(-20%);
		}
	}

	@keyframes moveUp {
		0% {
			transform: translate(50%, 150%) scale(1.5);
		}
		100% {
			transform: translate(50%, 0%) scale(1);
		}
	}

	.move-up-animation {
		animation: moveUp 1s ease-out;
	}

	.move-left-animation {
		animation: moveLeft 4s ease-out;
	}

	.face-animation {
		animation: circularPath 1s infinite ease-in-out;
	}

	.clip-path-animation {
		animation: state5ClipPath 1s infinite ease-in-out;
	}

	@keyframes circularPath {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(0, 100px);
		}
		50% {
			transform: translate(275px, 100px);
		}
		75% {
			transform: translate(275px, -75px);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	@keyframes state5ClipPath {
		0% {
			clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%);
		}
		25% {
			clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%);
		}
		50% {
			clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%);
		}
		75% {
			clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 100% 100%);
		}
		100% {
			clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 100% 100%);
		}
	}

	:global(.webgl) {
		width: 100%;
		height: 100%;
	}

	foreignObject {
		width: 100%;
		height: 100%;
	}
</style>
