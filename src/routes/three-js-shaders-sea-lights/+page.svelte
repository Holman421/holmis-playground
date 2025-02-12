<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import testVertexShader from './shaders/vertex.glsl';
	import testFragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		const gui = new GUI({ width: 340 });
		const debugObject = {
			depthColor: '#ff4000',
			surfaceColor: '#151c37'
		};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		/**
		 * Water
		 */
		// Geometry
		const waterGeometry = new THREE.PlaneGeometry(2, 2, 512, 512);
		waterGeometry.deleteAttribute('normal');
		waterGeometry.deleteAttribute('uv');
		// Material
		const waterMaterial = new THREE.ShaderMaterial({
			vertexShader: testVertexShader,
			fragmentShader: testFragmentShader,
			side: THREE.DoubleSide,
			uniforms: {
				uTime: { value: 0 },
				uBigWavesElevation: { value: 0.2 },
				uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },
				uBigWavesSpeed: { value: 0.75 },

				uSmallWavesElevation: { value: 0.15 },
				uSmallWavesFrequency: { value: 3 },
				uSmallWavesSpeed: { value: 0.2 },
				uSmallIterations: { value: 4 },

				uDepthColor: { value: new THREE.Color(debugObject.depthColor) },
				uSurfaceColor: { value: new THREE.Color(debugObject.surfaceColor) },
				uColorOffset: { value: 0.925 },
				uColorMultiplier: { value: 1 }
			}
		});

		// Mesh
		const water = new THREE.Mesh(waterGeometry, waterMaterial);
		water.rotation.x = -Math.PI * 0.5;
		scene.add(water);

		gui
			.add(waterMaterial.uniforms.uBigWavesElevation, 'value')
			.min(0)
			.max(1)
			.step(0.001)
			.name('uBigWavesElevation');

		gui
			.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'x')
			.min(0)
			.max(10)
			.step(0.001)
			.name('uBigWavesFrequencyX');
		gui
			.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'y')
			.min(0)
			.max(10)
			.step(0.001)
			.name('uBigWavesFrequencyY');
		gui
			.add(waterMaterial.uniforms.uBigWavesSpeed, 'value')
			.min(0)
			.max(4)
			.step(0.001)
			.name('uBigWavesSpeed');

		gui.addColor(debugObject, 'depthColor').onChange(() => {
			waterMaterial.uniforms.uDepthColor.value.set(debugObject.depthColor);
		});
		gui.addColor(debugObject, 'surfaceColor').onChange(() => {
			waterMaterial.uniforms.uSurfaceColor.value.set(debugObject.surfaceColor);
		});

		gui
			.add(waterMaterial.uniforms.uColorOffset, 'value')
			.min(0)
			.max(1)
			.step(0.001)
			.name('uColorOffset');
		gui
			.add(waterMaterial.uniforms.uColorMultiplier, 'value')
			.min(0)
			.max(10)
			.step(0.001)
			.name('uColorMultiplier');

		gui
			.add(waterMaterial.uniforms.uSmallWavesElevation, 'value')
			.min(0)
			.max(1)
			.step(0.001)
			.name('uSmallWavesElevation');
		gui
			.add(waterMaterial.uniforms.uSmallWavesFrequency, 'value')
			.min(0)
			.max(30)
			.step(0.001)
			.name('uSmallWavesFrequency');
		gui
			.add(waterMaterial.uniforms.uSmallWavesSpeed, 'value')
			.min(0)
			.max(4)
			.step(0.001)
			.name('uSmallWavesSpeed');
		gui
			.add(waterMaterial.uniforms.uSmallIterations, 'value')
			.min(0)
			.max(5)
			.step(1)
			.name('uSmallIterations');

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
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(1, 1, 1);
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
		renderer.toneMapping = THREE.ACESFilmicToneMapping;

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update material
			waterMaterial.uniforms.uTime.value = elapsedTime;

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
