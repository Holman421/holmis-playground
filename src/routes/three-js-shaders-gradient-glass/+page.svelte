<script lang="ts">
	import * as THREE from 'three';
	import { onDestroy } from 'svelte';
	import GUI from 'lil-gui';
	import gsap from 'gsap';
	import {
		DRACOLoader,
		EffectComposer,
		GLTFLoader,
		RenderPass,
		RGBELoader,
		ShaderPass
	} from 'three/examples/jsm/Addons.js';
	import bigSphereFragmentShader from './shaders/bigSphere/fragment.glsl';
	import bigSpereVertexShader from './shaders/bigSphere/vertex.glsl';
	import smallSphereFragmentShader from './shaders/smallSphere/fragment.glsl';
	import smallSphereVertexShader from './shaders/smallSphere/vertex.glsl';
	import { DotScreenShader } from './shaders/postprocessing/vertex';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			randomizeColors: () => {
				// Generate random colors
				const color1 = new THREE.Color(Math.random(), Math.random(), Math.random());
				const color2 = new THREE.Color(Math.random(), Math.random(), Math.random());
				const color3 = new THREE.Color(Math.random(), Math.random(), Math.random());

				// Update uniforms
				material.uniforms.uBaseFirstColor.value = color1;
				material.uniforms.uBaseSecondColor.value = color2;
				material.uniforms.uAccentColor.value = color3;

				// Update GUI controllers
				colorsFolder.controllers.forEach((controller) => {
					controller.updateDisplay();
				});
			},
			isAnimated: false,
			triggerAnimation: () => {
				// Toggle animation state
				debugObject.isAnimated = !debugObject.isAnimated;

				// Animate to new or initial position based on state
				gsap.to(material.uniforms.uPatternFrequency, {
					value: debugObject.isAnimated ? 1 : 10.0,
					duration: 2,
					ease: 'power2.out'
				});

				gsap.to(mesh2.position, {
					x: debugObject.isAnimated ? -0.74 : 0.3,
					y: debugObject.isAnimated ? -0.06 : 0.21,
					z: debugObject.isAnimated ? -0.84 : 0.16,
					duration: 2,
					ease: 'power2.out'
				});
			}
		};
		// gui.hide();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const rgbeLoader = new RGBELoader();
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./draco/');
		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);

		// Plane
		const addObjects = () => {
			const material = new THREE.ShaderMaterial({
				vertexShader: bigSpereVertexShader,
				fragmentShader: bigSphereFragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uResolution: { value: new THREE.Vector2() },
					uMouse: { value: new THREE.Vector2() },
					uBaseFirstColor: { value: new THREE.Color(120 / 255, 158 / 255, 113 / 255) },
					uBaseSecondColor: { value: new THREE.Color(224 / 255, 148 / 255, 66 / 255) },
					uAccentColor: { value: new THREE.Color(0, 0, 0) },
					uNoiseSpeed: { value: 0.4 },
					uNoiseScale: { value: 1.0 },
					uPatternFrequency: { value: 10.0 },
					uFirstOffset: { value: 0.5 },
					uSecondOffset: { value: 2.0 } // Changed initial value to 2.0
				},
				side: THREE.DoubleSide
			});

			const geometry = new THREE.SphereGeometry(1, 32, 32, 32);
			const mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);

			const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
				format: THREE.RGBFormat,
				generateMipmaps: true,
				minFilter: THREE.LinearMipmapLinearFilter
				// encoding: THREE.sRGBEncoding
			});

			const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);

			let geometry2 = new THREE.SphereGeometry(0.4, 64, 64, 64);
			let material2 = new THREE.ShaderMaterial({
				vertexShader: smallSphereVertexShader,
				fragmentShader: smallSphereFragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uCube: { value: 0 },
					uResolution: { value: new THREE.Vector2() },
					uMouse: { value: new THREE.Vector2() },
					uRefractionRatio: { value: 1.02 },
					uFresnelBias: { value: 0.1 },
					uFresnelScale: { value: 4.0 },
					uFresnelPower: { value: 2.0 }
				},
				side: THREE.DoubleSide
			});
			let mesh2 = new THREE.Mesh(geometry2, material2);
			mesh2.position.set(0.3, 0.21, 0.16);
			scene.add(mesh2);

			return { material, mesh, material2, mesh2, cubeCamera, cubeRenderTarget };
		};

		const { material, mesh, material2, mesh2, cubeCamera, cubeRenderTarget } = addObjects();

		// Add initial GSAP animation
		gsap.to(material.uniforms.uSecondOffset, {
			value: 0.1,
			duration: 2
		});

		// Add animation control to GUI
		gui.add(debugObject, 'triggerAnimation').name('Trigger Animation');

		// Add GUI controls for mesh2 position
		const mesh2Position = gui.addFolder('Small Sphere Position');
		mesh2Position.add(mesh2.position, 'x').min(-3).max(3).step(0.01).name('X Position');
		mesh2Position.add(mesh2.position, 'y').min(-3).max(3).step(0.01).name('Y Position');
		mesh2Position.add(mesh2.position, 'z').min(-3).max(3).step(0.01).name('Z Position');

		// Add GUI controls for shader parameters
		const shaderParams = gui.addFolder('Shader Parameters');
		shaderParams
			.add(material2.uniforms.uRefractionRatio, 'value', 0.5, 2.0, 0.01)
			.name('Refraction Ratio');
		shaderParams.add(material2.uniforms.uFresnelBias, 'value', 0.0, 1.0, 0.01).name('Fresnel Bias');
		shaderParams
			.add(material2.uniforms.uFresnelScale, 'value', 0.0, 10.0, 0.1)
			.name('Fresnel Scale');
		shaderParams
			.add(material2.uniforms.uFresnelPower, 'value', 0.0, 5.0, 0.1)
			.name('Fresnel Power');

		// Add GUI controls for colors
		const colorsFolder = gui.addFolder('Colors');
		colorsFolder.addColor(material.uniforms.uBaseFirstColor, 'value').name('Base First Color');
		colorsFolder.addColor(material.uniforms.uBaseSecondColor, 'value').name('Base Second Color');
		colorsFolder.addColor(material.uniforms.uAccentColor, 'value').name('Accent Color');
		colorsFolder.add(debugObject, 'randomizeColors').name('Random Colors');

		// Add GUI controls for pattern parameters
		const patternFolder = gui.addFolder('Pattern Controls');
		patternFolder.add(material.uniforms.uNoiseSpeed, 'value', 0.1, 2.0, 0.1).name('Noise Speed');
		patternFolder.add(material.uniforms.uNoiseScale, 'value', 0.1, 5.0, 0.1).name('Noise Scale');
		patternFolder
			.add(material.uniforms.uPatternFrequency, 'value', 1.0, 20.0, 0.5)
			.name('Pattern Frequency');
		patternFolder
			.add(material.uniforms.uFirstOffset, 'value', 0.0, 2.0, 0.1)
			.name('First Pattern Offset');
		patternFolder
			.add(material.uniforms.uSecondOffset, 'value', 0.0, 2.0, 0.1)
			.name('Second Pattern Offset');

		// // Lights
		// const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		// directionalLight.position.set(6.25, 3, 4);
		// scene.add(directionalLight);

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

			// Update composer
			composer.setSize(sizes.width, sizes.height);
		});

		// Mouse movement
		const mouse = {
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0
		};

		window.addEventListener('mousemove', (event) => {
			// Convert mouse position to normalized coordinates (-1 to 1)
			mouse.targetX = (event.clientX / sizes.width - 0.5) * 2;
			mouse.targetY = (event.clientY / sizes.height - 0.5) * 2;
		});

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 0, 1);
		scene.add(camera);

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Post processing
		const composer = new EffectComposer(renderer);
		composer.addPass(new RenderPass(scene, camera));

		const effect1 = new ShaderPass(DotScreenShader);
		effect1.uniforms['scale'].value = 4;
		composer.addPass(effect1);

		// Animate
		const clock = new THREE.Clock();

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Smooth mouse movement
			mouse.x += (mouse.targetX - mouse.x) * 0.05;
			mouse.y += (mouse.targetY - mouse.y) * 0.05;
			// Update camera position based on mouse
			camera.position.x = mouse.x * 0.175;
			camera.position.y = -mouse.y * 0.1;
			camera.position.z = 1;
			camera.lookAt(scene.position);

			// Update material
			material.uniforms.uTime.value = elapsedTime;
			material2.uniforms.uTime.value = elapsedTime;

			// Update controls
			mesh2.visible = false;
			cubeCamera.update(renderer, scene);
			mesh2.visible = true;
			material2.uniforms.uCube.value = cubeRenderTarget.texture;

			// Render
			composer.render();
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();

		onDestroy(() => {
			window.removeEventListener('mousemove', () => {});
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		});
	});
</script>

<div>
	<canvas class="webgl"></canvas>
	<h1
		class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl opacity-0 animate-fade-in"
	>
		Wonder makers
	</h1>
</div>
