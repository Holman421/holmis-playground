<script lang="ts">
	import * as THREE from 'three';
	import gsap from 'gsap'; // Add this import
	import { Vector3 } from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI, { Controller } from 'lil-gui';
	import {
		DotScreenPass,
		DRACOLoader,
		EffectComposer,
		GLTFLoader,
		RenderPass,
		RGBELoader,
		ShaderPass
	} from 'three/examples/jsm/Addons.js';
	import vertexShader from './shaders/vertext.glsl';
	import fragmentShader from './shaders/fragment.glsl';
	import { DotScreenShader } from './vertex';
	import { CustomPass } from './CustomPass';

	// Add TypeScript interfaces
	interface GuiControllers {
		progress: Controller | null;
		yOffset: Controller | null;
		currentCameraZ: Controller | null;
	}

	interface DebugObject {
		yOffset: number;
		uProgress: number;
		uScale: number;
		uTimeSpeed: number;
		planesGap: number;
		cameraInitialZ: number;
		cameraStartZ: number;
		cameraEndZ: number;
		currentCameraZ: number;
		noiseOpacity: number;
		animateProgress: () => void;
	}

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });

		// Store GUI controllers for updating
		const guiControllers: GuiControllers = {
			progress: null,
			yOffset: null,
			currentCameraZ: null
		};

		// Create a shared update function
		const updateScene = (progress: number) => {
			effect1.uniforms['uProgress'].value = progress;
			effect2.uniforms['opacity'].value = progress;
			debugObject.uProgress = progress;
			debugObject.yOffset = progress;
			updatePlanePositions(progress);

			// Update GUI displays
			guiControllers.progress?.updateDisplay();
			guiControllers.yOffset?.updateDisplay();

			if (!gsap.isTweening(camera.position)) {
				const newZ = THREE.MathUtils.lerp(
					debugObject.cameraStartZ,
					debugObject.cameraEndZ,
					progress
				);
				camera.position.setZ(newZ);
				debugObject.currentCameraZ = newZ;
				guiControllers.currentCameraZ?.updateDisplay();
			}
		};

		const debugObject: DebugObject = {
			yOffset: 1.0, // Changed from 0.0 to 1.0
			uProgress: 1, // Changed from 0 to 1
			uScale: 1.4,
			uTimeSpeed: 0.15,
			planesGap: 1.5,
			cameraInitialZ: 6, // Add initial camera Z position
			cameraStartZ: 4.6, // Add initial camera Z position
			cameraEndZ: 3.15, // Add target camera Z position
			currentCameraZ: 6, // Changed to match initial position
			noiseOpacity: 1.0, // Changed from 0.0 to 1.0
			animateProgress: () => {
				const targetProgress = debugObject.uProgress === 0 ? 1 : 0;
				gsap.to(debugObject, {
					uProgress: targetProgress,
					duration: 2,
					ease: 'power2.inOut',
					onUpdate: () => {
						updateScene(debugObject.uProgress);
					}
				});
			}
		};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		const imgTexture1 = new THREE.TextureLoader().load('/pictures/galaxy-img.jpg');
		const imgTexture2 = new THREE.TextureLoader().load('/pictures/galaxy-img2.jpg');
		const imgTexture3 = new THREE.TextureLoader().load('/pictures/universe.jpg');

		// Store planes in an array
		const planes: THREE.Mesh[] = [];

		// Update function for plane positions
		const updatePlanePositions = (yOffset: number) => {
			const currentGap = debugObject.planesGap * (1 - debugObject.uProgress);

			planes[0].position.setX(-currentGap);
			planes[1].position.setX(0);
			planes[2].position.setX(currentGap);

			planes.forEach((plane) => {
				plane.position.setY(-yOffset);
				plane.rotation.z = yOffset * Math.PI * 0.25;
			});
		};

		// Plane
		const createPlane = (position: Vector3, texture: THREE.Texture) => {
			const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
			const material = new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				side: THREE.DoubleSide,
				uniforms: {
					uTime: { value: 0 },
					uTexture: { value: texture }
				}
			});
			const plane = new THREE.Mesh(geometry, material);
			plane.position.copy(position);
			scene.add(plane);
			planes.push(plane);
			return plane;
		};

		// Initial plane creation with collapsed gap (uProgress = 1)
		createPlane(new THREE.Vector3(0, -debugObject.yOffset, 0), imgTexture1);
		createPlane(new THREE.Vector3(0, -debugObject.yOffset, 0), imgTexture2);
		createPlane(new THREE.Vector3(0, -debugObject.yOffset, 0), imgTexture3);

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

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
		camera.position.set(0, 0, debugObject.cameraInitialZ); // Set initial position
		scene.add(camera);

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Update initial effect values
		const composer = new EffectComposer(renderer);
		composer.addPass(new RenderPass(scene, camera));

		const effect1 = new ShaderPass(CustomPass);
		effect1.uniforms['uProgress'].value = debugObject.uProgress;
		effect1.uniforms['uScale'].value = debugObject.uScale;
		effect1.uniforms['uTimeSpeed'].value = debugObject.uTimeSpeed;
		composer.addPass(effect1);

		const effect2 = new ShaderPass(DotScreenShader);
		effect2.uniforms['opacity'].value = debugObject.noiseOpacity;
		composer.addPass(effect2);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		gsap.to(camera.position, {
			z: debugObject.cameraEndZ,
			duration: 2,
			delay: 0,
			ease: 'power2.inOut',
			onUpdate: () => {
				debugObject.currentCameraZ = camera.position.z;
			}
		});

		// Gui
		guiControllers.progress = gui
			.add(debugObject, 'uProgress')
			.min(0)
			.max(1)
			.step(0.01)
			.name('progress')
			.onChange((value: number) => {
				updateScene(value);
			});
		gui.add(effect1.uniforms['uScale'], 'value').min(0).max(5).step(0.1).name('scale');
		gui.add(effect1.uniforms['uTimeSpeed'], 'value').min(0).max(1).step(0.01).name('timeSpeed');
		guiControllers.yOffset = gui
			.add(debugObject, 'yOffset')
			.min(-1.0)
			.max(1.0)
			.step(0.01)
			.name('yOffset')
			.onChange(() => {
				updatePlanePositions(debugObject.yOffset);
			});

		// Add camera zoom controls to GUI if needed
		gui.add(debugObject, 'cameraEndZ').min(1).max(5).step(0.1).name('Camera End Z');
		guiControllers.currentCameraZ = gui
			.add(debugObject, 'currentCameraZ')
			.min(1)
			.max(6)
			.step(0.1)
			.name('Camera Z')
			.onChange(() => {
				camera.position.setZ(debugObject.currentCameraZ);
			});

		gui.add(effect2.uniforms['opacity'], 'value').min(0).max(1).step(0.01).name('noiseOpacity');

		// Add animate button to GUI (add this before the tick function)
		gui.add(debugObject, 'animateProgress').name('Animate Progress');

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			controls.update();

			effect1.uniforms['uTime'].value = elapsedTime;

			composer.render();

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
