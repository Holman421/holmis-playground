<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import vertexShader from './shaders/vertex.glsl';
	import fragmentShader from './shaders/fragment.glsl';
	import fragmentShader2 from './shaders/fragment2.glsl';
	import fragmentShader3 from './shaders/fragment3.glsl';
	import fragmentShader4 from './shaders/fragment4.glsl';
	import fragmentShader5 from './shaders/fragment5.glsl';
	import fragmentShader6 from './shaders/fragment6.glsl';
	import fragmentShader7 from './shaders/fragment7.glsl';
	import fragmentShader8 from './shaders/fragment8.glsl';
	import fragmentShader9 from './shaders/fragment9.glsl';
	import fragmentShader10 from './shaders/fragment10.glsl';
	import {
		createDefaultDebugObjects,
		setupShader3GUI,
		setupShader4GUI,
		setupShader9GUI,
		setupShader10GUI,
		type ShaderDebugObjects
	} from './utils/guiUtils';
	import type {
		BaseUniforms,
		Shader1Uniforms,
		Shader3Uniforms,
		Shader4Uniforms,
		Shader5Uniforms,
		Shader6Uniforms,
		ShaderMeshType
	} from './types';

	let currentShader = $state(9);
	let planes: ShaderMeshType[] = [];
	let guiFolders: GUI[] = [];
	const shaders = [
		fragmentShader,
		fragmentShader2,
		fragmentShader3,
		fragmentShader4,
		fragmentShader5,
		fragmentShader6,
		fragmentShader7,
		fragmentShader8,
		fragmentShader9,
		fragmentShader10
	];

	let isMovingLeft = false;
	let isMovingRight = false;
	let isMovingUp = false;
	let isMovingDown = false;
	let moveSpeed = 0.5; // Units per second
	let isPaused = false; // Add pause state
	let wheelSensitivity = 0.15; // Adjusted wheel sensitivity

	let isDragging = false;
	let lastMouseX = 0;
	let lastMouseY = 0;
	// Adjust dragSensitivity base value
	let dragSensitivity = 0.002; // Reduced base sensitivity

	// Add control state
	let controls: OrbitControls;

	// Replace targetScale and currentScale with zoom-specific variables
	let targetZoom = 1.0;
	let currentZoom = 1.0;

	// Add debugObjects to component scope
	let debugObjects: ShaderDebugObjects = createDefaultDebugObjects();

	// Add clock to component scope
	let clock = new THREE.Clock();

	// Modify time control variables
	let shader9Time = 0;
	let targetShader9Time = 0; // Add this line
	const TIME_ADJUSTMENT_FACTOR = 0.2; // Reduced for finer control
	const TIME_SMOOTHING = 0.1; // Add this line for smooth interpolation
	let lastFrameTime = 0;

	// Add these variables near the top with other state variables
	let timeAdjustInterval: number | NodeJS.Timeout | null = null;
	let timeAdjustDirection: 1 | -1 = 1;

	// Add raycaster for proper mouse position tracking
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	// Add mouse position tracking for shader 10
	let mouseX = -10.0; // Initialize way off-screen instead of 0.5
	let mouseY = -10.0; // Initialize way off-screen instead of 0.5

	// Reference to camera for raycaster
	let camera: THREE.PerspectiveCamera;

	// Add FBM movement state for shader 10
	let isFbmMovingLeft = false;
	let isFbmMovingRight = false;
	let isFbmMovingUp = false;
	let isFbmMovingDown = false;

	function handleMouseMoveForShader10(event: MouseEvent) {
		if (currentShader === 9 && planes[9]) {
			// Shader 10 has index 9
			// Get the canvas element
			const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
			if (!canvas) return;

			// Calculate normalized device coordinates (-1 to +1)
			const rect = canvas.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			// Update the raycaster with camera and mouse position
			raycaster.setFromCamera(mouse, camera);

			// Calculate intersection with the shader 10 plane
			const intersects = raycaster.intersectObject(planes[9]);

			if (intersects.length > 0 && intersects[0].uv) {
				// Get exact UV coordinates from intersection point
				mouseX = intersects[0].uv.x;
				mouseY = intersects[0].uv.y;
			}
		}
	}

	// Move updateGUIVisibility to component scope
	function updateGUIVisibility() {
		guiFolders.forEach((folder, index) => {
			if (index === currentShader) {
				folder.show();
			} else {
				folder.hide();
			}
		});
	}

	// Replace the updateGUIValue function with this improved version
	function updateGUIValue(folder: GUI | undefined, propertyPath: string, value: any) {
		if (!folder) return;

		// Find all controllers in the folder
		const controllers = folder.controllers;
		const controller = controllers.find((c) => c.property === propertyPath);
		if (controller) {
			// Update both the controller's value and the underlying object
			(controller.object as Record<string, unknown>)[controller.property] = value;
			controller.updateDisplay();
		}
	}

	// Add movement animation
	function updateMovement(debugObjects: ShaderDebugObjects) {
		let lastTime = performance.now();
		let animationFrameId: number;

		function animate(currentTime: number) {
			const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
			lastTime = currentTime;

			if (currentShader === 8) {
				let changed = false;
				if (isMovingLeft) {
					debugObjects.shader9.offsetX -= moveSpeed * deltaTime;
					changed = true;
				}
				if (isMovingRight) {
					debugObjects.shader9.offsetX += moveSpeed * deltaTime;
					changed = true;
				}
				if (isMovingUp) {
					debugObjects.shader9.offsetY += moveSpeed * deltaTime;
					changed = true;
				}
				if (isMovingDown) {
					debugObjects.shader9.offsetY -= moveSpeed * deltaTime;
					changed = true;
				}

				if (changed && planes[8]) {
					const material = planes[8].material as THREE.ShaderMaterial;
					material.uniforms.uOffsetX.value = debugObjects.shader9.offsetX;
					material.uniforms.uOffsetY.value = debugObjects.shader9.offsetY;
					// Update GUI values
					updateGUIValue(guiFolders[8], 'offsetX', debugObjects.shader9.offsetX);
					updateGUIValue(guiFolders[8], 'offsetY', debugObjects.shader9.offsetY);
				}
			}

			animationFrameId = requestAnimationFrame(animate);
		}

		animationFrameId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationFrameId);
	}

	// Add time control functions
	function togglePause() {
		isPaused = !isPaused;
		if (!isPaused) {
			lastFrameTime = performance.now();
		}
	}

	// Update adjustTime function to directly modify shader9Time
	function adjustTime(direction: 1 | -1) {
		if (isPaused) {
			// Direct time adjustment when paused
			targetShader9Time = shader9Time + direction * TIME_ADJUSTMENT_FACTOR;
		} else {
			// Speed adjustment when not paused
			targetShader9Time += direction * TIME_ADJUSTMENT_FACTOR;
		}
	}

	// Add these new functions
	function startTimeAdjust(direction: 1 | -1) {
		// Clear any existing interval
		if (timeAdjustInterval) {
			clearInterval(timeAdjustInterval);
		}

		// Set direction and do initial adjustment
		timeAdjustDirection = direction;
		adjustTime(direction);

		// Start continuous adjustment
		timeAdjustInterval = setInterval(() => {
			adjustTime(direction);
		}, 50); // Adjust every 50ms
	}

	function stopTimeAdjust() {
		if (timeAdjustInterval) {
			clearInterval(timeAdjustInterval);
			timeAdjustInterval = null;
		}
	}

	function handleMouseDown(event: MouseEvent) {
		if (currentShader === 8) {
			isDragging = true;
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
		}
	}

	// Update the movement handler to be zoom-aware
	function handleMouseMove(event: MouseEvent) {
		if (isDragging && currentShader === 8 && planes[8]) {
			const material = planes[8].material as THREE.ShaderMaterial;
			const currentZoomValue = material.uniforms.uZoom.value;

			// Scale sensitivity inversely with zoom level (divide by zoom instead of multiply)
			const adjustedSensitivity = dragSensitivity / currentZoomValue;
			const deltaX = (event.clientX - lastMouseX) * adjustedSensitivity;
			const deltaY = (event.clientY - lastMouseY) * adjustedSensitivity;
			const newOffsetX = material.uniforms.uOffsetX.value - deltaX;
			const newOffsetY = material.uniforms.uOffsetY.value + deltaY;

			// Rest of the existing function...
			material.uniforms.uOffsetX.value = newOffsetX;
			material.uniforms.uOffsetY.value = newOffsetY;
			debugObjects.shader9.offsetX = newOffsetX;
			debugObjects.shader9.offsetY = newOffsetY;
			updateGUIValue(guiFolders[8], 'offsetX', newOffsetX);
			updateGUIValue(guiFolders[8], 'offsetY', newOffsetY);
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	// Add this helper function after other function declarations
	function lerp(start: number, end: number, factor: number): number {
		return start + (end - start) * factor;
	}

	// Update the wheel handler
	function handleWheel(event: WheelEvent) {
		if (currentShader === 8 && planes[8]) {
			event.preventDefault();
			const delta = event.deltaY > 0 ? 0.9 : 1.1; // Inverted for natural zoom direction
			targetZoom *= delta;
			// Update zoom limits from 10.0 to 50.0
			targetZoom = Math.max(0.01, Math.min(targetZoom, 50.0));

			if (planes[8]) {
				const material = planes[8].material as THREE.ShaderMaterial;
				currentZoom = lerp(currentZoom, targetZoom, wheelSensitivity);
				material.uniforms.uZoom.value = currentZoom;
				// Update debugObjects and GUI
				debugObjects.shader9.zoom = currentZoom;
				updateGUIValue(guiFolders[8], 'zoom', currentZoom);
			}
		}
	}

	// Add keydown and keyup event handlers for shader 10 FBM movement
	function handleKeyDown(event: KeyboardEvent) {
		if (currentShader === 9) {
			// Shader 10 has index 9
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
			}
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (currentShader === 9) {
			// Shader 10 has index 9
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
	}

	// Add a function to update FBM offset
	function updateFbmOffset(deltaTime: number) {
		if (currentShader === 9 && planes[9]) {
			let changed = false;

			// Get speed directly from debugObjects
			const moveSpeed = debugObjects.shader10.fbmMoveSpeed;

			// Apply movement based on key state
			if (isFbmMovingLeft) {
				debugObjects.shader10.fbmOffsetX -= moveSpeed * deltaTime;
				changed = true;
			}
			if (isFbmMovingRight) {
				debugObjects.shader10.fbmOffsetX += moveSpeed * deltaTime;
				changed = true;
			}
			if (isFbmMovingUp) {
				debugObjects.shader10.fbmOffsetY += moveSpeed * deltaTime;
				changed = true;
			}
			if (isFbmMovingDown) {
				debugObjects.shader10.fbmOffsetY -= moveSpeed * deltaTime;
				changed = true;
			}

			// Update shader uniforms if changed
			if (changed) {
				const material = planes[9].material as THREE.ShaderMaterial;
				material.uniforms.uFbmOffset.value.x = debugObjects.shader10.fbmOffsetX;
				material.uniforms.uFbmOffset.value.y = debugObjects.shader10.fbmOffsetY;

				// Update GUI values
				updateGUIValue(guiFolders[9], 'fbmOffsetX', debugObjects.shader10.fbmOffsetX);
				updateGUIValue(guiFolders[9], 'fbmOffsetY', debugObjects.shader10.fbmOffsetY);
			}
		}
	}

	$effect(() => {
		const gui = new GUI({ width: 325 });
		// Remove debugObjects initialization from here since it's now at component scope

		// Add cleanup for movement animation
		const cleanupMovement = updateMovement(debugObjects);

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		// Scene
		const scene = new THREE.Scene();

		// Camera (needs to be initialized before planes for raycasting setup)
		camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-0, 0, 4);
		scene.add(camera);

		// Store planes in component scope
		planes = shaders.map((shader, index) => {
			const baseUniforms: BaseUniforms = {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) }
			};

			let uniforms = baseUniforms;
			if (index === 0) {
				uniforms = {
					...baseUniforms,
					uColorA: { value: new THREE.Color(debugObjects.shader1.colorA) },
					uColorB: { value: new THREE.Color(debugObjects.shader1.colorB) }
				} as Shader1Uniforms;
			} else if (index === 2) {
				uniforms = {
					...baseUniforms,
					uTimeScale: { value: debugObjects.shader3.timeScale },
					uNoiseScale: { value: debugObjects.shader3.noiseScale },
					uDistortScale: { value: debugObjects.shader3.distortScale }
				} as Shader3Uniforms;
			} else if (index === 3) {
				uniforms = {
					...baseUniforms,
					uColorA: { value: new THREE.Color(debugObjects.shader4.colorA) },
					uColorB: { value: new THREE.Color(debugObjects.shader4.colorB) },
					uColorC: { value: new THREE.Color(debugObjects.shader4.colorC) },
					uSpeed: { value: debugObjects.shader4.speed },
					uNoiseScale: { value: debugObjects.shader4.noiseScale },
					uEdgeIntensity: { value: debugObjects.shader4.edgeIntensity },
					uVignetteIntensity: { value: debugObjects.shader4.vignetteIntensity },
					uHighlightColor: { value: new THREE.Color(debugObjects.shader4.highlightColor) },
					uHighlightIntensity: { value: debugObjects.shader4.highlightIntensity },
					uNormalInfluence: { value: debugObjects.shader4.normalInfluence }
				} as Shader4Uniforms;
			} else if (index === 4) {
				uniforms = {
					...baseUniforms,
					uNoiseScale: { value: debugObjects.shader5.noiseScale }
				} as Shader5Uniforms;
			} else if (index === 5) {
				uniforms = {
					...baseUniforms,
					uBaseColor1: { value: new THREE.Color(debugObjects.shader6.shader6BaseColor1) },
					uBaseColor2: { value: new THREE.Color(debugObjects.shader6.shader6BaseColor2) },
					uAccentColor1: { value: new THREE.Color(debugObjects.shader6.shader6AccentColor1) },
					uAccentColor2: { value: new THREE.Color(debugObjects.shader6.shader6AccentColor2) },
					uAccentColor3: { value: new THREE.Color(debugObjects.shader6.shader6AccentColor3) },
					uAccentColor4: { value: new THREE.Color(debugObjects.shader6.shader6AccentColor4) },
					uNoiseScale: { value: debugObjects.shader6.shader6NoiseScale },
					uTimeScale: { value: debugObjects.shader6.shader6TimeScale },
					uContrast: { value: debugObjects.shader6.shader6Contrast },
					uVignetteIntensity: { value: debugObjects.shader6.shader6VignetteIntensity }
				} as Shader6Uniforms;
			} else if (index === 8) {
				uniforms = {
					...baseUniforms,
					uSpeed: { value: debugObjects.shader9.speed },
					uNoiseScale: { value: debugObjects.shader9.noiseScale },
					uOctaves: { value: debugObjects.shader9.uOctaves },
					uColor1: { value: new THREE.Color(debugObjects.shader9.color1) },
					uColor2: { value: new THREE.Color(debugObjects.shader9.color2) },
					uColor3: { value: new THREE.Color(debugObjects.shader9.color3) },
					uColor4: { value: new THREE.Color(debugObjects.shader9.color4) },
					uOffsetX: { value: debugObjects.shader9.offsetX },
					uOffsetY: { value: debugObjects.shader9.offsetY },
					uZoom: { value: debugObjects.shader9.zoom } // Add this line
				};
			} else if (index === 9) {
				// shader 10
				uniforms = {
					...baseUniforms,
					uCameraPosition: { value: new THREE.Vector3(3.0, 0.8, 0.0) },
					uMouse: { value: new THREE.Vector2(0.5, 0.5) }, // Initialize mouse position at center
					uFbmOffset: { value: new THREE.Vector2(0.0, 0.0) } // Add FBM offset uniform
				};
			}

			const plane = new THREE.Mesh(
				new THREE.PlaneGeometry(2, 2, 2),
				new THREE.ShaderMaterial({
					vertexShader,
					fragmentShader: shader,
					uniforms
				})
			) as ShaderMeshType;
			plane.visible = index === currentShader;
			scene.add(plane);
			return plane;
		});

		guiFolders = shaders.map((_, index) => {
			const folder = gui.addFolder(`Shader ${index + 1} Settings`);
			folder.hide();

			// Setup GUI controls based on shader index
			if (index === 2) {
				setupShader3GUI({ folder, plane: planes[index], debugObject: debugObjects.shader3 });
			} else if (index === 3) {
				setupShader4GUI({ folder, plane: planes[index], debugObject: debugObjects.shader4 });
			} else if (index === 8) {
				setupShader9GUI({ folder, plane: planes[index], debugObject: debugObjects.shader9 });
			} else if (index === 9) {
				// Add GUI controls for shader 10
				setupShader10GUI({ folder, plane: planes[index], debugObject: debugObjects.shader10 });
			}

			return folder;
		});

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

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
			planes.forEach((plane) => {
				(plane.material as THREE.ShaderMaterial).uniforms.uResolution.value.set(
					sizes.width,
					sizes.height
				);
			});
		});

		// Controls
		controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;
		controls.enabled = currentShader !== 8; // Initially disable if on shader 9

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Add key event listeners
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		// No more fbmSpeedChanged event listener

		// Animate
		let animationFrameId: number;
		const tick = () => {
			const currentTime = performance.now();
			const deltaTime = (currentTime - lastFrameTime) / 1000;
			lastFrameTime = currentTime;

			if (currentShader === 8) {
				// Update shader9Time with smooth interpolation
				if (!isPaused) {
					shader9Time = lerp(shader9Time, targetShader9Time, TIME_SMOOTHING);
					targetShader9Time += deltaTime; // Continue automatic progression
				} else {
					// When paused, only interpolate to target without adding time
					shader9Time = lerp(shader9Time, targetShader9Time, TIME_SMOOTHING);
				}
			}

			// Update zoom interpolation
			if (currentShader === 8 && planes[8]) {
				currentZoom = lerp(currentZoom, targetZoom, wheelSensitivity);
				const material = planes[8].material as THREE.ShaderMaterial;
				material.uniforms.uZoom.value = currentZoom;
				// Update debugObjects and GUI
				debugObjects.shader9.zoom = currentZoom;
				updateGUIValue(guiFolders[8], 'zoom', currentZoom);
			}

			// Update FBM offset for shader 10
			updateFbmOffset(deltaTime);

			// Update shader uniforms
			planes.forEach((plane, index) => {
				const material = plane.material as THREE.ShaderMaterial;
				// Use shader9Time only for shader 9, regular time for others
				if (index === 8) {
					material.uniforms.uTime.value = shader9Time;
				} else if (index === 9) {
					// For shader 10, update both time and mouse position
					material.uniforms.uTime.value = clock.getElapsedTime();
					material.uniforms.uMouse.value.set(mouseX, mouseY);
				} else {
					material.uniforms.uTime.value = clock.getElapsedTime();
				}
			});

			controls.update();

			renderer.render(scene, camera);
			animationFrameId = window.requestAnimationFrame(tick);
		};

		lastFrameTime = performance.now();
		tick();

		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			cleanupMovement();
			planes = []; // Clean up planes reference
			guiFolders = []; // Clean up folders reference
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});

	$effect(() => {
		planes.forEach((plane, index) => {
			plane.visible = index === currentShader;
		});
		updateGUIVisibility();

		// Disable/enable controls based on shader
		if (controls) {
			controls.enabled = currentShader !== 8 && currentShader !== 9;
		}

		// Reset mouse position to off-screen when switching to shader 10
		if (currentShader === 9) {
			mouseX = -10.0;
			mouseY = -10.0;
		}
	});

	function switchShader(index: number) {
		currentShader = index;
	}
