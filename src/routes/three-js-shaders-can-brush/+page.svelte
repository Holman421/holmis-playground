<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/firework/vertex.glsl';
	import FragmentShader from './shaders/firework/fragment.glsl';
	import { gsap } from 'gsap';

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
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 1);
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

		let lastMousePosition = new THREE.Vector2(9999, 9999);
		let isFirstMove = true;

		const canBrushTexture = textureLoader.load('/particles/3.jpg');

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
			position: THREE.Vector3,
			size: number,
			texture: THREE.Texture,
			color: THREE.Color,
			mousePosition: THREE.Vector2
		) => {
			const positionsArray = new Float32Array(3);
			positionsArray[0] = 0.0;
			positionsArray[1] = 0.0;
			positionsArray[2] = 0.0;

			const timeMultiplierArray = new Float32Array(1);
			timeMultiplierArray[0] = 1 + Math.random();

			// Create random rotation array
			const rotationArray = new Float32Array(1);
			rotationArray[0] = Math.random() * Math.PI * 2; // Random rotation between 0 and 2π

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
			geometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(timeMultiplierArray, 1));
			geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotationArray, 1));

			texture.flipY = false;
			const material = new THREE.ShaderMaterial({
				vertexShader: VertexShader,
				fragmentShader: FragmentShader,
				transparent: true,
				depthWrite: false,
				uniforms: {
					uSize: new THREE.Uniform(size),
					uResolution: new THREE.Uniform(sizes.resolution),
					uTexture: new THREE.Uniform(texture),
					uColor: new THREE.Uniform(color),
					uProgress: new THREE.Uniform(0),
					uMousePosition: new THREE.Uniform(mousePosition)
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

		const interpolatePoints = (
			start: THREE.Vector2,
			end: THREE.Vector2,
			steps: number
		): THREE.Vector2[] => {
			const points: THREE.Vector2[] = [];
			for (let i = 0; i <= steps; i++) {
				const t = i / steps;
				points.push(
					new THREE.Vector2(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t)
				);
			}
			return points;
		};

		window.addEventListener('mousemove', (event) => {
			cursor.screenCursor.x = (event.clientX / sizes.width) * 2 - 1;
			cursor.screenCursor.y = -((event.clientY - 56) / sizes.height) * 2 + 1;

			// Update raycaster and get new cursor position
			cursor.raycaster.setFromCamera(cursor.screenCursor, camera);
			const intersections = cursor.raycaster.intersectObject(cursor.interactivePlane);

			if (intersections.length) {
				const uv = intersections[0].uv!;
				const currentPosition = new THREE.Vector2(uv.x - 0.5, 0.5 - uv.y);

				if (!isFirstMove) {
					// Calculate distance between last and current position
					const distance = currentPosition.distanceTo(lastMousePosition);

					// Determine number of steps based on distance
					const minDistance = 0.01; // Minimum distance between points
					const steps = Math.max(1, Math.ceil(distance / minDistance));

					// Generate interpolated points
					const points = interpolatePoints(lastMousePosition, currentPosition, steps);

					// Create fireworks for each interpolated point
					points.forEach((point) => {
						const position = new THREE.Vector3(-2, 0, 1);
						const size = 0.125 + Math.random() * 0.05;
						const color = new THREE.Color(0.5, 0.0, 0.6);
						createFirework(position, size, canBrushTexture, color, point);
					});
				}

				lastMousePosition.copy(currentPosition);
				isFirstMove = false;
			}
		});

		// Reset first move flag when mouse leaves window
		window.addEventListener('mouseout', () => {
			isFirstMove = true;
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
