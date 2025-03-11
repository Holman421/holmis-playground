<script lang="ts">
	import * as THREE from 'three';
	import { onMount } from 'svelte';
	import GUI from 'lil-gui';
	import fragmentShaderRadar from './shaders/fragmentRadar.glsl';
	import vertexShader from './shaders/vertexRadar.glsl';
	import { createRadarDebugObject } from './utils/radarUtils';

	// Mouse position tracking
	let mouseX = -10.0; // Initialize way off-screen
	let mouseY = -10.0; // Initialize way off-screen

	// FBM movement state
	let isFbmMovingLeft = false;
	let isFbmMovingRight = false;
	let isFbmMovingUp = false;
	let isFbmMovingDown = false;

	// Debug object for GUI controls
	let debugObject = createRadarDebugObject();

	// Raycaster for proper mouse position tracking
	const raycaster = new THREE.Raycaster();
	const mouseVector = new THREE.Vector2();

	// Clock for time management
	let clock: THREE.Clock;

	// Add info text toggle
	let showInfo = true;

	// Add proximity state
	let nearestPoint = 0;

	function randomInRange(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}

	// Add deletion time to pulse interface
	const INITIAL_PULSES = [
		{ x: randomInRange(-1, 1), y: randomInRange(-1, 1), timeOffset: 0.0, deletionTime: -1 },
		{ x: randomInRange(-1, 1), y: randomInRange(-1, 1), timeOffset: 10.0, deletionTime: -1 },
		{ x: randomInRange(-1, 1), y: randomInRange(-1, 1), timeOffset: 20.0, deletionTime: -1 },
		{ x: randomInRange(-1, 1), y: randomInRange(-1, 1), timeOffset: 30.0, deletionTime: -1 },
		{ x: randomInRange(-1, 1), y: randomInRange(-1, 1), timeOffset: 40.0, deletionTime: -1 },
		{ x: randomInRange(-1, 1), y: randomInRange(-1, 1), timeOffset: 50.0, deletionTime: -1 }
	];

	// Convert pulses to flat array for shader
	function pulsesToArray(
		pulses: Array<{ x: number; y: number; timeOffset: number; deletionTime: number }>
	) {
		return pulses.flatMap((p) => [p.x, p.y, p.timeOffset, p.deletionTime]);
	}

	let activePulses = [...INITIAL_PULSES];

	// Add at the top with other state variables
	let lastDeletionTime = 0;
	const DELETION_COOLDOWN = 0.5; // seconds

	// Add near the other state variables
	let remainingPulses = INITIAL_PULSES.length;
	let isComplete = false;

	// Add timer state
	let elapsedTime = 0;
	let timerInterval: NodeJS.Timer;
	let finalTime = 0;

	function handleMouseMove(event: MouseEvent) {
		// Get the canvas element
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		if (!canvas) return;

		// Calculate normalized device coordinates (-1 to +1)
		const rect = canvas.getBoundingClientRect();
		mouseVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouseVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		// Update the raycaster with camera and mouse position
		if (raycaster && camera) {
			raycaster.setFromCamera(mouseVector, camera);

			// Calculate intersection with the radar plane
			const intersects = raycaster.intersectObject(plane);

			if (intersects.length > 0 && intersects[0].uv) {
				// Get exact UV coordinates from intersection point
				mouseX = intersects[0].uv.x;
				mouseY = intersects[0].uv.y;
			}
		}
	}

	// Keydown event handler for FBM movement
	function handleKeyDown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
				isFbmMovingLeft = true;
				event.preventDefault();
				break;
			case 'ArrowRight':
				isFbmMovingRight = true;
				event.preventDefault();
				break;
			case 'ArrowUp':
				isFbmMovingUp = true;
				event.preventDefault();
				break;
			case 'ArrowDown':
				isFbmMovingDown = true;
				event.preventDefault();
				break;
			case 'h': // Toggle help/info text
				showInfo = !showInfo;
				break;
			case ' ': // Space key
				deleteNearestPulse();
				event.preventDefault();
				break;
		}
	}

	// Keyup event handler for FBM movement
	function handleKeyUp(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
				isFbmMovingLeft = false;
				event.preventDefault();
				break;
			case 'ArrowRight':
				isFbmMovingRight = false;
				event.preventDefault();
				break;
			case 'ArrowUp':
				isFbmMovingUp = false;
				event.preventDefault();
				break;
			case 'ArrowDown':
				isFbmMovingDown = false;
				event.preventDefault();
				break;
		}
	}

	// Function to update FBM offset
	function updateFbmOffset(deltaTime: number) {
		let changed = false;

		// Get speed from debugObject
		const moveSpeed = debugObject.fbmMoveSpeed;

		// Apply movement based on key state
		if (isFbmMovingLeft) {
			debugObject.fbmOffsetX -= moveSpeed * deltaTime;
			changed = true;
		}
		if (isFbmMovingRight) {
			debugObject.fbmOffsetX += moveSpeed * deltaTime;
			changed = true;
		}
		if (isFbmMovingUp) {
			debugObject.fbmOffsetY += moveSpeed * deltaTime;
			changed = true;
		}
		if (isFbmMovingDown) {
			debugObject.fbmOffsetY -= moveSpeed * deltaTime;
			changed = true;
		}

		// Update shader uniforms if changed
		if (changed && material) {
			material.uniforms.uFbmOffset.value.x = debugObject.fbmOffsetX;
			material.uniforms.uFbmOffset.value.y = debugObject.fbmOffsetY;
		}
	}

	// Proximity check function
	function checkPulseProximity(fbmOffset: THREE.Vector2, fbmScale: number): number {
		const distances = activePulses
			.filter((pulse) => pulse.x > -5 && pulse.deletionTime === -1)
			.map((pulse) => {
				const adjustedX = pulse.x - fbmOffset.x * fbmScale;
				const adjustedY = pulse.y - fbmOffset.y * fbmScale;
				return Math.sqrt(adjustedX * adjustedX + adjustedY * adjustedY) * 10;
			});

		return distances.length ? +Math.min(...distances).toFixed(2) : 1.0;
	}

	// Function to delete nearest pulse if within range
	function deleteNearestPulse() {
		const currentTime = material.uniforms.uTime.value;

		// Check cooldown
		if (currentTime - lastDeletionTime < DELETION_COOLDOWN) {
			return;
		}

		const fbmScale = 0.3;
		let nearestDist = Infinity;
		let nearestIndex = -1;

		// Calculate adjusted positions and distances for all pulses
		const adjustedPulses = activePulses
			.map((pulse, index) => {
				if (pulse.deletionTime === -1 && pulse.x > -5) {
					const adjustedX = pulse.x - material.uniforms.uFbmOffset.value.x * fbmScale;
					const adjustedY = pulse.y - material.uniforms.uFbmOffset.value.y * fbmScale;
					const dist = Math.sqrt(adjustedX * adjustedX + adjustedY * adjustedY);
					return { dist, index };
				}
				return null;
			})
			.filter((p) => p !== null);

		// Find the nearest pulse
		adjustedPulses.forEach((pulse) => {
			if (pulse.dist < 0.1 && pulse.dist < nearestDist) {
				nearestDist = pulse.dist;
				nearestIndex = pulse.index;
			}
		});

		if (nearestIndex !== -1) {
			// Update last deletion time
			lastDeletionTime = currentTime;

			// Update pulse with deletion time first
			activePulses[nearestIndex] = {
				...activePulses[nearestIndex],
				deletionTime: currentTime
			};

			// Update shader uniforms with new state
			material.uniforms.uPulses.value = pulsesToArray(activePulses);

			// Move pulse off-screen after flash duration
			setTimeout(() => {
				if (activePulses[nearestIndex]) {
					activePulses[nearestIndex].x = -10;
					activePulses[nearestIndex].y = -10;
					material.uniforms.uPulses.value = pulsesToArray(activePulses);
				}
			}, DELETION_COOLDOWN * 1000);

			// Update remaining pulses count
			remainingPulses = activePulses.filter((p) => p.deletionTime === -1).length;

			// Check for completion
			if (remainingPulses === 0) {
				isComplete = true;
				finalTime = elapsedTime; // Store final time when complete
			}
		}
	}

	function resetGame() {
		// Reset pulses to initial state
		activePulses = INITIAL_PULSES.map((p) => ({ ...p, deletionTime: -1 }));
		material.uniforms.uPulses.value = pulsesToArray(activePulses);

		// Reset game state
		remainingPulses = INITIAL_PULSES.length;
		isComplete = false;
		lastDeletionTime = 0;

		// Reset timer
		elapsedTime = 0;
		finalTime = 0;
	}

	// Setup GUI controls
	function setupRadarGUI(gui: GUI) {
		const folder = gui.addFolder('Radar Settings');

		// FBM offset controls
		const fbmFolder = folder.addFolder('FBM Movement');
		fbmFolder.add(debugObject, 'fbmOffsetX', -2, 2, 0.01).name('FBM Offset X');
		fbmFolder.add(debugObject, 'fbmOffsetY', -2, 2, 0.01).name('FBM Offset Y');
		fbmFolder.add(debugObject, 'fbmMoveSpeed', 0.1, 2, 0.1).name('FBM Move Speed');

		// Color controls could be added here if needed

		return folder;
	}

	// Scene elements
	let camera: THREE.PerspectiveCamera;
	let scene: THREE.Scene;
	let renderer: THREE.WebGLRenderer;
	let plane: THREE.Mesh;
	let material: THREE.ShaderMaterial;

	onMount(() => {
		// Initialize clock
		clock = new THREE.Clock();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56, // Adjust for header
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		// Scene
		scene = new THREE.Scene();

		// Camera
		camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 0, 4);
		scene.add(camera);

		// Create shader material
		material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader: fragmentShaderRadar,
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
				uMouse: { value: new THREE.Vector2(-10, -10) }, // Initialize off-screen
				uFbmOffset: { value: new THREE.Vector2(0.0, 0.0) },
				uPulseCount: { value: INITIAL_PULSES.length }, // Add pulse count
				uPulses: {
					value: pulsesToArray(INITIAL_PULSES.map((p) => ({ ...p, deletionTime: -1 })))
				}
			}
		});

		// Create plane
		plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 2), material);
		scene.add(plane);

		// Initialize GUI
		const gui = new GUI({ width: 325 });
		setupRadarGUI(gui);

		// Renderer
		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Start timer
		timerInterval = setInterval(() => {
			if (!isComplete) {
				elapsedTime++;
			}
		}, 1000);

		// Event listeners
		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update camera
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);

			// Update resolution uniform
			material.uniforms.uResolution.value.set(sizes.width, sizes.height);
		});

		// Add key event listeners
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		// Animation loop
		let lastTime = performance.now();
		const tick = () => {
			const currentTime = performance.now();
			const deltaTime = (currentTime - lastTime) / 1000;
			lastTime = currentTime;

			// Update FBM offset based on key presses
			updateFbmOffset(deltaTime);

			// Update time uniform
			material.uniforms.uTime.value = clock.getElapsedTime();

			// Update mouse position uniform
			material.uniforms.uMouse.value.set(mouseX, mouseY);

			// Update all pulse positions
			const fbmScale = 0.3;
			activePulses.forEach((pulse, i) => {
				const baseIdx = i * 4;
				if (pulse.deletionTime === -1 && pulse.x > -5) {
					// Only update active pulse positions
					material.uniforms.uPulses.value[baseIdx] =
						pulse.x - material.uniforms.uFbmOffset.value.x * fbmScale;
					material.uniforms.uPulses.value[baseIdx + 1] =
						pulse.y - material.uniforms.uFbmOffset.value.y * fbmScale;
				} else if (pulse.deletionTime > 0) {
					// Keep deleted pulses in place during flash effect
					material.uniforms.uPulses.value[baseIdx] = pulse.x;
					material.uniforms.uPulses.value[baseIdx + 1] = pulse.y;
				}
			});

			// Update proximity state
			nearestPoint = checkPulseProximity(material.uniforms.uFbmOffset.value, fbmScale);

			// Render
			renderer.render(scene, camera);

			// Loop
			window.requestAnimationFrame(tick);
		};

		tick();

		return () => {
			// Cleanup
			gui.destroy();
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			renderer.dispose();
			scene.remove(plane);
			material.dispose();
			(plane.geometry as THREE.BufferGeometry).dispose();
			clearInterval(timerInterval);
		};
	});
