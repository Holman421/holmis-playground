<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import testVertexShader from './shaders/vertex.glsl';
	import testFragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Geometry
		const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

		// Material
		const material = new THREE.ShaderMaterial({
			vertexShader: testVertexShader,
			fragmentShader: testFragmentShader,
			side: THREE.DoubleSide
		});

		// Mesh
		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

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
		camera.position.set(0.25, -0.25, 1);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// mesh.scale.x = Math.sin(elapsedTime * 4) * 0.5 + 2;
			// mesh.scale.y = Math.sin(elapsedTime * 4) * 0.5 + 2;

			// mesh.rotation.z = elapsedTime * 0.25;

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div class="relative">
	<canvas class="webgl"></canvas>
	<!-- <h1 class="z-10 absolute bottom-[2rem] left-[50%] translate-x-[-50%] text-5xl">Buy me a beer</h1> -->
</div>
