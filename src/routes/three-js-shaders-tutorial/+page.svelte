<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import testVertexShader from './shaders/vertex.glsl';
	import testFragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Target and current mouse positions for smooth interpolation
		let targetMousePosition = new THREE.Vector2(0, 0);
		let currentMousePosition = new THREE.Vector2(0, 0);
		let lerpFactor = 0.1; // Adjust this value to change smoothing (0-1)

		// Add to GUI for easy adjustment
		gui.add({ lerpSpeed: lerpFactor }, 'lerpSpeed', 0.01, 1, 0.01).onChange((value: number) => {
			lerpFactor = value;
		});

		// Helper function for linear interpolation
		function lerp(start: number, end: number, t: number): number {
			return start + (end - start) * t;
		}

		// Add mouse event listener
		window.addEventListener('mousemove', (event) => {
			// Calculate mouse position from 0 to 1 across entire screen
			targetMousePosition.x = event.clientX / window.innerWidth;
			targetMousePosition.y = 1 - event.clientY / window.innerHeight; // Invert Y so 0 is bottom, 1 is top
			console.log(targetMousePosition);
		});

		// Geometry
		const geometry = new THREE.PlaneGeometry(4, 4, 128, 128);

		const count = geometry.attributes.position.count;
		const randoms = new Float32Array(count);

		for (let i = 0; i < count; i++) {
			randoms[i] = Math.random();
		}

		geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

		// Material
		const material = new THREE.RawShaderMaterial({
			vertexShader: testVertexShader,
			fragmentShader: testFragmentShader,
			uniforms: {
				uFrequency: { value: new THREE.Vector2(2, 2) },
				uTime: { value: 0 },
				uColor: { value: new THREE.Color('orange') },
				uMousePosition: { value: new THREE.Vector2(0, 0) }
			}
		});

		gui.add(material.uniforms.uFrequency.value, 'x').min(0).max(20).step(0.01).name('frequencyX');
		gui.add(material.uniforms.uFrequency.value, 'y').min(0).max(20).step(0.01).name('frequencyY');

		// Mesh
		const mesh = new THREE.Mesh(geometry, material);
		mesh.material.side = THREE.DoubleSide;
		scene.add(mesh);

		//Sizes
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
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0.25, -0.25, 3);
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

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Smooth mouse position interpolation
			currentMousePosition.x = lerp(currentMousePosition.x, targetMousePosition.x, lerpFactor);
			currentMousePosition.y = lerp(currentMousePosition.y, targetMousePosition.y, lerpFactor);

			// Update the shader uniforms with the interpolated position
			material.uniforms.uMousePosition.value.copy(currentMousePosition);

			// Update material
			material.uniforms.uTime.value = elapsedTime;

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
