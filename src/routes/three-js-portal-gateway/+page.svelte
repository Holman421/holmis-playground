<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import { setupLightGUI } from '$lib/utils/lightGUI';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Environment map
		const textureLoader = new THREE.TextureLoader();

		const enviromentMap = textureLoader.load(
			'/environmentMaps/blockadesLabsSkybox/digital_painting_neon_city_night_orange_lights_.jpg'
		);
		enviromentMap.mapping = THREE.EquirectangularReflectionMapping;
		enviromentMap.colorSpace = THREE.SRGBColorSpace;
		scene.background = enviromentMap;

		// Real-time environment map setup
		const holyDonut = new THREE.Mesh(
			new THREE.TorusGeometry(9, 0.5, 32, 100),
			new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 4, 2) })
		);
		holyDonut.position.set(0, 0, 0);
		holyDonut.layers.enable(1);
		scene.add(holyDonut);

		const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
		scene.environment = cubeRenderTarget.texture;

		const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
		cubeCamera.layers.set(1);

		scene.environmentIntensity = 2.5;
		gui.add(scene, 'environmentIntensity').min(0).max(10).step(0.001).name('Env Intensity');

		// Load model
		const gltfLoader = new GLTFLoader();
		let portalModel: THREE.Group;
		gltfLoader.load('/models/portal-gateway/portal-gateway.glb', (gltf) => {
			portalModel = gltf.scene;
			portalModel.position.set(0, -2, 0);

			// Update materials
			portalModel.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.material.envMapIntensity = 2;
					child.material.needsUpdate = true;
					child.material.metalness = 0.8;
					child.material.roughness = 0.2;
				}
			});

			scene.add(portalModel);
		});

		// Raycasting setup
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		let currentIntersect: THREE.Intersection | null = null;

		window.addEventListener('mousemove', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
		});

		// Lights
		const ambientLight = new THREE.AmbientLight('#ffffff', 0.75);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.position.set(6.25, 3, 4);
		setupLightGUI(directionalLight, gui, 'Main light');
		scene.add(directionalLight);

		// Sizes
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
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-0, 0, 12);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.5;

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Animate holy donut
			if (holyDonut) {
				holyDonut.rotation.x = Math.sin(elapsedTime * 0.5) * 0.5;
				holyDonut.rotation.y = elapsedTime * 0.5;
				cubeCamera.update(renderer, scene);
			}

			// Handle raycasting
			if (portalModel) {
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObject(portalModel, true);

				if (intersects.length) {
					if (!currentIntersect) {
						scene.backgroundBlurriness = 0.2;
					}
					currentIntersect = intersects[0];
				} else {
					if (currentIntersect) {
						scene.backgroundBlurriness = 0;
					}
					currentIntersect = null;
				}
			}

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
