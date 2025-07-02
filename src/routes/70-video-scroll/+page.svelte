<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

	let video: HTMLVideoElement;
	let scrollContainer: HTMLDivElement;

	const useGsap = true; // Change to true to use GSAP

	const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

	let targetTime = 0;
	let easedTime = 0;

	function handleScroll() {
		if (!scrollContainer || !video || !video.duration) return;

		const { top, height } = scrollContainer.getBoundingClientRect();
		const viewportHeight = window.innerHeight;

		const scrollDist = height - viewportHeight;
		const scrollProgress = -top / scrollDist;
		const progress = Math.max(0, Math.min(1, scrollProgress));

		targetTime = video.duration * progress;
	}

	function updateVideoTime() {
		easedTime = lerp(easedTime, targetTime, 0.05);
		if (video && video.readyState > 2) {
			video.currentTime = easedTime;
		}
		requestAnimationFrame(updateVideoTime);
	}

	onMount(() => {
		if (useGsap) {
			gsap.registerPlugin(ScrollTrigger);

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: scrollContainer,
					start: 'top top',
					end: 'bottom bottom',
					scrub: true,
					onUpdate: (self) => {
						if (video && video.duration) {
							const progress = self.progress;
							video.currentTime = video.duration * progress;
						}
					}
				}
			});

			return () => {
				tl.kill();
			};
		} else {
			const onCanPlay = () => {
				window.addEventListener('scroll', handleScroll);
			};

			video.addEventListener('canplay', onCanPlay);

			const animId = requestAnimationFrame(updateVideoTime);

			onDestroy(() => {
				window.removeEventListener('scroll', handleScroll);
				cancelAnimationFrame(animId);
				video.removeEventListener('canplay', onCanPlay);
			});
		}
	});

	const videoOptions = {
		classic: {
			src: '/videos/universe.mp4',
			type: 'video/mp4'
		},
		long: {
			src: '/videos/universe-long.mp4',
			type: 'video/mp4'
		},
		'60fps': {
			src: '/videos/universe-60fps.mp4',
			type: 'video/mp4'
		},
		webm: {
			src: '/videos/universe-webm.webm',
			type: 'video/webm'
		},
		'265': {
			src: '/videos/universe-265.mp4',
			type: 'video/mp4'
		}
	};

	type VideoOptionKey = keyof typeof videoOptions;
	let currentVideoOption: VideoOptionKey = '265'; // Change this to switch video source
</script>

<div
	id="container"
	class="w-full h-[calc(100vh-56px)] flex items-center justify-center"
>
	<div
		bind:this={scrollContainer}
		id="scroll-container"
		class="w-full h-[200vh] border"
	>
		<video
			bind:this={video}
			class="w-[50vw] object-contain fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
		>
			<source
				src={videoOptions[currentVideoOption].src}
				type={videoOptions[currentVideoOption].type}
			/>
			<track
				kind="captions"
				src={videoOptions[currentVideoOption].src}
				srclang="en"
				label="English"
			/>
		</video>
	</div>
</div>
