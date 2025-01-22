<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/Addons.js';
	import { setupCameraGUI } from '$lib/utils/cameraGUI';
	import { setupObjectGUI } from '$lib/utils/objectGUI';
	import gsap from 'gsap';

	type DebugObject = {
		directionalLightColor: string;
		romanColumn: {
			scale: number;
			rotation: {
				x: number;
				y: number;
				z: number;
			};
		};
	};

	let romanColumnModel: THREE.Group | undefined;
	let planeMaterials: THREE.MeshStandardMaterial[] = [];

	const cameraY = 6;
	const minCameraY = -6;
	const baseRadius = 15;
	const radiusVariation = 2;
	const zoomedRadius = 8; // Add this new constant for zoomed state
	let currentRadius = baseRadius;
	let targetRadius = baseRadius;
	let currentAngle = Math.PI / 2;
	let currentCameraY = cameraY;
	let camera: THREE.PerspectiveCamera;
	let cameraFolder: GUI;

	// Add these variables for smooth movement
	let targetCameraY = cameraY;
	let targetAngle = Math.PI / 2;
	let lerpFactor = 0.05; // Add this near other state variables

	// Add these constants near the top
	const DEFAULT_ANGLE = Math.PI / 2;
	const DEFAULT_Y = 6;
	const PLANE_ANGLE_STEP = Math.PI / 3;

	// Lerp helper function
	const lerp = (start: number, end: number, factor: number) => {
		return start + (end - start) * factor;
	};

	// Replace the handleScroll function
	const handleScroll = (deltaY: number) => {
		if (!camera || !cameraFolder) return;

		// Calculate next target Y position
		const nextTargetY = targetCameraY - deltaY * 0.5 * 0.01;

		// Check if we would exceed bounds
		if (nextTargetY > DEFAULT_Y) {
			// Snap to top position
			targetCameraY = DEFAULT_Y;
			targetAngle = DEFAULT_ANGLE;
			return;
		}
		if (nextTargetY < minCameraY) return;

		const scrollSpeed = 0.5;
		const rotationSpeed = 0.525;
		const delta = deltaY * scrollSpeed * 0.01;

		// Update target values
		targetCameraY = nextTargetY;
		targetAngle -= delta * rotationSpeed;

		// Gradually return to base radius if we're zoomed in
		if (targetRadius !== baseRadius) {
			targetRadius = baseRadius;
			// Lerp opacity back to 0.5 for all planes
			planeMaterials.forEach((material) => {
				if (material.opacity > 0.5) {
					// Only lerp if opacity is above 0.5
					gsap.to(material, {
						opacity: 0.5,
						duration: 1,
						ease: 'power2.inOut'
					});
				}
			});
		}

		// Add radius oscillation based on rotation
		targetRadius = baseRadius + Math.sin(targetAngle * 2) * radiusVariation;
	};

	// Add these variables after the existing declarations
	let mouse = new THREE.Vector2();
	let raycaster = new THREE.Raycaster();
	let planes: THREE.Mesh[] = [];
	let hitboxPlanes: THREE.Mesh[] = []; // Add this new array
	let hoveredPlane: THREE.Mesh | null = null;

	// Add mouse move handler after the handleScroll function
	const handleMouseMove = (event: MouseEvent) => {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
	};

	// Update the handleClick function
	const handleClick = (event: MouseEvent) => {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(hitboxPlanes);

		if (intersects.length > 0) {
			const hitboxPlane = intersects[0].object as THREE.Mesh;
			const visiblePlane = (hitboxPlane as any).visiblePair as THREE.Mesh;

			const planeIndex = parseInt(visiblePlane.name);

			// Set exact rotation angle
			targetAngle = DEFAULT_ANGLE - planeIndex * PLANE_ANGLE_STEP;

			// Set exact camera Y position
			targetCameraY = DEFAULT_Y - planeIndex * 2;

			targetRadius = zoomedRadius;

			// Only animate the clicked plane's opacity
			gsap.to(planeMaterials[planeIndex], {
				opacity: 1.0,
				duration: 1,
				ease: 'power2.inOut'
			});

			// Start with a moderate lerp factor
			lerpFactor = 0.15;

			// Gradually reduce lerp factor back to normal over a longer duration
			gsap.to(
				{ value: lerpFactor },
				{
					value: 0.05,
					duration: 2,
					ease: 'power2.out',
					onUpdate: function () {
						lerpFactor = this.targets()[0].value;
					}
				}
			);
		}
	};

	// Add these variables after other state declarations
	let lastTouchY: number | null = null;
	const TOUCH_SENSITIVITY = 2.5; // Adjust this value to match scroll sensitivity

	// Add these touch handler functions before the effect
	const handleTouchStart = (event: TouchEvent) => {
		lastTouchY = event.touches[0].clientY;
	};

	const handleTouchMove = (event: TouchEvent) => {
		event.preventDefault(); // Prevent default scrolling

		if (lastTouchY === null) return;

		const currentTouchY = event.touches[0].clientY;
		const deltaY = (lastTouchY - currentTouchY) * TOUCH_SENSITIVITY;

		handleScroll(deltaY);

		lastTouchY = currentTouchY;
	};

	const handleTouchEnd = () => {
		lastTouchY = null;
	};

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: DebugObject = {
			directionalLightColor: '#860909e',
			romanColumn: {
				scale: 0.45,
				rotation: {
					x: -0.81,
					y: 2.76,
					z: 0.19
				}
			}
		};
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const gltfLoader = new GLTFLoader();

		const loadModel = (): Promise<THREE.Group> => {
			return new Promise((resolve) => {
				gltfLoader.load('/models/rome-column/ionic_column.glb', (gltf) => {
					const scale = debugObject.romanColumn.scale;
					gltf.scene.scale.set(scale, scale, scale);
					gltf.scene.rotation.x = debugObject.romanColumn.rotation.x;
					gltf.scene.rotation.y = debugObject.romanColumn.rotation.y;
					gltf.scene.rotation.z = debugObject.romanColumn.rotation.z;
					gltf.scene.position.y = -15.25;
					scene.add(gltf.scene);

					romanColumnModel = gltf.scene;
					resolve(gltf.scene);
				});
			});
		};

		loadModel();

		// Create Plane
		const addPlane = ({ height, angle, name }: { height: number; angle: number; name: string }) => {
			const radius = 5;
			// Convert angle to radians
			const angleRad = (-(angle - 90) * Math.PI) / 180;

			// Calculate position using polar coordinates
			const posX = radius * Math.cos(angleRad);
			const posZ = radius * Math.sin(angleRad);

			// Create visible plane with updated material properties
			const material = new THREE.MeshStandardMaterial({
				color: '#ffffff',
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.0,
				depthWrite: true,
				alphaTest: 0.1
			});
			planeMaterials.push(material);
			const visiblePlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 3, 1, 1), material);
			visiblePlane.renderOrder = 1;

			// Create invisible hitbox plane with updated material
			const hitboxMaterial = new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 0,
				side: THREE.DoubleSide,
				depthWrite: false,
				depthTest: true
			});
			const hitboxPlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 3, 1, 1), hitboxMaterial);
			hitboxPlane.renderOrder = 0;

			// Position and rotate both planes
			visiblePlane.position.set(posX, height, posZ);
			hitboxPlane.position.set(posX, height, posZ);
			visiblePlane.lookAt(0, height, 0);
			hitboxPlane.lookAt(0, height, 0);

			// Store original position for both
			const originalPosition = {
				x: posX,
				y: height,
				z: posZ,
				angle: angleRad
			};

			(visiblePlane as any).originalPosition = originalPosition;
			(hitboxPlane as any).originalPosition = originalPosition;
			(hitboxPlane as any).visiblePair = visiblePlane;

			visiblePlane.name = name;

			scene.add(visiblePlane);
			scene.add(hitboxPlane);
			planes.push(visiblePlane);
			hitboxPlanes.push(hitboxPlane);

			return visiblePlane;
		};

		const plane1 = addPlane({
			height: 6,
			angle: 0,
			name: '0'
		});
		const plane2 = addPlane({
			height: 4,
			angle: 60,
			name: '1'
		});
		const plane3 = addPlane({
			height: 2,
			angle: 120,
			name: '2'
		});
		const plane4 = addPlane({
			height: 0,
			angle: 180,
			name: '3'
		});
		const plane5 = addPlane({
			height: -2,
			angle: 240,
			name: '4'
		});
		const plane6 = addPlane({
			height: -4,
			angle: 300,
			name: '5'
		});

		setupObjectGUI(plane1, gui, 'Plane 1');

		// Lights
		const addLights = () => {
			const directionalLight = new THREE.DirectionalLight(debugObject.directionalLightColor, 4);
			directionalLight.position.set(6.25, 3, 4);
			scene.add(directionalLight);

			const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
			scene.add(ambientLight);
		};

		addLights();

		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};
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
		});

		// Camera setup
		const initialPosX = baseRadius * Math.cos(DEFAULT_ANGLE) * 0.75;
		const initialPosZ = baseRadius * Math.sin(DEFAULT_ANGLE) * 0.75;
		camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 2000);
		camera.position.set(initialPosX, DEFAULT_Y, initialPosZ);
		camera.lookAt(0, DEFAULT_Y, 0);

		// Add camera GUI controls
		cameraFolder = setupCameraGUI(camera, gui);

		window.addEventListener('wheel', (event: WheelEvent) => handleScroll(event.deltaY));

		// Add mouse move event listener
		window.addEventListener('mousemove', handleMouseMove);

		// Add click event listener after other event listeners
		window.addEventListener('click', handleClick);

		// Add touch event listeners after other event listeners
		window.addEventListener('touchstart', handleTouchStart, { passive: false });
		window.addEventListener('touchmove', handleTouchMove, { passive: false });
		window.addEventListener('touchend', handleTouchEnd);

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Main animation
		const handleAnimation = () => {
			if (!romanColumnModel) return;

			const tl = gsap.timeline({
				defaults: {
					duration: 2,
					ease: 'power2.inOut'
				}
			});

			tl.to(romanColumnModel.rotation, {
				x: 0,
				y: 1.2,
				z: 0
			}).to(
				planeMaterials.map((material) => material),
				{
					opacity: 0.5,
					duration: 1,
					stagger: 0.2
				},
				'-=0.9'
			);
		};

		// add that animation to gui as a button
		gui.add({ animate: handleAnimation }, 'animate').name('Animate');

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Smooth camera movement using lerp
			currentCameraY = lerp(currentCameraY, targetCameraY, lerpFactor);
			currentAngle = lerp(currentAngle, targetAngle, lerpFactor);
			currentRadius = lerp(currentRadius, targetRadius, lerpFactor);

			const currentAngleDegree = (currentAngle - Math.PI / 2) * (180 / Math.PI);

			// Calculate new camera position
			const posX = currentRadius * Math.cos(currentAngle);
			const posZ = currentRadius * Math.sin(currentAngle);

			camera.position.set(posX, currentCameraY, posZ);
			camera.lookAt(0, currentCameraY, 0);

			// Update raycaster to only check hitbox planes
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(hitboxPlanes);

			// Handle hover effects with UV-based edge detection
			if (intersects.length > 0) {
				const hitboxPlane = intersects[0].object as THREE.Mesh;
				const visiblePlane = (hitboxPlane as any).visiblePair as THREE.Mesh;

				if (hoveredPlane !== visiblePlane) {
					// Reset previous hovered plane
					if (hoveredPlane) {
						const originalPos = (hoveredPlane as any).originalPosition;
						gsap.to(hoveredPlane.position, {
							x: originalPos.x,
							y: originalPos.y,
							z: originalPos.z,
							duration: 0.5
						});
					}

					// Move visible plane outward
					const orig = (visiblePlane as any).originalPosition;
					const moveDistance = 0.5;
					const newX = orig.x * (1 + moveDistance / 5);
					const newZ = orig.z * (1 + moveDistance / 5);

					gsap.to(visiblePlane.position, {
						x: newX,
						y: orig.y,
						z: newZ,
						duration: 0.5
					});

					hoveredPlane = visiblePlane;
				}
			} else if (hoveredPlane) {
				// Reset hover state when no intersection
				const originalPos = (hoveredPlane as any).originalPosition;
				gsap.to(hoveredPlane.position, {
					x: originalPos.x,
					y: originalPos.y,
					z: originalPos.z,
					duration: 0.5
				});
				hoveredPlane = null;
			}

			// Update GUI if values changed significantly
			if (Math.abs(currentCameraY - targetCameraY) > 0.001) {
				cameraFolder.controllers.forEach((controller) => controller.updateDisplay());
			}

			renderer.render(scene, camera);
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('wheel', (event: WheelEvent) => handleScroll(event.deltaY));
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('click', handleClick); // Don't forget to remove the listener
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('touchend', handleTouchEnd);
		};
	});
</script>

<div>
	<canvas class="webgl" style="touch-action: none;"></canvas>
</div>

<!-- <style>
	.div {
		color: #860909e;
	}
</style> -->
