<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import testVertexShader from './shaders/vertex.glsl';
	import testFragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();

		// Textures
		const earthDayTexture = textureLoader.load('/models/earth/day.jpg');
		earthDayTexture.colorSpace = THREE.SRGBColorSpace;
		const earthNightTexture = textureLoader.load('/models/earth/night.jpg');
		earthNightTexture.colorSpace = THREE.SRGBColorSpace;

		const earthSpecularCloudsTexture = textureLoader.load('/models/earth/specularClouds.jpg');

		//Earth
		const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
		const earthMaterial = new THREE.ShaderMaterial({
			vertexShader: testVertexShader,
			fragmentShader: testFragmentShader,
			uniforms: {
				uDayTexture: new THREE.Uniform(earthDayTexture),
				uNightTexture: new THREE.Uniform(earthNightTexture),
				uSpecularCloundsTexture: new THREE.Uniform(earthSpecularCloudsTexture)
			}
		});
		const earth = new THREE.Mesh(earthGeometry, earthMaterial);
		scene.add(earth);

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
		const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
		camera.position.x = 12;
		camera.position.y = 5;
		camera.position.z = 4;
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
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.setClearColor('#000011');

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			earth.rotation.y = elapsedTime * 0.1;

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