</script>

<div class="relative">
	<canvas class="webgl" on:mousemove={handleMouseMove}></canvas>

	{#if showInfo}
		<div
			class="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 p-4 text-white text-sm rounded"
		>
			<h2 class="text-xl mb-2">Radar Shader</h2>
			<ul class="list-disc pl-5">
				<li>Use <b>arrow keys</b> to move the radar</li>
				<li>Press <b>SPACE</b> to delete detected targets</li>
				<li>Press <b>H</b> to hide this help</li>
			</ul>
		</div>
	{/if}

	<!-- Stats display -->
	<div class="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
		<!-- Nearest point info -->
		<div
			class="p-3 text-white text-sm rounded transition-colors duration-300"
			class:bg-red-500={nearestPoint < 1}
			class:bg-black={nearestPoint < 1}
			class:bg-opacity-75={nearestPoint < 1}
		>
			{`Nearest target: ${nearestPoint} meters`}
		</div>

		<!-- Stats and completion message -->
		<div
			class="bg-black bg-opacity-75 pb-2 text-white text-sm rounded flex flex-col items-center gap-2"
		>
			<div>Pulses remaining: {remainingPulses}</div>
			<div>
				Time: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
			</div>
			{#if isComplete}
				<div class="text-green-400 font-bold">Area Cleared! Well Done!</div>
			{/if}
		</div>
	</div>

	{#if isComplete}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
			<div class="bg-gray-800 p-8 rounded-lg text-center">
				<h2 class="text-3xl text-green-400 font-bold mb-4">Area Cleared!</h2>
				<p class="text-white mb-2">All targets have been eliminated</p>
				<p class="text-white mb-6">
					Final Time: {Math.floor(finalTime / 60)}:{(finalTime % 60).toString().padStart(2, '0')}
				</p>
				<button
					class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
					on:click={resetGame}
				>
					Reset Area
				</button>
			</div>
		</div>
	{/if}
</div>