</script>

<div>
	<canvas
		class="webgl"
		onmousedown={handleMouseDown}
		onmousemove={(e) => {
			handleMouseMove(e);
			handleMouseMoveForShader10(e);
		}}
		onmouseup={handleMouseUp}
		onmouseleave={(e) => {
			handleMouseUp();
			// Don't reset mouse position when mouse leaves canvas
			// Remove or comment out the reset code that was here
		}}
		onwheel={handleWheel}
	></canvas>
	<div class="absolute top-0 h-[calc(100vh-56px)] flex items-end">
		<div class="absolute bottom-0 flex flex-col gap-2 left-4 bg-black p-2">
			{#each shaders as _, index}
				<button
					class="whitespace-nowrap border py-1 px-2"
					class:active={currentShader === index}
					onclick={() => switchShader(index)}
				>
					Shader {index + 1}
				</button>
			{/each}
		</div>
	</div>
	{#if currentShader === 8}
		<button
			class="bg-black border size-10 flex justify-center items-center absolute top-24 right-[29%]"
			onclick={togglePause}
		>
			{isPaused ? '▶' : '⏸'}
		</button>
		<button
			class="bg-black border size-10 flex justify-center items-center absolute top-24 right-[26%]"
			onmousedown={() => startTimeAdjust(1)}
			onmouseup={stopTimeAdjust}
			onmouseleave={stopTimeAdjust}
		>
			+
		</button>
		<button
			class="bg-black border size-10 flex justify-center items-center absolute top-24 right-[32%]"
			onmousedown={() => startTimeAdjust(-1)}
			onmouseup={stopTimeAdjust}
			onmouseleave={stopTimeAdjust}
		>
			-
		</button>
	{/if}
	<!-- Add instruction text for shader 10 -->
	{#if currentShader === 9}
		<div
			class="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 p-2 text-white text-sm"
		>
			Use arrow keys to move the pattern
		</div>
	{/if}
</div>

<style>
	.active {
		background: #444;
		color: white;
	}
	:global(.webgl) {
		cursor: default;
	}
	:global(.shader9-active .webgl) {
		cursor: move;
		overscroll-behavior: none;
	}
</style>
