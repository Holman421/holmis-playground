<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
	import { onDestroy } from 'svelte';

	$effect(() => {
		const gltfLoader = new GLTFLoader();
		const rgbeLoader = new RGBELoader();
		const textureLoader = new THREE.TextureLoader();

		// Debug
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		/**
		 * Update all materials
		 */
		const updateAllMaterials = () => {
			scene.traverse((child: any) => {
				if (child.isMesh) {
					// ...

					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
		};

		/**
		 * Environment map
		 */
		// Intensity
		scene.environmentIntensity = 1;
		gui.add(scene, 'environmentIntensity').min(0).max(10).step(0.001);

		// HDR (RGBE) equirectangular
		rgbeLoader.load('/environmentMaps/0/2k.hdr', (environmentMap) => {
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.environment = environmentMap;
		});

		/**
		 * Models
		 */
		// Helmet
		gltfLoader.load('/models/FlightHelmet/glTF/FlightHelmet.gltf', (gltf) => {
			gltf.scene.scale.set(10, 10, 10);
			scene.add(gltf.scene);

			updateAllMaterials();
		});

		/**
		 * Floor
		 */

		const floorColorTexture = textureLoader.load(
			'/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_diff_1k.jpg'
		);
		const floorNormalTexture = textureLoader.load(
			'/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_nor_gl_1k.png'
		);
		const floorAORoughnessMetalnessTexture = textureLoader.load(
			'/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_arm_1k.jpg'
		);

		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(8, 8),
			new THREE.MeshStandardMaterial({
				map: floorColorTexture,
				normalMap: floorNormalTexture,
				aoMap: floorAORoughnessMetalnessTexture,
				roughnessMap: floorAORoughnessMetalnessTexture,
				metalnessMap: floorAORoughnessMetalnessTexture
			})
		);
		floor.rotateX(-Math.PI * 0.5);
		scene.add(floor);
		floorColorTexture.colorSpace = THREE.SRGBColorSpace;

		/**
		 * Wall
		 */
		const wallColorTexture = textureLoader.load(
			'/textures/castle_brick_broken_06/castle_brick_broken_06_diff_1k.jpg'
		);
		const wallNormalTexture = textureLoader.load(
			'/textures/castle_brick_broken_06/castle_brick_broken_06_nor_gl_1k.png'
		);
		const wallAORoughnessMetalnessTexture = textureLoader.load(
			'/textures/castle_brick_broken_06/castle_brick_broken_06_arm_1k.jpg'
		);

		const wall = new THREE.Mesh(
			new THREE.PlaneGeometry(8, 8),
			new THREE.MeshStandardMaterial({
				map: wallColorTexture,
				normalMap: wallNormalTexture,
				aoMap: wallAORoughnessMetalnessTexture,
				roughnessMap: wallAORoughnessMetalnessTexture,
				metalnessMap: wallAORoughnessMetalnessTexture
			})
		);
		wall.position.y = 4;
		wall.position.z = -4;
		scene.add(wall);
		wallColorTexture.colorSpace = THREE.SRGBColorSpace;
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
		 * Light
		 */

		const directionalLight = new THREE.DirectionalLight('#ffffff', 6);
		directionalLight.position.set(3, 7, 6);
		scene.add(directionalLight);

		gui.add(directionalLight, 'intensity').min(0).max(10).step(0.001);
		gui.add(directionalLight.position, 'x').min(-5).max(5).step(0.001);

		directionalLight.castShadow = true;
		directionalLight.shadow.camera.far = 15;
		directionalLight.shadow.mapSize.set(512, 512);

		// Light helper
		const directionalLightHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
		scene.add(directionalLightHelper);

		directionalLight.target.position.set(0, 4, 0);
		directionalLight.target.updateWorldMatrix(false, false);

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
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Shadow
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// Tone mapping
		renderer.toneMapping = THREE.ReinhardToneMapping;

		gui.add(renderer, 'toneMapping', {
			No: THREE.NoToneMapping,
			Linear: THREE.LinearToneMapping,
			Reinhard: THREE.ReinhardToneMapping,
			Cineon: THREE.CineonToneMapping,
			ACESFilmic: THREE.ACESFilmicToneMapping
		});

		let animationFrameId: number;
		const tick = () => {
			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		onDestroy(() => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		});
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
