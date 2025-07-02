<<<<<<< HEAD
<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const {
		title,
		description,
		href,
		technologies,
		usedInRealProject,
		children,
		date
	} = $props<{
		title: string;
		description: string;
		href: string;
		technologies: string[];
		usedInRealProject: boolean;
		children?: () => any;
		date?: Date;
	}>();

	let cardElement: HTMLDivElement;
	let gooEffect = tweened(0, {
		duration: 300,
		easing: cubicOut
	});

	// Video playback control variables
	let videoPlaybackIntervals: Record<string, number> = {};
	let videoDirections: Record<string, boolean> = {}; // true = forward, false = backward
	const PLAYBACK_STEP = 0.05; // Adjust the playback speed
	const INTERVAL_MS = 60; // Update interval in milliseconds

	// Generate unique IDs for this instance
	const uniqueId = crypto.randomUUID();
	const gooFilterId = `goo-${uniqueId}`;
	const borderFilterId = `border-${uniqueId}`;

	// Custom video playback function
	function setupVideoPlayback(video: HTMLVideoElement) {
		const videoId =
			video.id || `video-${Math.random().toString(36).substr(2, 9)}`;
		if (!video.id) video.id = videoId;

		// Wait for video metadata to load to get duration
		if (video.readyState >= 2) {
			startVideoOscillation(video);
		} else {
			video.addEventListener('loadedmetadata', () => {
				startVideoOscillation(video);
			});
		}
	}

	function startVideoOscillation(video: HTMLVideoElement) {
		const videoId = video.id;
		videoDirections[videoId] = true; // Start by going forward

		// Clear any existing interval for this video
		if (videoPlaybackIntervals[videoId]) {
			clearInterval(videoPlaybackIntervals[videoId]);
		}

		// Set video to beginning
		video.currentTime = 0;

		// Create a new interval for oscillating playback
		videoPlaybackIntervals[videoId] = window.setInterval(() => {
			if (videoDirections[videoId]) {
				// Moving forward
				video.currentTime += PLAYBACK_STEP;

				// Check if we reached the end
				if (video.currentTime >= video.duration - PLAYBACK_STEP) {
					videoDirections[videoId] = false;
				}
			} else {
				// Moving backward
				video.currentTime -= PLAYBACK_STEP;

				// Check if we reached the beginning
				if (video.currentTime <= PLAYBACK_STEP) {
					videoDirections[videoId] = true;
				}
			}
		}, INTERVAL_MS);
	}

	function stopVideoOscillation(video: HTMLVideoElement) {
		const videoId = video.id;
		if (videoPlaybackIntervals[videoId]) {
			clearInterval(videoPlaybackIntervals[videoId]);
			delete videoPlaybackIntervals[videoId];
		}
		video.currentTime = 0;
	}

	onMount(() => {
		const cardBorderEffect = cardElement.querySelector(
			`#cardBorderEffect-${uniqueId}`
		) as HTMLDivElement;
		const cardGooEffect = cardElement.querySelector(
			`#cardGooEffect-${uniqueId}`
		) as HTMLDivElement;

		// Create and append filters dynamically
		const gooFilter = `
			<svg style="visibility: hidden; position: absolute;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
				<defs>
					<filter id="${gooFilterId}">
						<feGaussianBlur in="SourceGraphic" stdDeviation="${$gooEffect}" result="blur" />
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
		`;

		const borderFilter = `
			<svg width="0" height="0">
				<filter id="${borderFilterId}" x="-50%" y="-50%" width="200%" height="200%">
					<feMorphology operator="dilate" radius="1" in="SourceAlpha" result="expanded" />
					<feFlood flood-color="#a6a8b1" result="color" />
					<feComposite in="color" in2="expanded" operator="in" result="border" />
					<feMerge>
						<feMergeNode in="border" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</svg>
		`;

		// Append filters to the card element
		cardElement.insertAdjacentHTML('beforeend', gooFilter);
		cardElement.insertAdjacentHTML('beforeend', borderFilter);

		// Update filter references
		if (cardBorderEffect) {
			cardBorderEffect.style.filter = `url('#${borderFilterId}')`;
		}
		if (cardGooEffect) {
			cardGooEffect.style.filter = `url('#${gooFilterId}')`;
		}

		// Update goo effect on hover
		const updateGooFilter = (value: number) => {
			const filter = cardElement.querySelector(
				`#${gooFilterId} feGaussianBlur`
			);
			if (filter) {
				filter.setAttribute('stdDeviation', value.toString());
			}
		};

		// Subscribe to gooEffect changes
		const unsubscribe = gooEffect.subscribe((value) => {
			updateGooFilter(value);
		});

		cardElement.addEventListener('mouseenter', () => {
			gooEffect.set(10);

			// Find video elements in slots and play them with custom logic
			const videos = cardElement.querySelectorAll('video');
			videos.forEach((video) => {
				setupVideoPlayback(video);
			});
		});

		cardElement.addEventListener('mouseleave', () => {
			gooEffect.set(1);

			// Find video elements in slots and stop oscillation
			const videos = cardElement.querySelectorAll('video');
			videos.forEach((video) => {
				stopVideoOscillation(video);
			});
		});

		return () => {
			unsubscribe();
			// Clean up any remaining intervals
			Object.values(videoPlaybackIntervals).forEach((intervalId) => {
				clearInterval(intervalId);
			});
		};
	});
