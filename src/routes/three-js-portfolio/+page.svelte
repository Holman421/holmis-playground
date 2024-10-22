<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import gsap from 'gsap';

	$effect(() => {
		const gui = new GUI();

		const parameters = {
			materialColor: '#ffeded'
		};

		gui.addColor(parameters, 'materialColor').onChange(() => {
			material.color.set(parameters.materialColor);
			particlesMaterial.color.set(parameters.materialColor);
		});

		/**
		 * Base
		 */
		// Canvas
		const canvas = document.querySelector('canvas.webgl')! as HTMLCanvasElement;

		const textureLoader = new THREE.TextureLoader();
		const gradientTexture = textureLoader.load('/textures/gradients/3.jpg');
		gradientTexture.magFilter = THREE.NearestFilter;
		// Scene
		const scene = new THREE.Scene();

		const material = new THREE.MeshToonMaterial({
			color: parameters.materialColor,
			gradientMap: gradientTexture
		});
		const objectDistance = 4;

		const mesh1 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.4, 16, 60), material);

		const mesh2 = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 32), material);

		const mesh3 = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.35, 100, 16), material);

		mesh1.position.y = -objectDistance * 0;
		mesh2.position.y = -objectDistance * 1;
		mesh3.position.y = -objectDistance * 2;

		scene.add(mesh1, mesh2, mesh3);

		const sectionMeshes = [mesh1, mesh2, mesh3];

		// Particles
		const particlesCount = 400;
		const positions = new Float32Array(particlesCount * 3);

		for (let i = 0; i < particlesCount; i++) {
			positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
			positions[i * 3 + 1] =
				objectDistance * 0.5 - Math.random() * objectDistance * sectionMeshes.length;
			positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
		}

		const particlesGeometry = new THREE.BufferGeometry();
		particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const particlesMaterial = new THREE.PointsMaterial({
			color: parameters.materialColor,
			size: 0.04,
			sizeAttenuation: true
		});

		const particles = new THREE.Points(particlesGeometry, particlesMaterial);
		scene.add(particles);

		/**
		 * Lights
		 */
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(1, 1, 0);
		scene.add(directionalLight);

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

		const cameraGroup = new THREE.Group();
		scene.add(cameraGroup);
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.z = 6;
		cameraGroup.add(camera);

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let previousTime = 0;
		let currentSection = 0;

		let scrollY = window.scrollY;
		window.addEventListener('scroll', () => {
			scrollY = window.scrollY;

			const newSection = Math.round(scrollY / sizes.height);

			if (newSection !== currentSection) {
				currentSection = newSection;

				gsap.to(sectionMeshes[currentSection].rotation, {
					x: '+=6',
					y: '+=3',
					duration: 1,
					ease: 'power3.inOut'
				});
			}
		});

		const cursor = {
			x: 0,
			y: 0
		};

		window.addEventListener('mousemove', (event) => {
			cursor.x = event.clientX / sizes.width - 0.5;
			cursor.y = -(event.clientY / sizes.height - 0.5);
		});

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			const deltaTime = elapsedTime - previousTime;
			previousTime = elapsedTime;

			// Update camera
			camera.position.y = (-scrollY / sizes.height) * objectDistance;

			const parallaxX = cursor.x * 0.5;
			const parallaxY = cursor.y * 0.5;
			cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 2 * deltaTime;
			cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 2 * deltaTime;

			// Update objects
			sectionMeshes.forEach((mesh, index) => {
				mesh.rotation.y += deltaTime * 0.2;
			});

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl fixed"></canvas>
	<div class="h-screen flex justify-center flex-col">
		<h1 class=" text-white text-6xl">Three.js Portfolio</h1>
	</div>
	<div class="h-screen flex justify-center flex-col">
		<h2 class=" text-white text-6xl">My projects</h2>
	</div>
	<div class="h-screen flex justify-center flex-col">
		<h2 class=" text-white text-6xl">My projects</h2>
	</div>
</div>
