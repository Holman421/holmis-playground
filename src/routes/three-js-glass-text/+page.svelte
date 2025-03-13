<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { setupLightGUI } from '$lib/utils/lightGUI';
	import { addTorus, setupTorusGUI, addText } from './utils';
	import { dispersion, iridescence } from 'three/src/nodes/TSL.js';

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			torusColor: '#aaaaaa',
			textColor: '#e1fc06',
			rotationSpeed: 0.5,
			metalness: 0.0,
			roughness: 0.0,
			transmission: 1.0,
			thickness: 0.6,
			clearcoat: 1.0,
			clearcoatRoughness: 0.3,
			ior: 1.05,
			wireframe: false,
			anisotropy: 0,
			dispersion: 0.0,
			iridescence: 0.0
		};

		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();

		// Add environment map
		const textureLoader = new THREE.TextureLoader();
		const environmentMap = textureLoader.load(
			'/environmentMaps/blockadesLabsSkybox/digital_painting_neon_city_night_orange_lights_.jpg'
		);
		environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		environmentMap.colorSpace = THREE.SRGBColorSpace;
		// scene.background = environmentMap;
		scene.environment = environmentMap;
		scene.environmentIntensity = 1;

		// Add environment controls to GUI
		const envFolder = gui.addFolder('Environment');
		envFolder.add(scene, 'environmentIntensity').min(0).max(10).step(0.001);

		const { torus, torusMaterial } = addTorus(scene, debugObject);
		setupTorusGUI(gui, torusMaterial, debugObject);

		let textMesh: THREE.Mesh;
		let uniforms: { uTime: { value: number } };

		addText(scene, debugObject).then((result) => {
			textMesh = result.textMesh;
			uniforms = result.uniforms;

			// Add GUI for text
			const textFolder = gui.addFolder('Text');
			textFolder.addColor(debugObject, 'textColor').onChange(() => {
				textMesh.material.color.set(debugObject.textColor);
			});
		});

		// Lights
		const directionalLight1 = new THREE.DirectionalLight('#e1fc06', 2.5);
		directionalLight1.position.set(1.6, -8.6, -5.2);
		scene.add(directionalLight1);

		const directionalLight2 = new THREE.DirectionalLight('#00fac8', 9.3);
		directionalLight2.position.set(-2.1, 2.3, 0.3);
		scene.add(directionalLight2);

		const ambientLight = new THREE.AmbientLight('#ffffff', 10.5);
		scene.add(ambientLight);

		// Setup light GUI
		setupLightGUI(directionalLight1, gui, 'Directional Light');
		setupLightGUI(directionalLight2, gui, 'Directional Light');

		// Add rotation controls
		const rotationFolder = gui.addFolder('Rotation Animation');
		rotationFolder.add(debugObject, 'rotationSpeed').min(0).max(2).step(0.1).name('Speed');

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
		camera.position.set(-0, 0, 4);
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

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			if (textMesh) {
				textMesh.rotation.y += debugObject.rotationSpeed * 0.01;
			}

			if (uniforms) {
				uniforms.uTime.value = elapsedTime;
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
