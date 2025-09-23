<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import LazyMedia from './LazyMedia.svelte';

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
	<!-- Use normal anchor link -->
	<div class="w-full h-full block">
		<div id="cardBorderEffect-{uniqueId}">
			<div id="cardGooEffect-{uniqueId}">
				<div
					id="projectCard"
					class="px-5 pt-5 pb-0 sm:pb-6 w-[350px] h-auto sm:w-[400px] sm:h-[200px] relative"
				>
					<div class="flex flex-col gap-4 h-full">
						<h3 class="main-text font-audiowide">Ales Holman</h3>
						<div class="flex justify-between">
							<p class="secondary-text leading-[120%] font-exo2 w-[60%]">
								Hey, I’m a frontend developer from Czechia with 3 years of
								experience building immersive web experiences and fullstack apps
							</p>
							<div
								class="w-[38%] aspect-square translate-x-3 -translate-y-2 media-container"
							>
								<LazyMedia
									src={'/pictures/myself.jpg'}
									mediaType={'image'}
									alt="Myself"
									index={0}
									className="grayscale"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class=" flex -bottom-11 gap-4 left-5 absolute">
				<a
					href="https://www.linkedin.com/in/alesholman"
					target="_blank"
					rel="noopener noreferrer"
					class="w-8 h-8"
					aria-label="Visit Ales Holman's LinkedIn profile"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						role="img"
						aria-label="LinkedIn"
						class="w-8 h-8"
						fill="currentColor"
					>
						<title>LinkedIn</title>
						<path
							d="M20.447 20.452H16.89v-5.356c0-1.276-.025-2.918-1.776-2.918-1.778 0-2.049 
    1.39-2.049 2.824v5.45H9.509V9h3.41v1.561h.046c.476-.9 
    1.637-1.847 3.37-1.847 3.6 0 4.266 2.37 4.266 
    5.455v6.283zM5.337 7.433a1.986 1.986 
    0 1 1 0-3.972 1.986 1.986 0 0 1 0 3.972zM6.965 
    20.452H3.708V9h3.257v11.452zM22.225 0H1.771C.792 
    0 0 .774 0 1.729v20.542C0 23.227.792 
    24 1.771 24h20.451C23.2 24 24 23.227 
    24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
						/>
					</svg>
				</a>
				<a
					href="https://github.com/Holman421"
					target="_blank"
					rel="noopener noreferrer"
					class="w-8 h-8"
					aria-label="Visit Ales Holman's LinkedIn profile"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						role="img"
						aria-label="GitHub"
						class="w-8 h-8"
						fill="currentColor"
					>
						<title>GitHub</title>
						<path
							d="M12 .297c-6.63 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577
    0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.744.083-.729.083-.729
    1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.305-5.467-1.332-5.467-5.93
    0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404
    2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221
    0 4.61-2.807 5.624-5.48 5.921.43.371.815 1.102.815 2.222 0 1.606-.014 2.903-.014 3.293
    0 .319.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						/>
					</svg>
				</a>
				<a
					href="mailto:ales.holman@mensa.cz"
					class="w-8 h-8"
					aria-label="Email Ales Holman"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						role="img"
						aria-label="Email"
						class="w-8 h-8"
						fill="currentColor"
					>
						<title>Email</title>
						<path
							d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 
    2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 
    2v.01L12 13 4 6.01V6h16zM4 18V8.236l7.386 
    6.147a1 1 0 0 0 1.228 0L20 
    8.236V18H4z"
						/>
					</svg>
				</a>
			</div>
		</div>
	</div>
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
