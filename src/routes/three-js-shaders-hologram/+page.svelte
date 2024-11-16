<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/vertex.glsl';
	import FragmentShader from './shaders/fragment.glsl';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
			clearColor: 'black'
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
			color: '#339ef0'
		};

		/**
		 * Material
		 */
		const material = new THREE.ShaderMaterial({
			vertexShader: VertexShader,
			fragmentShader: FragmentShader,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(debugObject.color) }
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
		gltfLoader.load('./models/WMStar/star.glb', (gltf) => {
			suzanne = gltf.scene;
			gltf.scene.scale.set(0.75, 0.75, 0.75);
			gltf.scene.position.y = -10.5;
			console.log(gltf);
			suzanne.traverse((child: any) => {
				if (child.isMesh) child.material = material;
			});
			suzanne.position.set(0, -1, 0);
			scene.add(suzanne);
		});

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

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
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
