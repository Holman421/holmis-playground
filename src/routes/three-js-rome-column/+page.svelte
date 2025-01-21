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

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: DebugObject = {
			directionalLightColor: '#ffffff',
			romanColumn: {
				scale: 0.05,
				// rotation: {
				// 	x: -0.81,
				// 	y: 2.76,
				// 	z: 0.19
				// }
				rotation: {
					x: 0,
					y: 0,
					z: 0
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

					setupObjectGUI(gltf.scene, gui, 'Rome Column');
					romanColumnModel = gltf.scene;
					resolve(gltf.scene);
				});
			});
		};

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
			});
		};

		// add that animation to gui as a button
		gui.add({ animate: handleAnimation }, 'animate').name('Animate');

		loadModel(); // Call loadModel without assigning its return value

		// Create Plane
		const addPlane = ({ height, angle }: { height: number; angle: number }) => {
			const radius = 5; // Fixed distance from center
			// Convert angle to radians
			const angleRad = (angle * Math.PI) / 180;

			// Calculate position using polar coordinates
			const posX = radius * Math.cos(angleRad);
			const posZ = radius * Math.sin(angleRad);

			const plane = new THREE.Mesh(
				new THREE.PlaneGeometry(5, 3, 1, 1),
				new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide })
			);

			// Set position and automatically calculate rotation to face center
			plane.position.set(posX, height, posZ);
			plane.lookAt(0, height, 0); // Make plane face the center

			scene.add(plane);
			return plane;
		};

		const plane1 = addPlane({
			height: 6,
			angle: 90
		});
		const plane2 = addPlane({
			height: 4,
			angle: 0
		});
		const plane3 = addPlane({
			height: 2,
			angle: 270
		});
		const plane4 = addPlane({
			height: 0,
			angle: 180
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

		// Camera
		const addCamera = (startCoordX: number, startCoordY: number, startCoordZ: number) => {
			const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 2000);
			camera.position.set(startCoordX, startCoordY, startCoordZ);
			return camera;
		};
		const cameraY = 9;
		const camera = addCamera(0, cameraY, 20);

		// Add camera GUI controls
		// setupCameraGUI(camera, gui);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;
		controls.target.set(0, cameraY, 0);
		controls.update();

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			controls.update();

			renderer.render(scene, camera);

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
