<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import {
		DRACOLoader,
		EffectComposer,
		GLTFLoader,
		RenderPass,
		RenderPixelatedPass,
		RGBELoader
	} from 'three/examples/jsm/Addons.js';
	import { gsap } from 'gsap';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};

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
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2, 2),
			new THREE.ShaderMaterial({
				uniforms: {
					uPicture: { value: new THREE.TextureLoader().load('/pictures/galaxy-img.jpg') }
				},
				vertexShader: `
				varying vec2 vUv;

					void main() {
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
						vUv = uv;
					}
				`,
				fragmentShader: `
					uniform sampler2D uPicture;

					varying vec2 vUv;

					void main() {
					// Normal map displacement
					vec4 normalColor = texture2D(uPicture, vUv);
					gl_FragColor = normalColor;
					}
				`
			})
		);
		scene.add(plane);

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

		// Sizes
		const sizes = {
			width: 400,
			height: 400,
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

			effectComposer.setSize(sizes.width, sizes.height);
			effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-0, 0, 3);
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

		const renderTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
			samples: renderer.getPixelRatio() === 1 ? 2 : 0
		});

		const effectComposer = new EffectComposer(renderer, renderTarget);
		effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		effectComposer.setSize(sizes.width, sizes.height);

		const renderPass = new RenderPass(scene, camera);
		effectComposer.addPass(renderPass);

		const pixelAnimation = {
			size: 100
		};

		const renderPixelatedPass = new RenderPixelatedPass(pixelAnimation.size, scene, camera);
		renderPixelatedPass.enabled = true;
		effectComposer.addPass(renderPixelatedPass);

		const triggerPixelAnimation = () => {
			renderPixelatedPass.enabled = true;

			const targetSize = 0;
			const duration = 0.75; // Duration in seconds
			const startTime = performance.now();

			const animate = () => {
				const elapsedTime = (performance.now() - startTime) / 1000; // Convert to seconds
				const t = Math.min(elapsedTime / duration, 1); // Normalized time
				pixelAnimation.size = THREE.MathUtils.lerp(100, targetSize, t);
				renderPixelatedPass.setPixelSize(Math.max(1, pixelAnimation.size));

				if (t < 1) {
					requestAnimationFrame(animate);
				}
			};

			animate();
		};

		triggerPixelAnimation();

		gui.add({ animate: triggerPixelAnimation }, 'animate').name('Trigger Pixel Animation');

		// Animate
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Render
			effectComposer.render();

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

<style>
	div {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}
	canvas {
		display: block;
		margin-top: 10rem;
	}
</style>
