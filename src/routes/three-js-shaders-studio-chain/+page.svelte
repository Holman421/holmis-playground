<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import * as THREE from 'three';
	import { GUI } from 'lil-gui';
	import { EffectComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
	import fragmentShader from './fragment.glsl';
	// Constants from original file
	const CANVAS_HEIGHT = 200;
	const TRAIL_WIDTH_CLICK = 12;
	const TRAIL_WIDTH_AUTO = 10;
	const FADE_DURATION_MS = 500;
	const POINTS_THRESHOLD = 8;
	const MIN_POINT_DISTANCE = 2;
	const LINE_SMOOTHING = true;

	// Performance settings from original file
	const PERFORMANCE = {
		LOW: {
			pixelSize: 60,
			maxTrails: 10,
			canvasScale: 0.5,
			throttleTime: 40,
			interpolationDistance: 8
		},
		MEDIUM: {
			pixelSize: 40,
			maxTrails: 15,
			canvasScale: 0.75,
			throttleTime: 25,
			interpolationDistance: 5
		},
		HIGH: {
			pixelSize: 30,
			maxTrails: 20,
			canvasScale: 1.0,
			throttleTime: 16,
			interpolationDistance: 4
		}
	};

	// Custom shader from original file
	const textureShader = {
		uniforms: {
			tDiffuse: { value: null },
			uTrailTexture: { value: null },
			uTime: { value: 0 },
			uPixelSize: { value: PERFORMANCE.HIGH.pixelSize },
			uResolution: { value: new THREE.Vector2(1, 1) },
			uScrollProgress: { value: 0 },
			uIsMobile: { value: false },
			uPixelationEnabled: { value: true }, // Add new uniform
			uDistortionEnabled: { value: true },
			uDistortionAmount: { value: 1.0 },
			uDistortionSpeed: { value: 1.0 }
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
	let performanceMode: keyof typeof PERFORMANCE = 'HIGH';
	let paintHistory: Trail[] = [];
	let currentTrail: Trail | null = null;
	let lastPosition = { x: 0, y: 0 };
	let trailPool: Trail[] = [];
	let pointPool: TrailPoint[] = [];

	// Add GUI settings object
	const settings = {
		pixelation: true,
		pixelSize: PERFORMANCE.HIGH.pixelSize, // Change to HIGH pixelSize
		debugMode: false,
		performance: 'HIGH', // Change to HIGH
		// Add new settings
		distortion: true,
		distortionAmount: 1.0,
		distortionSpeed: 1.0
	};

	onMount(() => {
		if (!browser) return;

		// Add GUI setup
		const gui = new GUI();
		const effectsFolder = gui.addFolder('Effects');

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
			.add(settings, 'pixelSize', 10, 100, 1)
			.name('Pixel Size')
			.onChange((value: number) => {
				if (shaderPass) {
					shaderPass.uniforms.uPixelSize.value = value;
				}
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

		const debugFolder = gui.addFolder('Debug');
		debugFolder
			.add(settings, 'debugMode')
			.name('Show Debug View')
			.onChange((value: boolean) => {
				debugMode = value;
			});

		debugFolder
			.add(settings, 'performance', ['LOW', 'MEDIUM', 'HIGH'])
			.name('Performance Mode')
			.onChange((value: string) => {
				performanceMode = value as keyof typeof PERFORMANCE;
				if (shaderPass) {
					shaderPass.uniforms.uPixelSize.value = PERFORMANCE[performanceMode].pixelSize;
				}
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
				antialias: performanceMode !== 'LOW',
				alpha: false,
				powerPreference: 'high-performance',
				precision: performanceMode === 'LOW' ? 'lowp' : 'mediump',
				stencil: false,
				depth: false
			});

			renderer.setClearColor(new THREE.Color('#171615'), 1);
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.setPixelRatio(
				Math.min(window.devicePixelRatio, performanceMode === 'LOW' ? 1 : 1.5)
			);

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
			shaderPass.uniforms.uPixelSize.value = PERFORMANCE[performanceMode].pixelSize;
			shaderPass.uniforms.uIsMobile.value = window.innerWidth < 768;
			shaderPass.renderToScreen = true;
			composer.addPass(shaderPass);

			// Start animation loops
			const clock = new THREE.Clock();
			let lastRenderTime = 0;

			function animate(timestamp: number) {
				const delta = timestamp - lastRenderTime;
				const interval = 1000 / (performanceMode === 'LOW' ? 30 : 60);

				if (performanceMode === 'LOW' && delta < interval) {
					requestAnimationFrame(animate);
					return;
				}

				lastRenderTime = timestamp;

				if (shaderPass && canvasTexture) {
					shaderPass.uniforms.uTime.value = clock.getElapsedTime();
					shaderPass.uniforms.uTrailTexture.value = canvasTexture;
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
					createNewTrail(position, TRAIL_WIDTH_AUTO);
				}

				// Limit the number of trails based on performance settings
				const performanceSettings = PERFORMANCE[performanceMode];
				const maxTrails = performanceSettings.maxTrails;

				while (paintHistory.length > maxTrails) {
					const oldTrail = paintHistory.shift();
					if (oldTrail) {
						oldTrail.points.forEach((point) => recyclePoint(point));
						recycleTrail(oldTrail);
					}
				}
			}
		}

		// Throttled version of handleAutoTrail
		let lastTrailTime = 0;
		function throttledAutoTrail(event: MouseEvent) {
			const now = performance.now();
			const performanceSettings = PERFORMANCE[performanceMode];
			const throttleTime = performanceSettings.throttleTime;

			if (now - lastTrailTime > throttleTime) {
				handleAutoTrail(event);
				lastTrailTime = now;
			}
		}

		function handleMouseDown(event: MouseEvent) {
			const position = {
				x: event.clientX,
				y: event.clientY
			};
			createNewTrail(position, TRAIL_WIDTH_CLICK);
			lastPosition = position;
		}

		function handleMouseUp() {
			currentTrail = null;
		}

		// Add event listeners with the locally defined handlers
		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		window.addEventListener('mousemove', throttledAutoTrail, { passive: true });
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
			window.removeEventListener('mousemove', throttledAutoTrail);
			window.removeEventListener('mousedown', handleMouseDown);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('scroll', handleScroll);

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

	function updateCanvasDimensions() {
		if (!browser) return;
		const screenAspect = window.innerWidth / window.innerHeight;
		canvasWidth = Math.round(CANVAS_HEIGHT * screenAspect);
		isMobile = window.innerWidth < 768;

		if (trailCanvas) {
			trailCanvas.width = canvasWidth;
			trailCanvas.height = CANVAS_HEIGHT;
		}
	}

	function initializePools() {
		// Initialize object pools as in original file
	}

	function setupScene() {
		if (!browser || !sceneCanvas) return;

		// Create renderer
		renderer = new THREE.WebGLRenderer({
			canvas: sceneCanvas,
			antialias: performanceMode !== 'LOW',
			alpha: false,
			powerPreference: 'high-performance',
			precision: performanceMode === 'LOW' ? 'lowp' : 'mediump',
			stencil: false,
			depth: false
		});

		renderer.setClearColor(new THREE.Color('#171615'), 1);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(
			Math.min(
				window.devicePixelRatio,
				performanceMode === 'LOW' ? 1 : performanceMode === 'MEDIUM' ? 1.5 : 2
			)
		);

		// Create scene and camera
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.z = 1;

		// Setup post-processing
		composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		// Add custom shader pass
		shaderPass = new ShaderPass(textureShader);
		if (canvasTexture) {
			shaderPass.uniforms.uTrailTexture.value = canvasTexture;
		}
		shaderPass.uniforms.uResolution.value.x = window.innerWidth;
		shaderPass.uniforms.uResolution.value.y = window.innerHeight;
		shaderPass.uniforms.uPixelSize.value = PERFORMANCE[performanceMode].pixelSize;
		shaderPass.uniforms.uIsMobile.value = isMobile;
		shaderPass.renderToScreen = true;
		composer.addPass(shaderPass);
	}

	function setupEventListeners() {
		if (!browser) return;

		// Handle debug mode toggle
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'd') {
				debugMode = !debugMode;
			} else if (e.key === 'p') {
				// Cycle through performance modes
				const modes: Array<keyof typeof PERFORMANCE> = ['LOW', 'MEDIUM', 'HIGH'];
				const currentIndex = modes.indexOf(performanceMode);
				performanceMode = modes[(currentIndex + 1) % modes.length];
				updateCanvasDimensions();
			}
		};

		// Always create trails on mouse move, not just when pressing
		const handleAutoTrail = (event: MouseEvent) => {
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
					createNewTrail(position, TRAIL_WIDTH_AUTO);
				}

				const performanceSettings = PERFORMANCE[performanceMode];
				const maxTrails = performanceSettings.maxTrails;

				while (paintHistory.length > maxTrails) {
					const oldTrail = paintHistory.shift();
					if (oldTrail) {
						oldTrail.points.forEach((point) => recyclePoint(point));
						recycleTrail(oldTrail);
					}
				}
			}
		};

		// Throttled version of handleAutoTrail
		let lastTrailTime = 0;
		const throttledAutoTrail = (event: MouseEvent) => {
			const now = performance.now();
			const performanceSettings = PERFORMANCE[performanceMode];
			const throttleTime = performanceSettings.throttleTime;

			if (now - lastTrailTime > throttleTime) {
				handleAutoTrail(event);
				lastTrailTime = now;
			}
		};

		// Handle mouse down to start painting
		const handleMouseDown = (event: MouseEvent) => {
			const position = {
				x: event.clientX,
				y: event.clientY
			};
			createNewTrail(position, TRAIL_WIDTH_CLICK);
			lastPosition = position;
		};

		// Handle mouse up to stop painting
		const handleMouseUp = () => {
			currentTrail = null;
		};

		// Calculate scroll progress for shader
		const handleScroll = () => {
			const scrollTop = window.scrollY || document.documentElement.scrollTop;
			const scrollHeight =
				document.documentElement.scrollHeight - document.documentElement.clientHeight;
			const progress = Math.min(Math.max(scrollTop / (scrollHeight || 1), 0), 1);

			if (shaderPass) {
				shaderPass.uniforms.uScrollProgress.value = progress;
			}
		};

		// Handle window resize
		const handleResize = () => {
			updateCanvasDimensions();
			const newIsMobile = window.innerWidth < 768;
			isMobile = newIsMobile;

			if (shaderPass) {
				shaderPass.uniforms.uResolution.value.x = window.innerWidth;
				shaderPass.uniforms.uResolution.value.y = window.innerHeight;
				shaderPass.uniforms.uIsMobile.value = newIsMobile;
			}
		};

		// Throttled resize handler
		let resizeTimeout: number | null = null;
		const throttledResize = () => {
			if (resizeTimeout === null) {
				resizeTimeout = window.setTimeout(() => {
					handleResize();
					resizeTimeout = null;
				}, 200);
			}
		};

		// Add all event listeners
		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		window.addEventListener('mousemove', throttledAutoTrail, { passive: true });
		window.addEventListener('mousedown', handleMouseDown, { passive: true });
		window.addEventListener('mouseup', handleMouseUp, { passive: true });
		window.addEventListener('resize', throttledResize);
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('scroll', handleScroll, { passive: true });

		// Use ResizeObserver for more reliable resize detection
		const resizeObserver = new ResizeObserver(handleResize);
		if (sceneCanvas) {
			resizeObserver.observe(sceneCanvas);
		}

		// Store cleanup function
		const cleanup = () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mousemove', throttledAutoTrail);
			window.removeEventListener('mousedown', handleMouseDown);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('resize', throttledResize);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('scroll', handleScroll);
			resizeObserver.disconnect();
		};

		return cleanup;
	}

	function startAnimationLoops() {
		if (!browser) return;

		const clock = new THREE.Clock();
		let lastRenderTime = 0;
		let animationFrameId: number;

		// Main render loop
		function animate(timestamp: number) {
			const delta = timestamp - lastRenderTime;
			const interval = 1000 / (performanceMode === 'LOW' ? 30 : 60);

			if (performanceMode === 'LOW' && delta < interval) {
				animationFrameId = requestAnimationFrame(animate);
				return;
			}

			lastRenderTime = timestamp;
			const elapsedTime = clock.getElapsedTime();

			// Update shader uniforms
			if (shaderPass && canvasTexture) {
				shaderPass.uniforms.uTime.value = elapsedTime;
				shaderPass.uniforms.uTrailTexture.value = canvasTexture;
			}

			// Render scene
			if (composer) {
				composer.render();
			}

			animationFrameId = requestAnimationFrame(animate);
		}

		// Trail rendering loop
		function renderTrails() {
			const now = performance.now();

			if (trailCanvas) {
				const ctx = trailCanvas.getContext('2d', { willReadFrequently: true });
				if (ctx) {
					ctx.fillStyle = '#000000';
					ctx.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT);
					ctx.imageSmoothingEnabled = LINE_SMOOTHING;
					ctx.imageSmoothingQuality = 'high';

					// Update and render trails
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
				}
			}

			requestAnimationFrame(renderTrails);
		}

		// Start both animation loops
		animate(0);
		renderTrails();

		// Store animation frame ID for cleanup
		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}

	function cleanup() {
		if (!browser) return;

		if (composer) {
			composer.passes.forEach((pass: any) => {
				if (pass.dispose) pass.dispose();
			});
		}

		if (renderer) {
			renderer.dispose();
		}

		if (canvasTexture) {
			canvasTexture.dispose();
		}

		// Event listeners will be cleaned up by the function returned from setupEventListeners
	}

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

			const performanceSettings = PERFORMANCE[performanceMode];
			const interpolationDistance = performanceSettings.interpolationDistance;

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
		if (shaderPass) {
			shaderPass.uniforms.uScrollProgress.value = progress;
		}
	}
</script>

<div class="top-0 left-0 w-full h-[200vh] z-[0]">
	<canvas
		bind:this={sceneCanvas}
		class="w-full h-[200vh]"
		style="position: fixed; top: 0; left: 0; touch-action: none; transform: translate3d(0,0,0); will-change: transform;"
	></canvas>
	<canvas
		bind:this={trailCanvas}
		class={`pointer-events-none ${debugMode ? 'fixed bottom-4 right-4' : 'fixed top-0 left-0 opacity-0'}`}
		style={`width: ${debugMode ? canvasWidth / 2 : canvasWidth}px; height: ${
			debugMode ? CANVAS_HEIGHT / 2 : CANVAS_HEIGHT
		}px; border: ${debugMode ? '2px solid red' : 'none'};`}
	></canvas>
	<!-- Remove the button as we now have GUI controls -->
</div>
