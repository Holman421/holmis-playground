<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

	$effect(() => {
		/**
		 * Base
		 */
		// Debug
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const gltfLoader = new GLTFLoader();
		const cubeTextureLoader = new THREE.CubeTextureLoader();
		let flightHelmetModel: any = null;
		gltfLoader.load('/FlightHelmet/glTF/FlightHelmet.gltf', (gltf) => {
			gltf.scene.scale.set(10, 10, 10);
			scene.add(gltf.scene);
			flightHelmetModel = gltf.scene;
		});

		const enviromentMap = cubeTextureLoader.load([
			'/environmentMaps/0/px.png',
			'/environmentMaps/0/nx.png',
			'/environmentMaps/0/py.png',
			'/environmentMaps/0/ny.png',
			'/environmentMaps/0/pz.png',
			'/environmentMaps/0/nz.png'
		]);

		scene.environment = enviromentMap;
		scene.background = enviromentMap;

		scene.environmentIntensity = 4;

		gui.add(scene, 'environmentIntensity').min(0).max(10).step(0.001);

		/**
		 * Torus Knot
		 */
		const torusKnot = new THREE.Mesh(
			new THREE.TorusKnotGeometry(1, 0.4, 100, 16),
			new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 1, color: 0xaaaaaa })
		);
		torusKnot.position.y = 4;
		torusKnot.position.x = -4;
		torusKnot.name = 'Torus object';
		scene.add(torusKnot);

		/**
		 * Sizes
		 */
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56
		};

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;

			// Update camera
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(4, 5, 4);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.target.y = 3.5;
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Raycasting
		const raycaster = new THREE.Raycaster();
		const rayOrigin = new THREE.Vector3(-3, 0, 0);
		const rayDirection = new THREE.Vector3(10, 0, 0);
		rayDirection.normalize();

		raycaster.set(rayOrigin, rayDirection);

		const mouse = new THREE.Vector2();

		window.addEventListener('mousemove', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
		});

		let currentIntersect: any = null;

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let targetBackgroundBlurriness = 0;
		const blurTransitionSpeed = 0.2; // Adjust this value to control transition speed

		const tick = () => {
			// Time
			const elapsedTime = clock.getElapsedTime();

			// Smoothly interpolate background blurriness
			scene.backgroundBlurriness =
				scene.backgroundBlurriness +
				(targetBackgroundBlurriness - scene.backgroundBlurriness) * blurTransitionSpeed;

			// Raycasting
			raycaster.setFromCamera(mouse, camera);
			if (flightHelmetModel) {
				const intersects: any = raycaster.intersectObjects([torusKnot, flightHelmetModel]);

				let objectName;

				if (intersects.length) {
					if (!currentIntersect) {
						objectName = intersects[0]?.object?.name;
						console.log('Mouse enter to ' + objectName);
						targetBackgroundBlurriness = 0.2;
					}
					currentIntersect = intersects[0];
				} else {
					if (currentIntersect) {
						objectName = currentIntersect?.object?.name;
						console.log('Mouse leave from ' + objectName);
						targetBackgroundBlurriness = 0;
					}
					currentIntersect = null;
				}
			}

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
