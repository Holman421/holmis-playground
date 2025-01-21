<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
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

	// Shared variables for camera movement
	const cameraY = 6.15;
	const minCameraY = -6;
	const radius = 15;
	let currentAngle = Math.PI / 2;
	let currentCameraY = cameraY;
	let camera: THREE.PerspectiveCamera;
	let cameraFolder: GUI;

	// Add these variables for smooth movement
	let targetCameraY = cameraY;
	let targetAngle = Math.PI / 2;

	// Lerp helper function
	const lerp = (start: number, end: number, factor: number) => {
		return start + (end - start) * factor;
	};

	// Update the scroll handler to set target values
	const handleScroll = (deltaY: number) => {
		if (!camera || !cameraFolder) return;

		// if camera is at 6.15 or more, allow only scroll down
		if (targetCameraY >= 6.15 && deltaY < 0) return;
		if (targetCameraY <= minCameraY && deltaY > 0) return;

		const scrollSpeed = 0.5;
		const rotationSpeed = 0.5;
		const delta = deltaY * scrollSpeed * 0.01;

		// Update target values instead of direct position
		targetCameraY = Math.max(minCameraY, Math.min(cameraY, targetCameraY - delta));
		targetAngle -= delta * rotationSpeed;
	};

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: DebugObject = {
			directionalLightColor: '#860909e',
			romanColumn: {
				scale: 0.05,
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
				gltfLoader.load('/models/rome-column/roman_column.glb', (gltf) => {
					const scale = debugObject.romanColumn.scale;
					gltf.scene.scale.set(scale, scale, scale);
					gltf.scene.rotation.x = debugObject.romanColumn.rotation.x;
					gltf.scene.rotation.y = debugObject.romanColumn.rotation.y;
					gltf.scene.rotation.z = debugObject.romanColumn.rotation.z;
					scene.add(gltf.scene);

					romanColumnModel = gltf.scene;
					resolve(gltf.scene);
				});
			});
		};

		loadModel(); // Call loadModel without assigning its return value

		// Create Plane
		const addPlane = ({ height, angle }: { height: number; angle: number }) => {
			const radius = 5; // Fixed distance from center
			// Convert angle to radians
			const angleRad = (-(angle - 90) * Math.PI) / 180;

			// Calculate position using polar coordinates
			const posX = radius * Math.cos(angleRad);
			const posZ = radius * Math.sin(angleRad);

			const material = new THREE.MeshStandardMaterial({
				color: '#ffffff',
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.0
			});
			planeMaterials.push(material);

			const plane = new THREE.Mesh(new THREE.PlaneGeometry(5, 3, 1, 1), material);

			// Set position and automatically calculate rotation to face center
			plane.position.set(posX, height, posZ);
			plane.lookAt(0, height, 0); // Make plane face the center

			scene.add(plane);
			return plane;
		};

		const plane1 = addPlane({
			height: 6,
			angle: 0
		});
		const plane2 = addPlane({
			height: 4,
			angle: 60
		});
		const plane3 = addPlane({
			height: 2,
			angle: 120
		});
		const plane4 = addPlane({
			height: 0,
			angle: 180
		});
		const plane5 = addPlane({
			height: -2,
			angle: 240
		});
		const plane6 = addPlane({
			height: -4,
			angle: 300
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
		const initialPosX = radius * Math.cos(currentAngle);
		const initialPosZ = radius * Math.sin(currentAngle);
		camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 2000);
		camera.position.set(initialPosX, cameraY, initialPosZ);
		camera.lookAt(0, cameraY, 0);

		// Add camera GUI controls
		cameraFolder = setupCameraGUI(camera, gui);

		// Fallback to wheel events if Lenis is not available
		window.addEventListener('wheel', (event: WheelEvent) => handleScroll(event.deltaY));

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
					opacity: 0.75,
					duration: 1,
					stagger: 0.2
				},
				'-=0.7' // Start 0.5 seconds before the previous animation ends
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
			const lerpFactor = 0.05; // Adjust this value to control smoothness (0-1)
			currentCameraY = lerp(currentCameraY, targetCameraY, lerpFactor);
			currentAngle = lerp(currentAngle, targetAngle, lerpFactor);

			// Calculate new camera position
			const posX = radius * Math.cos(currentAngle);
			const posZ = radius * Math.sin(currentAngle);

			camera.position.set(posX, currentCameraY, posZ);
			camera.lookAt(0, currentCameraY, 0);

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
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

<!-- <style>
	.div {
		color: #860909e;
	}
</style> -->
