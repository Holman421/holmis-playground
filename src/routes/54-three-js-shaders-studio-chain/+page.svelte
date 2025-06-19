<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import * as THREE from 'three';
	import { GUI } from 'lil-gui';
	import { EffectComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
	import fragmentShader from './fragment.glsl';
	// Constants from original file
	const CANVAS_HEIGHT = 200;
	let TRAIL_WIDTH_CLICK = 12;
	let TRAIL_WIDTH_AUTO = 10;
	const FADE_DURATION_MS = 500;
	const POINTS_THRESHOLD = 8;
	const MIN_POINT_DISTANCE = 2;
	const LINE_SMOOTHING = true;
	let title: HTMLElement | null = null;

	const settings = {
		pixelation: true,
		pixelSize: 10,
		debugMode: false,
		distortion: true,
		distortionAmount: 1.0,
		distortionSpeed: 1.0,
		distortionScale: 1.0, // Add new setting
		trailColor: '#82d39d', // Add color setting
		colorOpacity: 1.0,
		uStepEnabled: true,
		trailSize: 5 // Add new trail size setting
	};

	// Custom shader from original file
	const textureShader = {
		uniforms: {
			tDiffuse: { value: null },
			uTrailTexture: { value: null },
			uTime: { value: 0 },
			uPixelSize: { value: settings.pixelSize },
			uResolution: { value: new THREE.Vector2(1, 1) },
			uScrollProgress: { value: 0 },
			uIsMobile: { value: false },
			uPixelationEnabled: { value: true }, // Add new uniform
			uDistortionEnabled: { value: true },
			uDistortionAmount: { value: 1.0 },
			uDistortionSpeed: { value: 1.0 },
			uDistortionScale: { value: 1.0 }, // Add new uniform
			uTrailColor: { value: new THREE.Color(settings.trailColor) },
			uColorOpacity: { value: settings.colorOpacity },
			uStepEnabled: { value: true },
			uRippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
			uRippleProgress: { value: 0.0 },
			uRippleActive: { value: false }
		},
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: fragmentShader
	};

	// Types
	type TrailPoint = {
		x: number;
		y: number;
		creationTime: number;
	};

	type Trail = {
		points: TrailPoint[];
		size: number;
	};

	let sceneCanvas: HTMLCanvasElement;
	let trailCanvas: HTMLCanvasElement;
	let canvasWidth = 0;
	let isMobile = false;
	let debugMode = false;
	let pixelationEnabled = true;

	// Refs as reactive variables
	let renderer: THREE.WebGLRenderer | null = null;
	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let composer: EffectComposer | null = null;
	let shaderPass: ShaderPass | null = null;
	let canvasTexture: THREE.Texture | null = null;

	// State management
	let paintHistory: Trail[] = [];
	let currentTrail: Trail | null = null;
	let lastPosition = { x: 0, y: 0 };
	let trailPool: Trail[] = [];
	let pointPool: TrailPoint[] = [];

	// Add ripple state management
	let rippleActive = false;
	let rippleStart = 0;
	let rippleDuration = 500; // Shorter duration (0.8 seconds)

	onMount(() => {
		if (!browser) return;

		// Add sizes management
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		const handleResize = () => {
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			if (camera) {
				camera.aspect = sizes.width / sizes.height;
				camera.updateProjectionMatrix();
			}

			if (renderer) {
				renderer.setSize(sizes.width, sizes.height);
				renderer.setPixelRatio(sizes.pixelRatio);
			}

			if (composer) {
				composer.setSize(sizes.width, sizes.height);
				composer.setPixelRatio(sizes.pixelRatio);
			}
		};

		window.addEventListener('resize', handleResize);

		// Add GUI setup
		const gui = new GUI();
		const effectsFolder = gui.addFolder('Effects');
		title = document.getElementById('title');

		effectsFolder
			.add(settings, 'pixelation')
			.name('Enable Pixelation')
			.onChange((value: boolean) => {
				pixelationEnabled = value;
				if (shaderPass) {
					shaderPass.uniforms.uPixelationEnabled.value = value;
				}
			});

		effectsFolder
			.add(settings, 'uStepEnabled')
			.name('Enable Step')
			.onChange((value: boolean) => {
				if (shaderPass) {
					shaderPass.uniforms.uStepEnabled.value = value;
				}
			});

		effectsFolder
			.add(settings, 'pixelSize', 1, 50, 1)
			.name('Pixel Size')
			.onChange((value: number) => {
				if (shaderPass) {
					shaderPass.uniforms.uPixelSize.value = value;
				}
			});

		effectsFolder
			.addColor(settings, 'trailColor')
			.name('Trail Color')
			.onChange((value: string) => {
				if (shaderPass) {
					const color = new THREE.Color(value);
					shaderPass.uniforms.uTrailColor.value = color;
				}
			});

		effectsFolder
			.add(settings, 'colorOpacity', 0, 1, 0.01)
			.name('Color Opacity')
			.onChange((value: number) => {
				if (shaderPass) {
					shaderPass.uniforms.uColorOpacity.value = value;
				}
			});

		effectsFolder
			.add(settings, 'trailSize', 1, 30, 1)
			.name('Trail Size')
			.onChange((value: number) => {
				TRAIL_WIDTH_CLICK = value + 2;
			});

		const distortionFolder = effectsFolder.addFolder('Distortion');

		distortionFolder
			.add(settings, 'distortion')
			.name('Enable Distortion')
			.onChange((value: boolean) => {
				if (shaderPass) {
					shaderPass.uniforms.uDistortionEnabled.value = value;
				}
			});

		distortionFolder
			.add(settings, 'distortionAmount', 0, 2)
			.name('Distortion Amount')
			.onChange((value: number) => {
				if (shaderPass) {
					shaderPass.uniforms.uDistortionAmount.value = value;
				}
			});

		distortionFolder
			.add(settings, 'distortionSpeed', 0, 2)
			.name('Distortion Speed')
			.onChange((value: number) => {
				if (shaderPass) {
					shaderPass.uniforms.uDistortionSpeed.value = value;
				}
			});

		distortionFolder
			.add(settings, 'distortionScale', 0.1, 5)
			.name('Distortion Scale')
			.onChange((value: number) => {
				if (shaderPass) {
					shaderPass.uniforms.uDistortionScale.value = value;
				}
			});

		const debugFolder = gui.addFolder('Debug');
		debugFolder
			.add(settings, 'debugMode')
			.name('Show Debug View')
			.onChange((value: boolean) => {
				debugMode = value;
			});

		effectsFolder.open();
		distortionFolder.open();

		// Pre-initialize object pools
		for (let i = 0; i < 20; i++) {
			trailPool.push({ points: [], size: 10 });
		}
		for (let i = 0; i < 200; i++) {
			pointPool.push({ x: 0, y: 0, creationTime: 0 });
		}

		// Initial dimension setup
		const screenAspect = window.innerWidth / window.innerHeight;
		canvasWidth = Math.round(CANVAS_HEIGHT * screenAspect);

		// Set up trail canvas
		if (trailCanvas) {
			trailCanvas.width = canvasWidth;
			trailCanvas.height = CANVAS_HEIGHT;
			const ctx = trailCanvas.getContext('2d');
			if (ctx) {
				ctx.fillStyle = '#000000';
				ctx.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT);
			}
			// Create initial texture
			canvasTexture = new THREE.CanvasTexture(trailCanvas);
			canvasTexture.minFilter = THREE.LinearFilter;
			canvasTexture.magFilter = THREE.LinearFilter;
			canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
			canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
			canvasTexture.generateMipmaps = false;
			canvasTexture.needsUpdate = true;
		}

		// Set up scene canvas and renderer
		if (sceneCanvas) {
			renderer = new THREE.WebGLRenderer({
				canvas: sceneCanvas,
				antialias: true,
				alpha: false,
				powerPreference: 'high-performance',
				precision: 'mediump',
				stencil: false,
				depth: false
			});

			renderer.setClearColor(new THREE.Color('#171615'), 1);
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

			// Set up scene
			scene = new THREE.Scene();
			camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
			camera.position.z = 1;

			// Set up post-processing
			composer = new EffectComposer(renderer);
			const renderPass = new RenderPass(scene, camera);
			composer.addPass(renderPass);

			shaderPass = new ShaderPass(textureShader);
			if (canvasTexture) {
				shaderPass.uniforms.uTrailTexture.value = canvasTexture;
			}
			shaderPass.uniforms.uResolution.value.x = window.innerWidth;
			shaderPass.uniforms.uResolution.value.y = window.innerHeight;
			shaderPass.uniforms.uPixelSize.value = settings.pixelSize;
			shaderPass.uniforms.uIsMobile.value = window.innerWidth < 768;
			shaderPass.renderToScreen = true;
			composer.addPass(shaderPass);

			// Start animation loops
			const clock = new THREE.Clock();

			function animate(timestamp: number) {
				if (shaderPass && canvasTexture) {
					shaderPass.uniforms.uTime.value = clock.getElapsedTime();
					shaderPass.uniforms.uTrailTexture.value = canvasTexture;
				}

				// Update ripple animation
				if (rippleActive && shaderPass) {
					const progress = (timestamp - rippleStart) / rippleDuration;
					if (progress >= 1.0) {
						rippleActive = false;
						shaderPass.uniforms.uRippleActive.value = false;
						shaderPass.uniforms.uRippleProgress.value = 0.0;
					} else {
						shaderPass.uniforms.uRippleProgress.value = progress;
					}
				}

				if (composer) {
					composer.render();
				}

				requestAnimationFrame(animate);
			}

			function renderTrails() {
				if (!trailCanvas) return;
				const ctx = trailCanvas.getContext('2d', { willReadFrequently: true });
				if (!ctx) return;

				ctx.fillStyle = '#000000';
				ctx.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT);
				ctx.imageSmoothingEnabled = LINE_SMOOTHING;
				ctx.imageSmoothingQuality = 'high';

				const now = performance.now();
				paintHistory = paintHistory.filter((trail) => {
					trail.points = trail.points.filter((point) => {
						const age = now - point.creationTime;
						return age < FADE_DURATION_MS;
					});

					if (trail.points.length > 0) {
						trail.points.forEach((point) => {
							const age = now - point.creationTime;
							const opacity = Math.max(0, 1 - age / FADE_DURATION_MS);
							drawGradientCircle(ctx, point.x, point.y, trail.size, opacity);
						});
						return true;
					}
					return false;
				});

				if (canvasTexture) {
					canvasTexture.needsUpdate = true;
				}

				requestAnimationFrame(renderTrails);
			}

			// Start both animation loops
			animate(0);
			renderTrails();
		}

		// Create event handlers
		function handleAutoTrail(event: MouseEvent) {
			if (!currentTrail || currentTrail.points.length > POINTS_THRESHOLD) {
				const position = { x: event.clientX, y: event.clientY };
				const scaledPos = scaleCoordinates(position.x, position.y);

				let isTooCloseToExisting = false;
				if (paintHistory.length > 0) {
					const lastTrail = paintHistory[paintHistory.length - 1];
					if (lastTrail.points.length > 0) {
						const lastPoint = lastTrail.points[lastTrail.points.length - 1];
						isTooCloseToExisting = isTooClose(lastPoint, scaledPos);
					}
				}

				if (!isTooCloseToExisting) {
					createNewTrail(position, settings.trailSize);
				}

				while (paintHistory.length > 20) {
					// Use high quality value
					const oldTrail = paintHistory.shift();
					if (oldTrail) {
						oldTrail.points.forEach((point) => recyclePoint(point));
						recycleTrail(oldTrail);
					}
				}
			}
		}

		function handleMouseDown(event: MouseEvent) {
			const position = {
				x: event.clientX,
				y: event.clientY
			};
			createNewTrail(position, TRAIL_WIDTH_CLICK);
			lastPosition = position;

			// Add ripple effect with proper pixelation
			if (shaderPass && sceneCanvas) {
				const rect = sceneCanvas.getBoundingClientRect();
				const x = (event.clientX - rect.left) / rect.width;
				const y = 1.0 - (event.clientY - rect.top) / rect.height;

				// Use pixelated coordinates for ripple center
				const pixelSize = settings.pixelSize / Math.min(window.innerWidth, window.innerHeight);
				const pixelatedX = Math.floor(x / pixelSize) * pixelSize + pixelSize * 0.5;
				const pixelatedY = Math.floor(y / pixelSize) * pixelSize + pixelSize * 0.5;

				shaderPass.uniforms.uRippleCenter.value.set(pixelatedX, pixelatedY);
				shaderPass.uniforms.uRippleActive.value = true;
				rippleActive = true;
				rippleStart = performance.now();
			}
		}

		function handleMouseUp() {
			currentTrail = null;
		}

		// Add event listeners with the locally defined handlers
		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		window.addEventListener('mousemove', handleAutoTrail, { passive: true });
		window.addEventListener('mousedown', handleMouseDown, { passive: true });
		window.addEventListener('mouseup', handleMouseUp, { passive: true });

		// Initial scroll calculation
		const initialProgress = calculateScrollProgress();
		if (shaderPass) {
			shaderPass.uniforms.uScrollProgress.value = initialProgress;
		}

		// Add scroll event listener
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			// Add GUI disposal to cleanup
			gui.destroy();
			// Cleanup
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mousemove', handleAutoTrail);
			window.removeEventListener('mousedown', handleMouseDown);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);

			if (composer) {
				composer.passes.forEach((pass) => {
					if (pass.dispose) pass.dispose();
				});
			}
			if (renderer) {
				renderer.dispose();
			}
			if (canvasTexture) {
				canvasTexture.dispose();
			}
		};
	});

	function drawGradientCircle(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		radius: number,
		opacity: number
	) {
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
		gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
		gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.7})`);
		gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
	}

	// Get a trail from the pool or create a new one
	function getTrail(size: number): Trail {
		if (trailPool.length > 0) {
			const trail = trailPool.pop()!;
			trail.size = size;
			trail.points = [];
			return trail;
		}
		return { points: [], size };
	}

	// Return a trail to the pool
	function recycleTrail(trail: Trail) {
		if (trailPool.length < 50) {
			trail.points = [];
			trailPool.push(trail);
		}
	}

	// Get a point from the pool or create a new one
	function getPoint(x: number, y: number, time: number): TrailPoint {
		if (pointPool.length > 0) {
			const point = pointPool.pop()!;
			point.x = x;
			point.y = y;
			point.creationTime = time;
			return point;
		}
		return { x, y, creationTime: time };
	}

	// Return a point to the pool
	function recyclePoint(point: TrailPoint) {
		if (pointPool.length < 1000) {
			pointPool.push(point);
		}
	}

	// Check if a point is too close to the previous one
	function isTooClose(p1: { x: number; y: number }, p2: { x: number; y: number }) {
		const dx = p1.x - p2.x;
		const dy = p1.y - p2.y;
		return Math.sqrt(dx * dx + dy * dy) < MIN_POINT_DISTANCE;
	}

	// Scale mouse coordinates to fit within proportional canvas
	function scaleCoordinates(clientX: number, clientY: number) {
		const rect = sceneCanvas?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };

		const scrollY = window.scrollY || window.pageYOffset;
		const x = clientX - rect.left;
		const y = clientY + scrollY - rect.top - scrollY;

		const proportionX = x / rect.width;
		const proportionY = y / rect.height;

		const canvasX = proportionX * canvasWidth;
		const canvasY = proportionY * CANVAS_HEIGHT;

		if (debugMode) {
			console.log({
				input: { clientX, clientY, scrollY },
				rect: { top: rect.top, left: rect.left },
				scaled: { x: canvasX, y: canvasY },
				proportions: { x: proportionX, y: proportionY }
			});
		}

		return { x: canvasX, y: canvasY };
	}

	// Create a new trail with proper initialization
	function createNewTrail(position: { x: number; y: number }, size: number) {
		const scaledPos = scaleCoordinates(position.x, position.y);
		const now = performance.now();
		const newTrail = getTrail(size);
		newTrail.points.push(getPoint(scaledPos.x, scaledPos.y, now));
		currentTrail = newTrail;
		paintHistory.push(newTrail);
	}

	// Handle mouse movement to track cursor
	function handleMouseMove(event: MouseEvent) {
		const currentPosition = {
			x: event.clientX,
			y: event.clientY
		};

		const now = performance.now();

		if (currentTrail) {
			const prevPos = lastPosition;
			const dx = currentPosition.x - prevPos.x;
			const dy = currentPosition.y - prevPos.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			const interpolationDistance = 5;

			if (distance > interpolationDistance * 1.2) {
				const steps = Math.min(
					Math.max(Math.floor(distance / (interpolationDistance * 1.5)), 1),
					5
				);

				for (let i = 1; i <= steps; i++) {
					const ratio = i / (steps + 1);
					const interpolatedPos = {
						x: prevPos.x + dx * ratio,
						y: prevPos.y + dy * ratio
					};

					const scaledPos = scaleCoordinates(interpolatedPos.x, interpolatedPos.y);

					if (
						currentTrail.points.length === 0 ||
						!isTooClose(currentTrail.points[currentTrail.points.length - 1], scaledPos)
					) {
						currentTrail.points.push(getPoint(scaledPos.x, scaledPos.y, now - (steps - i) * 16));
					}
				}
			}

			const scaledPos = scaleCoordinates(currentPosition.x, currentPosition.y);

			if (
				currentTrail.points.length === 0 ||
				!isTooClose(currentTrail.points[currentTrail.points.length - 1], scaledPos)
			) {
				currentTrail.points.push(getPoint(scaledPos.x, scaledPos.y, now));
			}
		}

		lastPosition = currentPosition;
	}

	// Calculate scroll progress
	function calculateScrollProgress() {
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		const scrollHeight =
			document.documentElement.scrollHeight - document.documentElement.clientHeight;
		const progress = Math.min(Math.max(scrollTop / (scrollHeight || 1), 0), 1);
		return progress;
	}

	// Handle scroll event to update shader uniform
	function handleScroll() {
		const progress = calculateScrollProgress();
		if (title) {
			title.style.opacity = Math.max(1.5 - progress * 6, 0).toString();
		}
		if (shaderPass) {
			shaderPass.uniforms.uScrollProgress.value = progress;
		}
	}
</script>

<div class="top-0 left-0 w-full h-[200vh] z-[0]">
	<canvas
		bind:this={sceneCanvas}
		class="w-full h-[300vh]"
		style="position: fixed; top: 0; left: 0; touch-action: none; transform: translate3d(0,0,0); will-change: transform;"
	></canvas>
	<h1
		id="title"
		class="fixed top-[35%] tracking-[-4px] left-[22%] text-black text-[40px] z-10 silkscreen-regular"
	>
		Ales Holman
	</h1>
	<canvas
		bind:this={trailCanvas}
		class={`pointer-events-none ${debugMode ? 'fixed bottom-4 right-4' : 'fixed top-0 left-0 opacity-0'}`}
		style={`width: ${debugMode ? canvasWidth / 2 : canvasWidth}px; height: ${
			debugMode ? CANVAS_HEIGHT / 2 : CANVAS_HEIGHT
		}px; border: ${debugMode ? '2px solid red' : 'none'};`}
	></canvas>
	<!-- Remove the button as we now have GUI controls -->
</div>
