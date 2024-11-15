<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import particlesVertexShader from './shaders/vertex.glsl';
	import particlesFragmentShader from './shaders/fragment.glsl';
	import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
	import gsap from 'gsap';

	$effect(() => {
		const gui = new GUI({ width: 340 });
		const debugObject: any = {};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('/draco/');

		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);

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

			// Materials
			particles.material.uniforms.uResolution.value.set(
				sizes.width * sizes.pixelRatio,
				sizes.height * sizes.pixelRatio
			);

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
		camera.position.set(4.5, 4, 11);
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

		debugObject.clearColor = '#29191f';
		renderer.setClearColor(debugObject.clearColor);

		/**
		 * Particles
		 */
		const particles: any = {};

		// Geometry
		particles.geometry = new THREE.SphereGeometry(3);

		// Material
		particles.material = new THREE.ShaderMaterial({
			vertexShader: particlesVertexShader,
			fragmentShader: particlesFragmentShader,
			uniforms: {
				uSize: new THREE.Uniform(0.4),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
				)
			}
		});

		// Points
		particles.points = new THREE.Points(particles.geometry, particles.material);
		scene.add(particles.points);

		/**
		 * Tweaks
		 */
		gui.addColor(debugObject, 'clearColor').onChange(() => {
			renderer.setClearColor(debugObject.clearColor);
		});
		gui.add(particles.material.uniforms.uSize, 'value').min(0).max(1).step(0.001).name('uSize');

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let previousTime = 0;

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			const deltaTime = elapsedTime - previousTime;
			previousTime = elapsedTime;

			// Update controls
			controls.update();

			// Render normal scene
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
