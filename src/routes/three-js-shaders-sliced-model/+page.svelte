<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';

	$effect(() => {
		/**
		 * Base
		 */
		// Debug
		const gui = new GUI({ width: 325 });
		const debugObject = {};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const rgbeLoader = new RGBELoader();
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./draco/');
		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);

		/**
		 * Environment map
		 */
		rgbeLoader.load('/aerodynamics/aerodynamics_workshop.hdr', (environmentMap) => {
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.backgroundBlurriness = 0.5;
			scene.environment = environmentMap;
		});

		/**
		 * Sliced model
		 */
		// Geometry
		const geometry = new THREE.IcosahedronGeometry(2.5, 5);

		// Material
		const material = new THREE.MeshStandardMaterial({
			metalness: 0.5,
			roughness: 0.25,
			envMapIntensity: 0.5,
			color: '#858080'
		});

		// Model
		gltfLoader.load('/aerodynamics/gears.glb', (gltf) => {
			scene.add(gltf.scene);
		});

		/**
		 * Plane
		 */
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10, 10),
			new THREE.MeshStandardMaterial({ color: '#aaaaaa' })
		);
		plane.receiveShadow = true;
		plane.position.x = -4;
		plane.position.y = -3;
		plane.position.z = -4;
		plane.lookAt(new THREE.Vector3(0, 0, 0));
		scene.add(plane);

		/**
		 * Lights
		 */
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.near = 0.1;
		directionalLight.shadow.camera.far = 30;
		directionalLight.shadow.normalBias = 0.05;
		directionalLight.shadow.camera.top = 8;
		directionalLight.shadow.camera.right = 8;
		directionalLight.shadow.camera.bottom = -8;
		directionalLight.shadow.camera.left = -8;
		scene.add(directionalLight);

		/**
		 * Sizes
		 */
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

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-5, 5, 12);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

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
