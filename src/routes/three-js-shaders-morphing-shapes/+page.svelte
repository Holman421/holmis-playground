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
		gui.hide(); // Hide the GUI
		const debugObject: any = {};
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./draco/');
		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		window.addEventListener('resize', () => {
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			if (particles) {
				particles.material.uniforms.uResolution.value.set(
					sizes.width * sizes.pixelRatio,
					sizes.height * sizes.pixelRatio
				);
			}

			// Update camera
			camera.left = -sizes.width / 2;
			camera.right = sizes.width / 2;
			camera.top = sizes.height / 2;
			camera.bottom = -sizes.height / 2;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		//Camera
		const aspect = sizes.width / sizes.height;
		const camera = new THREE.OrthographicCamera(
			-sizes.width / 2,
			sizes.width / 2,
			sizes.height / 2,
			-sizes.height / 2,
			0.1,
			100
		);
		camera.zoom = 35;
		camera.updateProjectionMatrix();
		camera.position.set(0, 0, 15);
		scene.add(camera);

		//Renderer
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
		// renderer.setClearColor(debugObject.clearColor);

		let particles: any = {
			maxCount: 0,
			index: 4,
			aRandomSize: null,
			positions: []
		};

		// Load models
		gltfLoader.load('/models/models.glb', (gltf) => {
			gltfLoader.load('/models/WMStar/star.glb', (star) => {
				gltfLoader.load('/models/WMText/WM_text.glb', (text) => {
					text.scene.children[0].scale.set(3, 3, 3);
					text.scene.children[0].position.x = 1.5;
					// text.scene.children[0].rotateX(Math.PI * 0.5);

					star.scene.children[0].rotateX(Math.PI * 0.5);
					star.scene.children[0].scale.set(2.25, 2.25, 2.25);

					// Update positions after transformations
					text.scene.updateMatrixWorld(true);
					star.scene.updateMatrixWorld(true);

					// Positions
					const positions = [
						...gltf.scene.children,
						text.scene.children[0],
						star.scene.children[0]
					].map((child: any) => {
						child.geometry.applyMatrix4(child.matrixWorld);
						return child.geometry.attributes.position;
					});

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
						transparent: true,
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

						if (index === 5) {
							// move camera up with gsap
							gsap.to(camera.position, {
								duration: 3,
								y: 20,
								x: 10,
								ease: 'power2.inOut',
								onUpdate: () => {
									camera.lookAt(0, 0, 0);
								}
							});
						} else if (index === 4) {
							// make the camera go back to default
							gsap.to(camera.position, {
								duration: 3,
								y: 0,
								x: 0,
								ease: 'power2.inOut',
								onUpdate: () => {
									camera.lookAt(0, 0, 0);
								}
							});
						}

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
					particles.WM_Text = () => {
						particles.morph(4);
					};
					particles.WM_Logo = () => {
						particles.morph(5);
					};

					gui
						.add(particles.material.uniforms.uProgress, 'value', 0, 1, 0.001)
						.name('progress')
						.listen();
					gui.add(particles, 'WM_Text');
					gui.add(particles, 'WM_Logo');

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

					setInterval(() => {
						if (particles.index === 4) {
							particles.WM_Logo();
						} else {
							particles.WM_Text();
						}
					}, 5000);

					setTimeout(() => {
						particles.WM_Logo();
					}, 1000);
				});
			});
		});

		/**
		 * Animate
		 */
		const tick = () => {
			// Update controls
			// controls.update();

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
