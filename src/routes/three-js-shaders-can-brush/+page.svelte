<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/firework/vertex.glsl';
	import FragmentShader from './shaders/firework/fragment.glsl';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { gsap } from 'gsap';
	import type { ThemeConfig } from 'tailwindcss/types/config';

	$effect(() => {
		// Debug
		const gui = new GUI({ width: 340 });

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();

		let lerpFactor = 0.1; // Adjust this value to change smoothing (0-1)
		function lerp(start: number, end: number, t: number): number {
			return start + (end - start) * t;
		}

		// Sizes
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
			camera.left = -sizes.width / 2;
			camera.right = sizes.width / 2;
			camera.top = sizes.height / 2;
			camera.bottom = -sizes.height / 2;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera
		const camera = new THREE.OrthographicCamera(
			-sizes.width / 2,
			sizes.width / 2,
			sizes.height / 2,
			-sizes.height / 2,
			0.1,
			100
		);
		camera.position.set(1.5, 0, 2);
		scene.add(camera);

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		const canBrushTexture = textureLoader.load('/particles/3.png');

		// Mouse tracking
		const targetMouse = {
			x: 0,
			y: 0
		};
		const currentMouse = {
			x: 0,
			y: 0
		};

		// Fireworks
		const createFirework = (
			count: number,
			position: any,
			size: number,
			texture: any,
			radius: number,
			color: THREE.Color,
			mousPosition: THREE.Vector2
		) => {
			const positionsArray = new Float32Array(count * 2);
			const sizesArray = new Float32Array(count);
			const timeMultiplierArray = new Float32Array(count);

			for (let i = 0; i < count; i++) {
				const i2 = i * 2;

				const spherical = new THREE.Spherical(
					radius * Math.pow(Math.random(), 3),
					Math.random() * Math.PI,
					Math.random() * Math.PI * 2
				);

				const position = new THREE.Vector3();
				position.setFromSpherical(spherical);

				positionsArray[i2 + 0] = position.x;
				positionsArray[i2 + 1] = position.y;
				// positionsArray[i3 + 2] = position.z;

				sizesArray[i] = 1;
				timeMultiplierArray[i] = 1 + Math.random();
			}

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 2));
			geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1));
			geometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(timeMultiplierArray, 1));

			texture.flipY = false;
			const material = new THREE.ShaderMaterial({
				vertexShader: VertexShader,
				fragmentShader: FragmentShader,
				transparent: true,
				// depthWrite: false,
				// blending: THREE.AdditiveBlending,
				uniforms: {
					uSize: new THREE.Uniform(size),
					uResolution: new THREE.Uniform(sizes.resolution),
					uTexture: new THREE.Uniform(texture),
					uColor: new THREE.Uniform(color),
					uProgress: new THREE.Uniform(0),
					uMousePosition: new THREE.Uniform(mousPosition)
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
				duration: 2,
				value: 1,
				ease: 'linear',
				onComplete: destroy
			});
		};

		const createRandomFirework = () => {
			const count = 1;
			const position = new THREE.Vector3(-2, 0, 1);
			const size = 0.1 + Math.random() * 0.1;
			const texture = canBrushTexture;
			const radius = 0.5 + Math.random();
			const color = new THREE.Color();
			color.setRGB(0.5, 0.0, 0.6);
			const mousePosition = new THREE.Vector2(targetMouse.x, targetMouse.y);
			createFirework(count, position, size, texture, radius, color, mousePosition);
		};

		window.addEventListener('click', (event) => {
			createRandomFirework();
		});

		window.addEventListener('mousemove', (event) => {
			targetMouse.x = event.clientX / sizes.width - 0.5;
			targetMouse.y = (event.clientY - 56) / sizes.height - 0.5;

			createRandomFirework();
		});

		/**
		 * Animate
		 */
		const tick = () => {
			// Render
			renderer.render(scene, camera);

			currentMouse.x = lerp(currentMouse.x, targetMouse.x, lerpFactor);
			currentMouse.y = lerp(currentMouse.y, targetMouse.y, lerpFactor);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
