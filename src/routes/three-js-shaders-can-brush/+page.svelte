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
		// Setup
		const gui = new GUI({ width: 340 });
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const textureLoader = new THREE.TextureLoader();
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
		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 0, 7);
		scene.add(camera);
		// Controls
		// const controls = new OrbitControls(camera, canvas);
		// controls.enableDamping = true;
		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			alpha: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		const canBrushTexture = textureLoader.load('/particles/3.png');

		const cursor = {
			interactivePlane: new THREE.Mesh(
				new THREE.PlaneGeometry(10, 10),
				new THREE.MeshBasicMaterial({ color: 'red', opacity: 0.2, transparent: true })
			),
			raycaster: new THREE.Raycaster(),
			screenCursor: new THREE.Vector2(9999, 9999),
			planeCursor: new THREE.Vector2(9999, 9999)
		};
		cursor.interactivePlane.visible = false;
		scene.add(cursor.interactivePlane);

		document.addEventListener('pointermove', (event) => {
			cursor.screenCursor.x = (event.clientX / sizes.width) * 2 - 1;
			cursor.screenCursor.y = -((event.clientY - 56) / sizes.height) * 2 + 1;
		});

		// Fireworks
		const createFirework = (
			position: any,
			size: number,
			texture: any,
			radius: number,
			color: THREE.Color,
			mousPosition: THREE.Vector2
		) => {
			const positionsArray = new Float32Array(3);
			positionsArray[0] = 0.0;
			positionsArray[1] = 0.0;
			positionsArray[2] = 0.0;

			const timeMultiplierArray = new Float32Array(1);

			for (let i = 0; i < 1; i++) {
				timeMultiplierArray[i] = 1 + Math.random();
			}

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
			geometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(timeMultiplierArray, 1));

			texture.flipY = false;
			const material = new THREE.ShaderMaterial({
				vertexShader: VertexShader,
				fragmentShader: FragmentShader,
				transparent: true,
				depthWrite: false,
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
			const position = new THREE.Vector3(-2, 0, 1);
			const size = 0.1 + Math.random() * 0.1;
			const texture = canBrushTexture;
			const radius = 0.5 + Math.random();
			const color = new THREE.Color();
			color.setRGB(0.5, 0.0, 0.6);
			const mousePosition = new THREE.Vector2(cursor.planeCursor.x, cursor.planeCursor.y);
			createFirework(position, size, texture, radius, color, mousePosition);
		};

		window.addEventListener('click', (event) => {
			createRandomFirework();
		});

		window.addEventListener('mousemove', (event) => {
			createRandomFirework();
		});

		/**
		 * Animate
		 */
		const tick = () => {
			renderer.render(scene, camera);
			// controls.update();

			cursor.raycaster.setFromCamera(cursor.screenCursor, camera);
			const intersections = cursor.raycaster.intersectObject(cursor.interactivePlane);

			// console.log(intersections);

			if (intersections.length) {
				const uv = intersections[0].uv!;

				cursor.planeCursor.x = uv.x - 0.5;
				cursor.planeCursor.y = 0.5 - uv.y;
			}

			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