</script>

<div bind:this={cardElement} id="projectCardWrapper" class="project-card">
	<a {href}>
		<div id="cardBorderEffect-{uniqueId}">
			<div id="cardGooEffect-{uniqueId}">
				<div
					id="projectCard"
					class="px-5 pt-5 pb-0 sm:pb-6 w-[350px] h-auto sm:w-[400px] sm:h-[200px] relative"
				>
					<div class="flex flex-col gap-4 h-full">
						<h3 class="main-text font-audiowide">{title}</h3>
						<div class="flex justify-between">
							<p class="secondary-text font-exo2 w-[60%]">{description}</p>
							<div
								class="w-[38%] aspect-square translate-x-3 -translate-y-2 media-container"
							>
								{@render children?.()}
							</div>
						</div>
					</div>
					<!-- {#if usedInRealProject}
						<div
							class="absolute bottom-2 left-10 right-0 bg-opacity-50 text-white text-xs"
						>
							Used in real project
						</div>
					{/if} -->
					{#if date}
						<div
							class="absolute bottom-1 md:bottom-2 left-0 flex justify-center w-[150px] md:w-[195px] bg-opacity-50 text-white text-xs"
						>
							{date.toLocaleDateString('cz')}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</a>
</div>

<style>
	#projectCard {
		clip-path: polygon(
			0 1.5rem,
			1rem 0.5rem,
			3rem 0.5rem,
			3.5rem 0,
			6.5rem 0,
			7rem 0.5rem,
			calc(100% - 5rem) 0.5rem,
			calc(100% - 4.5rem) 1rem,
			calc(100% - 4.5rem) 2.5rem,
			calc(100% - 4rem) 3rem,
			calc(100% - 0.5rem) 3rem,
			100% 3.5rem,
			100% calc(100% - 0.5rem),
			calc(100% - 0.5rem) 100%,
			calc(100% - 9rem) calc(100% - 0rem),
			calc(100% - 9.5rem) calc(100% - 0.5rem),
			calc(100% - 13rem) calc(100% - 0.5rem),
			calc(100% - 13.5rem) calc(100% - 0rem),
			3rem calc(100% - 0rem),
			2.5rem 100%,
			1rem 100%,
			0 calc(100% - 1rem)
		);
		background: black;
	}

	.media-container :global(img),
	.media-container :global(video) {
		object-fit: fill;
		width: 100%;
		height: 100%;
		mask-image: radial-gradient(ellipse at center, black 95%, transparent 70%);
	}
</style>
=======
<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const { title, description, href, technologies, usedInRealProject, children } = $props<{
		title: string;
		description: string;
		href: string;
		technologies: string[];
		usedInRealProject: boolean;
		children?: any;
	}>();

	let cardElement: HTMLDivElement;
	let gooEffect = tweened(0, {
		duration: 300,
		easing: cubicOut
	});

	// Generate unique IDs for this instance
	const uniqueId = crypto.randomUUID();
	const gooFilterId = `goo-${uniqueId}`;
	const borderFilterId = `border-${uniqueId}`;

	onMount(() => {
		const cardBorderEffect = cardElement.querySelector(
			`#cardBorderEffect-${uniqueId}`
		) as HTMLDivElement;
		const cardGooEffect = cardElement.querySelector(`#cardGooEffect-${uniqueId}`) as HTMLDivElement;

		// Create and append filters dynamically
		const gooFilter = `
			<svg style="visibility: hidden; position: absolute;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
				<defs>
					<filter id="${gooFilterId}">
						<feGaussianBlur in="SourceGraphic" stdDeviation="${$gooEffect}" result="blur" />
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
		`;

		const borderFilter = `
			<svg width="0" height="0">
				<filter id="${borderFilterId}" x="-50%" y="-50%" width="200%" height="200%">
					<feMorphology operator="dilate" radius="1" in="SourceAlpha" result="expanded" />
					<feFlood flood-color="#a6a8b1" result="color" />
					<feComposite in="color" in2="expanded" operator="in" result="border" />
					<feMerge>
						<feMergeNode in="border" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</svg>
		`;

		// Append filters to the card element
		cardElement.insertAdjacentHTML('beforeend', gooFilter);
		cardElement.insertAdjacentHTML('beforeend', borderFilter);

		// Update filter references
		if (cardBorderEffect) {
			cardBorderEffect.style.filter = `url('#${borderFilterId}')`;
		}
		if (cardGooEffect) {
			cardGooEffect.style.filter = `url('#${gooFilterId}')`;
		}

		// Update goo effect on hover
		const updateGooFilter = (value: number) => {
			const filter = cardElement.querySelector(`#${gooFilterId} feGaussianBlur`);
			if (filter) {
				filter.setAttribute('stdDeviation', value.toString());
			}
		};

		// Subscribe to gooEffect changes
		const unsubscribe = gooEffect.subscribe((value) => {
			updateGooFilter(value);
		});

		cardElement.addEventListener('mouseenter', () => {
			gooEffect.set(10);

			// Find video elements in slots and play them
			const videos = cardElement.querySelectorAll('video');
			videos.forEach((video) => {
				video.play().catch((err) => console.error('Error playing video:', err));
			});
		});

		cardElement.addEventListener('mouseleave', () => {
			gooEffect.set(1);

			// Find video elements in slots and pause them
			const videos = cardElement.querySelectorAll('video');
			videos.forEach((video) => {
				video.pause();
				video.currentTime = 0;
			});
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<div bind:this={cardElement} id="projectCardWrapper" class="project-card">
	<a {href}>
		<div id="cardBorderEffect-{uniqueId}">
			<div id="cardGooEffect-{uniqueId}">
				<div
					id="projectCard"
					class="px-5 pt-5 pb-0 sm:pb-6 w-[350px] h-auto sm:w-[400px] sm:h-[200px] relative"
				>
					<div class="flex flex-col gap-4 h-full">
						<h3 class="main-text font-audiowide">{title}</h3>
						<div class="flex justify-between">
							<p class="secondary-text font-exo2 w-[60%]">{description}</p>
							<div class="w-[38%] aspect-square translate-x-3 -translate-y-2 media-container">
								{@render children()}
							</div>
						</div>
					</div>
					{#if usedInRealProject}
						<div class="absolute bottom-2 left-10 right-0 bg-opacity-50 text-white text-xs">
							Used in real project
						</div>
					{/if}
				</div>
			</div>
		</div>
	</a>
</div>

<style>
	#projectCard {
		clip-path: polygon(
			0 1.5rem,
			1rem 0.5rem,
			3rem 0.5rem,
			3.5rem 0,
			6.5rem 0,
			7rem 0.5rem,
			calc(100% - 5rem) 0.5rem,
			calc(100% - 4.5rem) 1rem,
			calc(100% - 4.5rem) 2.5rem,
			calc(100% - 4rem) 3rem,
			calc(100% - 0.5rem) 3rem,
			100% 3.5rem,
			100% calc(100% - 0.5rem),
			calc(100% - 0.5rem) 100%,
			calc(100% - 9rem) calc(100% - 0rem),
			calc(100% - 9.5rem) calc(100% - 0.5rem),
			calc(100% - 13rem) calc(100% - 0.5rem),
			calc(100% - 13.5rem) calc(100% - 0rem),
			3rem calc(100% - 0rem),
			2.5rem 100%,
			1rem 100%,
			0 calc(100% - 1rem)
		);
		background: black;
	}

	.media-container :global(img),
	.media-container :global(video) {
		object-fit: fill;
		width: 100%;
		height: 100%;
		mask-image: radial-gradient(ellipse at center, black 95%, transparent 70%);
	}
</style>
>>>>>>> bc8fdaab1660c149126eb6dee163e00917b47907
