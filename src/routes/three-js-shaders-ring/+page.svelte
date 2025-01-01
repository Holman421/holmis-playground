<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import vertexShader from './shaders/vertex.glsl';
	import fragmentShader from './shaders/fragment.glsl';
	import { EffectComposer, RenderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			noiseFrequency: 6.0,
			noiseAmplitude: 0.4,
			noiseSpeed: 1.0,
			threshold: 0.075,
			smoothness: 0.08,
			inwardColor: [0, 0, 0],
			outwardColor: [0, 0.14, 0.33],
			bloomStrength: 1.0,
			bloomRadius: 0.0001,
			bloomThreshold: 0.01,
			smoothStart: 0.1,
			smoothEnd: 1.0,
			powFactor: 2.0
		};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Plane
		const torus = new THREE.Mesh(
			new THREE.TorusGeometry(1, 0.3, 500, 500),
			new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				side: THREE.DoubleSide,
				wireframe: false,
				uniforms: {
					uTime: { value: 0 },
					uNoiseFrequency: { value: debugObject.noiseFrequency },
					uNoiseAmplitude: { value: debugObject.noiseAmplitude },
					uNoiseSpeed: { value: debugObject.noiseSpeed },
					uThreshold: { value: debugObject.threshold },
					uSmoothness: { value: debugObject.smoothness },
					uInwardColor: { value: new THREE.Color(...debugObject.inwardColor) },
					uOutwardColor: { value: new THREE.Color(...debugObject.outwardColor) },
					uSmoothStart: { value: debugObject.smoothStart },
					uSmoothEnd: { value: debugObject.smoothEnd },
					uPowFactor: { value: debugObject.powFactor }
				}
			})
		);

		scene.add(torus);

		// GUI
		const noiseFolder = gui.addFolder('Noise');
		noiseFolder
			.add(debugObject, 'noiseFrequency', 1, 20, 0.1)
			.onChange((value: any) => (torus.material.uniforms.uNoiseFrequency.value = value));
		noiseFolder
			.add(debugObject, 'noiseAmplitude', 0, 2, 0.01)
			.onChange((value: any) => (torus.material.uniforms.uNoiseAmplitude.value = value));
		noiseFolder
			.add(debugObject, 'noiseSpeed', 0, 5, 0.1)
			.onChange((value: any) => (torus.material.uniforms.uNoiseSpeed.value = value));

		const colorFolder = gui.addFolder('Colors');
		colorFolder
			.addColor(debugObject, 'inwardColor')
			.onChange((value: any) => torus.material.uniforms.uInwardColor.value.setRGB(...value));
		colorFolder
			.addColor(debugObject, 'outwardColor')
			.onChange((value: any) => torus.material.uniforms.uOutwardColor.value.setRGB(...value));

		const thresholdFolder = gui.addFolder('Threshold');
		thresholdFolder
			.add(debugObject, 'threshold', 0, 0.2, 0.001)
			.onChange((value: any) => (torus.material.uniforms.uThreshold.value = value));
		thresholdFolder
			.add(debugObject, 'smoothness', 0, 0.2, 0.001)
			.onChange((value: any) => (torus.material.uniforms.uSmoothness.value = value));

		const bloomFolder = gui.addFolder('Bloom');
		bloomFolder
			.add(debugObject, 'bloomStrength', 0, 15, 0.1)
			.onChange((value: any) => (bloomPass.strength = value));
		bloomFolder
			.add(debugObject, 'bloomRadius', 0, 0.001, 0.0001)
			.onChange((value: any) => (bloomPass.radius = value));
		bloomFolder
			.add(debugObject, 'bloomThreshold', 0, 1, 0.01)
			.onChange((value: any) => (bloomPass.threshold = value));

		const shapeFolder = gui.addFolder('Shape Parameters');
		shapeFolder
			.add(debugObject, 'smoothStart', 0, 1, 0.01)
			.onChange((value: any) => (torus.material.uniforms.uSmoothStart.value = value));
		shapeFolder
			.add(debugObject, 'smoothEnd', 0, 2, 0.01)
			.onChange((value: any) => (torus.material.uniforms.uSmoothEnd.value = value));
		shapeFolder
			.add(debugObject, 'powFactor', 0, 5, 0.1)
			.onChange((value: any) => (torus.material.uniforms.uPowFactor.value = value));

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
		camera.position.set(-0, 0, 12);
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

		// Post Processing
		let composer = new EffectComposer(renderer);
		composer.addPass(new RenderPass(scene, camera));

		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(sizes.width, sizes.height),
			10.0,
			0.0001,
			0.01
		);
		composer.addPass(bloomPass);

		// Animate
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			torus.material.uniforms.uTime.value = elapsedTime;
			// Update controls
			controls.update();

			// Render
			composer.render();

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
