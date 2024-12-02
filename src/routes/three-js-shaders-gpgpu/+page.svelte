<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import particlesVertexShader from './shaders/vertex.glsl';
	import particlesFragmentShader from './shaders/fragment.glsl';
	import gpgpuParticlesShader from './shaders/gpgpu/particles.glsl';
	import { DRACOLoader, GLTFLoader, GPUComputationRenderer } from 'three/examples/jsm/Addons.js';
	import gsap from 'gsap';

	$effect(() => {
		const gui = new GUI({ width: 340 });
		const debugObject: any = {
			modelOpacity: 0.0,
			pointsOpacity: 1.0
		};
		gui.hide();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('/draco/');

		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);

		/**
		 * Sizes
		 */
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

			// Materials
			particles.material.uniforms.uResolution.value.set(
				sizes.width * sizes.pixelRatio,
				sizes.height * sizes.pixelRatio
			);

			// Update camera
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(15, 4, 10);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.position0.set(6.5, 0, 1);
		controls.enableDamping = true;

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.position.set(3.25, 2, 4.25);
		scene.add(directionalLight);

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		debugObject.clearColor = '#000000';
		renderer.setClearColor(debugObject.clearColor);

		const particles: any = {};
		const gpgpu: any = {};

		let gltfScene: any = null;

		gltfLoader.load('/models/ship/model.glb', (gltf) => {
			gltfScene = gltf.scene;
			gltf.scene.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.material.transparent = true;
					child.material.opacity = debugObject.modelOpacity; // Set the desired opacity here
				}
			});

			// Base geometry
			const baseGeometry: any = {
				instance: (gltf.scene.children[0] as THREE.Mesh).geometry
			};
			baseGeometry.count = baseGeometry.instance.attributes.position.count;

			// GPU compute
			gpgpu.size = Math.ceil(Math.sqrt(baseGeometry.count));
			gpgpu.computation = new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer);

			const baseParticlesTexture = gpgpu.computation.createTexture();

			for (let i = 0; i < baseGeometry.count; i++) {
				const i3 = i * 3;
				const i4 = i * 4;

				baseParticlesTexture.image.data[i4 + 0] =
					baseGeometry.instance.attributes.position.array[i3 + 0];
				baseParticlesTexture.image.data[i4 + 1] =
					baseGeometry.instance.attributes.position.array[i3 + 1];
				baseParticlesTexture.image.data[i4 + 2] =
					baseGeometry.instance.attributes.position.array[i3 + 2];
				baseParticlesTexture.image.data[i4 + 3] = Math.random();
			}

			gpgpu.particlesVariable = gpgpu.computation.addVariable(
				'uParticles',
				gpgpuParticlesShader,
				baseParticlesTexture
			);
			gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [gpgpu.particlesVariable]);

			// GPGPU Uniforms
			gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0);
			gpgpu.particlesVariable.material.uniforms.uDeltaTime = new THREE.Uniform(0);
			gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(baseParticlesTexture);
			gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence = new THREE.Uniform(0.5);
			gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength = new THREE.Uniform(2.0);
			gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency = new THREE.Uniform(0.5);

			// Init
			gpgpu.computation.init();

			// GPGPU Debug
			gpgpu.debug = new THREE.Mesh(
				new THREE.PlaneGeometry(3, 3),
				new THREE.MeshBasicMaterial({
					map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture
				})
			);
			gpgpu.debug.position.x = 3;
			gpgpu.debug.visible = false;
			scene.add(gpgpu.debug);

			/**
			 * Particles
			 */

			// Geometry buffer
			const particlesUvArray = new Float32Array(baseGeometry.count * 2);
			const sizesArray = new Float32Array(baseGeometry.count);

			for (let y = 0; y < gpgpu.size; y++) {
				for (let x = 0; x < gpgpu.size; x++) {
					const i = y * gpgpu.size + x;
					const i2 = i * 2;

					const uvX = (x + 0.5) / gpgpu.size;
					const uvY = (y + 0.5) / gpgpu.size;

					particlesUvArray[i2 + 0] = uvX;
					particlesUvArray[i2 + 1] = uvY;

					sizesArray[i] = 0.5 + Math.random() * 0.5;
				}
			}

			particles.geometry = new THREE.BufferGeometry();
			particles.geometry.setDrawRange(0, baseGeometry.count);
			particles.geometry.setAttribute(
				'aParticlesUv',
				new THREE.BufferAttribute(particlesUvArray, 2)
			);
			particles.geometry.setAttribute('aColor', baseGeometry.instance.attributes.color);
			particles.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1));

			// Material
			particles.material = new THREE.ShaderMaterial({
				vertexShader: particlesVertexShader,
				fragmentShader: particlesFragmentShader,
				transparent: true,
				// depthWrite: false,
				uniforms: {
					uSize: new THREE.Uniform(0.035),
					uResolution: new THREE.Uniform(
						new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
					),
					uParticlesTexture: new THREE.Uniform(
						gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture
					),
					uOpacity: new THREE.Uniform(debugObject.pointsOpacity)
				}
			});

			// Points
			particles.points = new THREE.Points(particles.geometry, particles.material);

			scene.add(particles.points);
			scene.add(gltf.scene);

			// Add the gsap function here
			gsap.fromTo(
				gltf.scene.position,
				{ x: 9, y: 0, z: -12 },
				{ x: 6.5, y: -0.0, z: -4.5, duration: 2, delay: 0.5, ease: 'power1.inOut' }
			);
			gsap.fromTo(
				particles.points.position,
				{ x: 9, y: 0, z: -12 },
				{ x: 6.5, y: -0.0, z: -4.5, duration: 2, delay: 0.5, ease: 'power1.inOut' }
			);

			// Add axis helper
			// const axesHelper = new THREE.AxesHelper(5);
			// axesHelper.setColors('red', 'green', 'blue');
			// scene.add(axesHelper);

			// Update controls target position
			controls.target.set(6.5, 1, 1);
			controls.update();

			/**
			 * Tweaks
			 */
			gui.addColor(debugObject, 'clearColor').onChange(() => {
				renderer.setClearColor(debugObject.clearColor);
			});
			gui.add(particles.material.uniforms.uSize, 'value').min(0).max(1).step(0.001).name('uSize');
			gui
				.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, 'value')
				.min(0)
				.max(1)
				.step(0.001)
				.name('uFlowFieldInfluence');

			gui
				.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, 'value')
				.min(0)
				.max(10)
				.step(0.001)
				.name('uFlowFieldStrength');

			gui
				.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, 'value')
				.min(0)
				.max(1)
				.step(0.001)
				.name('uFlowFieldFrequency');

			gui
				.add(debugObject, 'modelOpacity')
				.min(0)
				.max(1)
				.step(0.001)
				.name('Model Opacity')
				.onChange(() => {
					gltf.scene.traverse((child) => {
						if (child instanceof THREE.Mesh) {
							child.material.transparent = true;
							child.material.opacity = debugObject.modelOpacity;
						}
					});
				});

			gui.add(debugObject, 'pointsOpacity').onChange(() => {
				particles.material.uniforms.uOpacity.value = debugObject.pointsOpacity;
			});
		});

		// Add the gsap function here

		const button = document.querySelector('#bro-button')!;

		const updateOpacity = (
			modelOpacity: number,
			pointsOpacity: number,
			flowFieldInfluence: number
		) => {
			gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, {
				value: flowFieldInfluence,
				duration: 2,
				ease: 'power2.inOut'
			});

			gsap.to(debugObject, {
				modelOpacity: modelOpacity,
				duration: 2,
				ease: 'power2.inOut',
				onUpdate: () => {
					gltfScene.traverse((child: any) => {
						if (child instanceof THREE.Mesh) {
							child.material.transparent = true;
							child.material.opacity = debugObject.modelOpacity;
						}
					});
				}
			});

			gsap.to(debugObject, {
				pointsOpacity: pointsOpacity,
				duration: 2,
				ease: 'power2.inOut',
				onUpdate: () => {
					particles.material.depthWrite = pointsOpacity === 1;
					particles.material.uniforms.uOpacity.value = debugObject.pointsOpacity;
				}
			});
		};

		button.addEventListener('click', () => {
			if (!gltfScene) return;

			if (debugObject.modelOpacity === 0) {
				updateOpacity(1, 0, 0);
			} else {
				updateOpacity(0, 1, 0.5);
			}
		});

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let previousTime = 0;

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			const deltaTime = elapsedTime - previousTime;
			previousTime = elapsedTime;

			// Update controls
			controls.update();

			if (gpgpu.computation) {
				gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
				gpgpu.particlesVariable.material.uniforms.uTime.value = elapsedTime;
				gpgpu.computation.compute();
				particles.material.uniforms.uParticlesTexture.value =
					gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture;
			}

			// Render normal scene
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div class="relative">
	<canvas class="webgl"></canvas>
	<div class="absolute top-40 left-40 flex flex-col gap-8">
		<h1 class="text-5xl">Let us make your vision clear</h1>
		<button class=" bg-slate-50 text-black py-4 px-8 w-fit rounded-sm text-xl" id="bro-button"
			>Show me</button
		>
	</div>
</div>
