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

	let imageTexture: THREE.Texture;
	let planeMaterial: THREE.ShaderMaterial;
	let renderPixelatedPassRef: any;

	let pixelationConfig = {
		minPixelSize: 1
	};

	const triggerPixelAnimation = () => {
		if (!renderPixelatedPassRef) return;

		renderPixelatedPassRef.enabled = true;
		const pixelAnimation = { size: 100 };
		const targetSize = pixelationConfig.minPixelSize; // Use configured minimum size
		const duration = 0.75;
		const startTime = performance.now();

		const animate = () => {
			const elapsedTime = (performance.now() - startTime) / 1000;
			const t = Math.min(elapsedTime / duration, 1);
			pixelAnimation.size = THREE.MathUtils.lerp(100, targetSize, t);
			renderPixelatedPassRef.setPixelSize(
				Math.max(pixelationConfig.minPixelSize, pixelAnimation.size)
			);

			if (t < 1) {
				requestAnimationFrame(animate);
			}
		};

		animate();
	};

	function handleImageUpload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					if (imageTexture) {
						imageTexture.dispose();
					}
					imageTexture = new THREE.Texture(img);
					imageTexture.needsUpdate = true;
					planeMaterial.uniforms.uPicture.value = imageTexture;
					triggerPixelAnimation();
				};
				img.src = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });

		// Add pixelation slider
		gui
			.add(pixelationConfig, 'minPixelSize', 1, 32, 1)
			.name('Pixelation Level')
			.onChange((value: number) => {
				if (renderPixelatedPassRef) {
					renderPixelatedPassRef.setPixelSize(value);
				}
			});

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
		planeMaterial = new THREE.ShaderMaterial({
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
		});

		const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 2), planeMaterial);
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

		const renderPixelatedPass = new RenderPixelatedPass(100, scene, camera);
		renderPixelatedPass.enabled = true;
		effectComposer.addPass(renderPixelatedPass);
		renderPixelatedPassRef = renderPixelatedPass;

		// Initial animation
		triggerPixelAnimation();

		gui.add({ animate: triggerPixelAnimation }, 'animate').name('Trigger Pixel Animation');

		// Animate
		const clock = new THREE.Clock();

		let animationFrameId: number;
		const tick = () => {
			// Update controls
			controls.update();

			// Render
			effectComposer.render();

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			renderPixelatedPassRef = null;
		};
	});
</script>

<div class="container">
	<canvas class="webgl border"></canvas>
	<div class="controls">
		<input type="file" accept="image/*" id="imageUpload" on:change={handleImageUpload} />
		<label for="imageUpload" class="upload-btn">Choose Image</label>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	canvas {
		display: block;
		margin-top: 2rem;
	}

	.controls {
		margin-top: 1rem;
		text-align: center;
	}

	input[type='file'] {
		display: none;
	}

	.upload-btn {
		display: inline-block;
		padding: 10px 20px;
		background-color: #4caf50;
		color: white;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.3s;
	}

	.upload-btn:hover {
		background-color: #45a049;
	}
</style>
