<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/vertex.glsl';
	import FragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		// Debug
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

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

		// Raycaster
		let raycaster = new THREE.Raycaster();
		let mouse = new THREE.Vector2();

		// Add mouse event listener
		canvas.addEventListener('mousemove', (event) => {
			// Calculate mouse position in normalized device coordinates
			// (-1 to +1) for both components
			mouse.x = (event.clientX / sizes.width) * 2 - 1;
			mouse.y = -(((event.clientY - 56) / sizes.height) * 2 - 1);

			// Use the raycaster to check if the mouse is over the plane
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObject(plane);

			if (intersects.length > 0) {
				// Mouse is over the plane
				handleMouseEnter(intersects[0].uv!);
			} else {
				// Mouse is not over the plane
				handleMouseExit();
			}
		});

		let isMouseOnPlane = false;
		let mousePosition = new THREE.Vector2(0, 0);

		function handleMouseEnter(position: THREE.Vector2) {
			isMouseOnPlane = true;
			mousePosition.copy(position);

			// Update the shader uniforms with the mouse position
			material.uniforms.uMousePosition.value.copy(mousePosition);
		}

		function handleMouseExit() {
			isMouseOnPlane = false;
		}

		// Camera
		const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 10, 0);
		camera.lookAt(0, 0, 0);
		scene.add(camera);

		// Renderer
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

		const trailPositions = Array(20).fill([0, 0]);
		let index = 0;

		let lastTime = 0;
		const updateInterval = 64; // Update every 16ms

		document.addEventListener('mousemove', (event) => {
			const now = Date.now();
			if (now - lastTime >= updateInterval) {
				trailPositions[index] = [event.clientX, event.clientY];
				index = (index + 1) % trailPositions.length;
				lastTime = now;
			}
		});

		// Material
		const material = new THREE.ShaderMaterial({
			vertexShader: VertexShader,
			fragmentShader: FragmentShader,
			transparent: true,
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(debugObject.color) },
				uResolution: {
					value: new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
				},
				uMousePosition: { value: new THREE.Vector2(0, 0) },
				uTrailPositions: new THREE.Uniform(trailPositions)
			}
		});

		gui.addColor(debugObject, 'color').onChange(() => {
			material.uniforms.uColor.value.set(debugObject.color);
		});

		// Plane
		const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 128, 128), material);
		plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI * 0.5);
		plane.position.y = -1;
		scene.add(plane);

		// Animate
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update uniform time
			material.uniforms.uTime.value = elapsedTime;

			// Render
			renderer.render(scene, camera);

			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
