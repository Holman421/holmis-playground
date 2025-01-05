<script lang="ts">
	import * as THREE from 'three';
	import { onDestroy } from 'svelte';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import bigSphereFragmentShader from './shaders/bigSphere/fragment.glsl';
	import bigSpereVertexShader from './shaders/bigSphere/vertex.glsl';
	import smallSphereFragmentShader from './shaders/smallSphere/fragment.glsl';
	import smallSphereVertexShader from './shaders/smallSphere/vertex.glsl';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};

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

		// Plane
		const addObjects = () => {
			const material = new THREE.ShaderMaterial({
				vertexShader: bigSpereVertexShader,
				fragmentShader: bigSphereFragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uResolution: { value: new THREE.Vector2() },
					uMouse: { value: new THREE.Vector2() }
				},
				side: THREE.DoubleSide
			});

			const geometry = new THREE.SphereGeometry(2, 32, 32, 32);
			const mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);

			let geometry2 = new THREE.SphereGeometry(0.4, 32, 32, 32);
			let material2 = new THREE.ShaderMaterial({
				vertexShader: smallSphereVertexShader,
				fragmentShader: smallSphereFragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uResolution: { value: new THREE.Vector2() },
					uMouse: { value: new THREE.Vector2() }
				},
				side: THREE.DoubleSide
			});
			let mesh2 = new THREE.Mesh(geometry2, material2);
			mesh2.position.set(0.38, 0.18, 0.16);
			scene.add(mesh2);

			return { material, mesh, material2, mesh2 };
		};

		const { material, mesh, material2, mesh2 } = addObjects();

		// Add GUI controls for mesh2 position
		const mesh2Position = gui.addFolder('Small Sphere Position');
		mesh2Position.add(mesh2.position, 'x').min(-3).max(3).step(0.01).name('X Position');
		mesh2Position.add(mesh2.position, 'y').min(-3).max(3).step(0.01).name('Y Position');
		mesh2Position.add(mesh2.position, 'z').min(-3).max(3).step(0.01).name('Z Position');

		// // Lights
		// const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		// directionalLight.position.set(6.25, 3, 4);
		// scene.add(directionalLight);

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
		camera.position.set(-0, 0, 1);
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

			// Update material
			material.uniforms.uTime.value = elapsedTime;
			material2.uniforms.uTime.value = elapsedTime;

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);
			console.log('render');

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
