<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/vertex.glsl';
	import FragmentShader from './shaders/fragment.glsl';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { onDestroy } from 'svelte';

	$effect(() => {
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const gltfLoader = new GLTFLoader();

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

			// Update materials
			material.uniforms.uResolution.value = new THREE.Vector2(
				sizes.width * sizes.pixelRatio,
				sizes.height * sizes.pixelRatio
			);

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
		const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(7, 7, 7);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const rendererParameters = {
			clearColor: '#26132f'
		};

		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setClearColor(rendererParameters.clearColor);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		gui.addColor(rendererParameters, 'clearColor').onChange(() => {
			renderer.setClearColor(rendererParameters.clearColor);
		});

		const debugObject = {
			color: '#ff794d'
		};

		/**
		 * Material
		 */
		const material = new THREE.ShaderMaterial({
			vertexShader: VertexShader,
			fragmentShader: FragmentShader,
			// transparent: true,
			side: THREE.DoubleSide,
			// depthWrite: false,
			// blending: THREE.AdditiveBlending,
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(debugObject.color) },
				uResolution: {
					value: new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
				}
			}
		});

		gui.addColor(debugObject, 'color').onChange(() => {
			material.uniforms.uColor.value.set(debugObject.color);
		});

		/**
		 * Objects
		 */
		// Torus knot
		const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32), material);
		torusKnot.position.x = 3;
		scene.add(torusKnot);

		// Sphere
		const sphere = new THREE.Mesh(new THREE.SphereGeometry(), material);
		sphere.position.x = -3;
		scene.add(sphere);

		// Suzanne
		let suzanne: any = null;
		gltfLoader.load('./models/Suzanne/suzanne.glb', (gltf) => {
			suzanne = gltf.scene;
			suzanne.traverse((child: any) => {
				if (child.isMesh) child.material = material;
			});
			scene.add(suzanne);
		});

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update uniform time
			material.uniforms.uTime.value = elapsedTime;

			// Rotate objects
			if (suzanne) {
				// suzanne.rotation.x = -elapsedTime * 0.1;
				suzanne.rotation.y = elapsedTime * 0.2;
			}

			sphere.rotation.x = -elapsedTime * 0.1;
			sphere.rotation.y = elapsedTime * 0.2;

			torusKnot.rotation.x = -elapsedTime * 0.1;
			torusKnot.rotation.y = elapsedTime * 0.2;

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
