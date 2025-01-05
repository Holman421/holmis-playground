<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl')! as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Load textures
		const textureLoader = new THREE.TextureLoader();
		const particleTextureOne = textureLoader.load('/particles/one.jpg');
		const particleTextureZero = textureLoader.load('/particles/zero.jpg');

		// Create geometry and distribute particles
		const count = 50000;
		const positionsOne = [];
		const positionsZero = [];

		scene.fog = new THREE.FogExp2('black', 0.65);

		for (let i = 0; i < count; i++) {
			const x = (Math.random() - 0.5) * 3.5;
			const y = (Math.random() - 0.5) * 2;
			const z = (Math.random() - 0.5) * 2;

			if (Math.random() > 0.5) {
				positionsOne.push(x, y, z);
			} else {
				positionsZero.push(x, y, z);
			}
		}

		const particlesGeometryOne = new THREE.BufferGeometry();
		particlesGeometryOne.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positionsOne, 3)
		);

		const particlesGeometryZero = new THREE.BufferGeometry();
		particlesGeometryZero.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positionsZero, 3)
		);

		// Create materials
		const particlesMaterialOne = new THREE.PointsMaterial({
			color: '#008f11',
			size: 0.02,
			sizeAttenuation: true,
			transparent: true,
			alphaMap: particleTextureOne,
			depthWrite: false
		});

		const particlesMaterialZero = new THREE.PointsMaterial({
			color: '#008f11',
			size: 0.02,
			sizeAttenuation: true,
			transparent: true,
			alphaMap: particleTextureZero,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});

		// Create particles and add to scene
		const particlesOne = new THREE.Points(particlesGeometryOne, particlesMaterialOne);
		const particlesZero = new THREE.Points(particlesGeometryZero, particlesMaterialZero);

		particlesOne.position.z = 1.9;
		particlesZero.position.z = 1.9;

		scene.add(particlesOne);
		scene.add(particlesZero);

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
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 100);
		camera.position.z = 3;
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

			const rotationSpeed = 0.05;

			// Update particles
			particlesOne.rotation.x = elapsedTime * rotationSpeed;
			particlesZero.rotation.x = elapsedTime * rotationSpeed;

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
