<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/vertex.glsl';
	import FragmentShader from './shaders/fragment.glsl';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	$effect(() => {
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();
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
		camera.position.x = 8;
		camera.position.y = 5;
		camera.position.z = 12;
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.target.y = 3;
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

		/**
		 * Model
		 */
		gltfLoader.load('/models/CoffeTable/bakedModel.glb', (gltf) => {
			// gltf.scene.getObjectByName('baked')!.material.map.anisotropy = 8;
			gltf.scene.position.y = 1.0;
			scene.add(gltf.scene);
		});

		// Perlin texture
		const perlinTexture = textureLoader.load('/perlinNoise/perlin.png');
		perlinTexture.wrapS = THREE.RepeatWrapping;
		perlinTexture.wrapT = THREE.RepeatWrapping;

		// Smoke
		const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64);
		smokeGeometry.translate(0, 0.9, 0);
		smokeGeometry.scale(1.5, 6.0, 1.5);

		// Material
		const smokeMaterial = new THREE.ShaderMaterial({
			vertexShader: VertexShader,
			fragmentShader: FragmentShader,
			side: THREE.DoubleSide,
			transparent: true,
			// wireframe: true,
			depthWrite: false,
			uniforms: {
				uTime: new THREE.Uniform(0),
				uPerlinTexture: new THREE.Uniform(perlinTexture)
			}
		});

		// Mesh
		const smokeMesh = new THREE.Mesh(smokeGeometry, smokeMaterial);
		scene.add(smokeMesh);

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update uniform time
			smokeMaterial.uniforms.uTime.value = elapsedTime;

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
