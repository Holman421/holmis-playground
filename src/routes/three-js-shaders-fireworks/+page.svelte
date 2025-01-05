<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import VertexShader from './shaders/firework/vertex.glsl';
	import FragmentShader from './shaders/firework/fragment.glsl';
	import { gsap } from 'gsap';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();

		/**
		 * Sizes
		 */
		const sizes: any = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		sizes.resolution = new THREE.Vector2(
			sizes.width * sizes.pixelRatio,
			sizes.height * sizes.pixelRatio
		);

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
			sizes.resolution.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio);

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
		camera.position.set(1.5, 0, 6);
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

		const textures = [
			textureLoader.load('/particles/1.png'),
			textureLoader.load('/particles/2.png'),
			textureLoader.load('/particles/3.png'),
			textureLoader.load('/particles/4.png'),
			textureLoader.load('/particles/5.png'),
			textureLoader.load('/particles/6.png'),
			textureLoader.load('/particles/7.png'),
			textureLoader.load('/particles/8.png')
		];

		// Fireworks
		const createFirework = (
			count: number,
			position: any,
			size: number,
			texture: any,
			radius: number,
			color: any
		) => {
			const positionsArray = new Float32Array(count * 3);
			const sizesArray = new Float32Array(count);
			const timeMultiplierArray = new Float32Array(count);

			for (let i = 0; i < count; i++) {
				const i3 = i * 3;

				const spherical = new THREE.Spherical(
					radius * (0.75 + Math.random() * 0.25),
					Math.random() * Math.PI,
					Math.random() * Math.PI * 2
				);

				const position = new THREE.Vector3();
				position.setFromSpherical(spherical);

				positionsArray[i3 + 0] = position.x;
				positionsArray[i3 + 1] = position.y;
				positionsArray[i3 + 2] = position.z;

				sizesArray[i] = Math.random();
				timeMultiplierArray[i] = 1 + Math.random();
			}

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
			geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1));
			geometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(timeMultiplierArray, 1));

			texture.flipY = false;
			const material = new THREE.ShaderMaterial({
				vertexShader: VertexShader,
				fragmentShader: FragmentShader,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				uniforms: {
					uSize: new THREE.Uniform(size),
					uResolution: new THREE.Uniform(sizes.resolution),
					uTexture: new THREE.Uniform(texture),
					uColor: new THREE.Uniform(color),
					uProgress: new THREE.Uniform(0)
				}
			});

			const firework = new THREE.Points(geometry, material);
			firework.position.copy(position);
			scene.add(firework);

			const destroy = () => {
				scene.remove(firework);
				geometry.dispose();
				material.dispose();
			};

			gsap.to(material.uniforms.uProgress, {
				duration: 3,
				value: 1,
				ease: 'linear',
				onComplete: destroy
			});
		};

		const createRandomFirework = () => {
			const count = Math.round(400 + Math.random() * 1000);
			const position = new THREE.Vector3(
				(Math.random() - 0.5) * 2,
				Math.random(),
				(Math.random() - 0.5) * 2
			);
			const size = 0.1 + Math.random() * 0.1;
			const texture = textures[Math.floor(Math.random() * textures.length)];
			const radius = 0.5 + Math.random();
			const color = new THREE.Color();
			color.setHSL(Math.random(), 1, 0.7);
			createFirework(count, position, size, texture, radius, color);
		};

		window.addEventListener('click', (event) => {
			createRandomFirework();
		});

		/**
		 * Animate
		 */
		const tick = () => {
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
