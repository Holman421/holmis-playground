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
				uFbmOffset: { value: new THREE.Vector2(0.0, 0.0) }
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
		};
	});
</script>

<div class="relative">
	<canvas class="webgl" on:mousemove={handleMouseMove}></canvas>
	
	{#if showInfo}
	<div class="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 p-4 text-white text-sm rounded">
		<h2 class="text-xl mb-2">Radar Shader</h2>
		<ul class="list-disc pl-5">
			<li>Use <b>arrow keys</b> to move the pattern</li>
			<li>Interact with the radar using your <b>mouse</b></li>
			<li>Press <b>H</b> to hide this help</li>
		</ul>
	</div>
	{/if}
</div>

<style>
	:global(.webgl) {
		cursor: crosshair;
	}
</style>
