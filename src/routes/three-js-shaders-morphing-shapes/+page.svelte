<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import particlesVertexShader from './shaders/vertex.glsl';
	import particlesFragmentShader from './shaders/fragment.glsl';
	import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
	import gsap from 'gsap';

	$effect(() => {
		const gui = new GUI({ width: 340 });
		const debugObject: any = {};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./draco/');
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

			if (particles) {
				// Materials
				particles.material.uniforms.uResolution.value.set(
					sizes.width * sizes.pixelRatio,
					sizes.height * sizes.pixelRatio
				);
			}

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
		camera.position.set(0, 0, 8 * 2);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});

		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		debugObject.clearColor = '#160920';
		gui.addColor(debugObject, 'clearColor').onChange(() => {
			renderer.setClearColor(debugObject.clearColor);
		});
		renderer.setClearColor(debugObject.clearColor);

		let particles: any = null;

		// Load models
		gltfLoader.load('/models/models.glb', (gltf) => {
			gltfLoader.load('/models/WMStar/star.glb', (star) => {
				// Particles
				particles = {};
				particles.index = 0;
				particles.maxCount = 0;

				// Positions
				const positions = [...gltf.scene.children, star.scene.children[0]].map(
					(child: any) => child.geometry.attributes.position
				);

				for (const position of positions) {
					if (position.count > particles.maxCount) {
						particles.maxCount = position.count;
					}
				}

				particles.aRandomSize = new Float32Array(particles.maxCount);
				particles.positions = [];

				for (const position of positions) {
					const originalArray = position.array;
					const newArray = new Float32Array(particles.maxCount * 3);

					for (let i = 0; i < particles.maxCount; i++) {
						const i3 = i * 3;
						particles.aRandomSize[i] = Math.random();

						if (i3 < originalArray.length) {
							newArray[i3 + 0] = originalArray[i3 + 0];
							newArray[i3 + 1] = originalArray[i3 + 1];
							newArray[i3 + 2] = originalArray[i3 + 2];
						} else {
							const randomIndex = Math.floor(position.count * Math.random()) * 3;
							newArray[i3 + 0] = originalArray[randomIndex + 0];
							newArray[i3 + 1] = originalArray[randomIndex + 1];
							newArray[i3 + 2] = originalArray[randomIndex + 2];
						}
					}

					particles.positions.push(new THREE.Float32BufferAttribute(newArray, 3));
				}

				// Geometry
				particles.geometry = new THREE.BufferGeometry();
				particles.geometry.setAttribute('position', particles.positions[particles.index]);
				particles.geometry.setAttribute('aPositionTarget', particles.positions[3]);
				particles.geometry.setAttribute(
					'aRandomSize',
					new THREE.Float32BufferAttribute(particles.aRandomSize, 1)
				);

				// Material
				particles.colorA = '#ff7300';
				particles.colorB = '#0091ff';
				particles.material = new THREE.ShaderMaterial({
					vertexShader: particlesVertexShader,
					fragmentShader: particlesFragmentShader,
					blending: THREE.AdditiveBlending,
					depthWrite: false,
					uniforms: {
						uSize: new THREE.Uniform(0.3),
						uResolution: new THREE.Uniform(
							new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
						),
						uProgress: new THREE.Uniform(0),
						uColorA: new THREE.Uniform(new THREE.Color(particles.colorA)),
						uColorB: new THREE.Uniform(new THREE.Color(particles.colorB))
					}
				});

				particles.morph = (index: number) => {
					// Update attributes
					particles.geometry.attributes.position = particles.positions[particles.index];
					particles.geometry.attributes.aPositionTarget = particles.positions[index];

					// Animate uProgress
					gsap.fromTo(
						particles.material.uniforms.uProgress,
						{ value: 0 },
						{ value: 1, duration: 3, ease: 'linear' }
					);

					// Update index
					particles.index = index;
				};

				particles.Donut = () => {
					particles.morph(0);
				};
				particles.Monkey = () => {
					particles.morph(1);
				};
				particles.Ball = () => {
					particles.morph(2);
				};
				particles.Text = () => {
					particles.morph(3);
				};
				particles.WM_Star = () => {
					particles.morph(4);
				};

				gui
					.add(particles.material.uniforms.uProgress, 'value', 0, 1, 0.001)
					.name('progress')
					.listen();
				gui.add(particles, 'Donut');
				gui.add(particles, 'Monkey');
				gui.add(particles, 'Ball');
				gui.add(particles, 'Text');
				gui.add(particles, 'WM_Star');

				gui.addColor(particles, 'colorA').onChange(() => {
					particles.material.uniforms.uColorA.value.set(particles.colorA);
				});

				gui.addColor(particles, 'colorB').onChange(() => {
					particles.material.uniforms.uColorB.value.set(particles.colorB);
				});

				// Points
				particles.points = new THREE.Points(particles.geometry, particles.material);
				particles.points.frustumCulled = false;
				scene.add(particles.points);
			});
		});

		/**
		 * Animate
		 */
		const tick = () => {
			// Update controls
			controls.update();

			// Render normal scene
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
