<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import testVertexShader from './shaders/vertex.glsl';
	import testFragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		/**
		 * Base
		 */
		// Debug
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl')! as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		/**
		 * Textures
		 */
		const textureLoader = new THREE.TextureLoader();

		/**
		 * Test cube
		 */
		const parameters = {
			count: 200000,
			size: 0.001,
			radius: 5,
			branches: 5,
			spin: 0,
			randomness: 0.65,
			branchSaturation: 4.3,
			centerSaturation: 4.5,
			rotationSpeed: 0.0,
			insideColor: '#318CE7',
			outsideColor: '#E3963E',
			centralStarCount: 15000 // New parameter for additional stars in the center
		};

		let geometry: any = null;
		let material: any = null;
		let points: any = null;

		const generateGalaxy = () => {
			if (points !== null) {
				geometry.dispose();
				material.dispose();
				scene.remove(points);
			}
			geometry = new THREE.BufferGeometry();

			const blackHole = new THREE.Mesh(
				new THREE.SphereGeometry(0.05, 32, 32),
				new THREE.MeshBasicMaterial({ color: 'black' })
			);

			scene.add(blackHole);

			const positions = new Float32Array((parameters.count + parameters.centralStarCount) * 3);
			const scales = new Float32Array(parameters.count * 1);
			const colors = new Float32Array((parameters.count + parameters.centralStarCount) * 3);
			const randomness = new Float32Array(parameters.count * 3);

			const colorInside = new THREE.Color(parameters.insideColor);
			const colorOutside = new THREE.Color(parameters.outsideColor);

			for (let i = 0; i < parameters.count; i++) {
				const i3 = i * 3;

				const radiusRandom = Math.random();
				const radius = Math.pow(radiusRandom, parameters.centerSaturation) * parameters.radius;

				const spinAngle = radius * parameters.spin;
				const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

				const randomX =
					Math.pow(Math.random(), parameters.branchSaturation) *
					(Math.random() < 0.5 ? 1 : -1) *
					parameters.randomness *
					radius;
				const randomY =
					Math.pow(Math.random(), parameters.branchSaturation) *
					(Math.random() < 0.5 ? 1 : -1) *
					parameters.randomness *
					radius;
				const randomZ =
					Math.pow(Math.random(), parameters.branchSaturation) *
					(Math.random() < 0.5 ? 1 : -1) *
					parameters.randomness *
					radius;

				randomness[i3 + 0] = randomX;
				randomness[i3 + 1] = randomY;
				randomness[i3 + 2] = randomZ;

				positions[i3 + 0] = Math.cos(branchAngle + spinAngle) * radius;
				positions[i3 + 1] = 0;
				positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius;

				scales[i] = Math.random();

				const mixedColor = colorInside.clone();
				mixedColor.lerp(colorOutside, radius / parameters.radius);
				colors[i3] = mixedColor.r;
				colors[i3 + 1] = mixedColor.g;
				colors[i3 + 2] = mixedColor.b;
			}

			console.log(scales);

			// for (let i = parameters.count; i < parameters.count + parameters.centralStarCount; i++) {
			// 	const i3 = i * 3;

			// 	const theta = Math.random() * Math.PI * 2;
			// 	const phi = Math.acos(2 * Math.random() - 1);
			// 	const radius = Math.random() * parameters.radius * 0.075;

			// 	positions[i3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
			// 	positions[i3 + 1] = (radius * Math.sin(phi) * Math.cos(theta)) / 10;
			// 	positions[i3 + 2] = radius * Math.cos(phi);
			// }

			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.setAttribute('aScale', new THREE.BufferAttribute(positions, 1));
			geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));

			material = new THREE.ShaderMaterial({
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				vertexColors: true,
				vertexShader: testVertexShader,
				fragmentShader: testFragmentShader,
				uniforms: {
					uSize: { value: 10 * renderer.getPixelRatio() },
					uTime: { value: 0 }
				}
			});

			points = new THREE.Points(geometry, material);
			scene.add(points);
		};

		gui.add(parameters, 'count').min(100).max(500000).step(100).onFinishChange(generateGalaxy);
		gui.add(parameters, 'size').min(0.001).max(0.1).step(0.001).onFinishChange(generateGalaxy);
		gui.add(parameters, 'radius').min(1).max(20).step(1).onFinishChange(generateGalaxy);
		gui.add(parameters, 'branches').min(2).max(20).step(1).onFinishChange(generateGalaxy);
		gui.add(parameters, 'spin').min(-5).max(5).step(0.001).onFinishChange(generateGalaxy);
		gui.add(parameters, 'randomness').min(0).max(2).step(0.001).onFinishChange(generateGalaxy);
		gui.add(parameters, 'branchSaturation').min(1).max(10).step(0.1).onFinishChange(generateGalaxy);
		gui.add(parameters, 'centerSaturation').min(1).max(10).step(0.1).onFinishChange(generateGalaxy);
		gui.add(parameters, 'rotationSpeed').min(0).max(1).step(0.001);
		gui.addColor(parameters, 'insideColor').onFinishChange(generateGalaxy);
		gui.addColor(parameters, 'outsideColor').onFinishChange(generateGalaxy);
		gui
			.add(parameters, 'centralStarCount')
			.min(0)
			.max(25000)
			.step(100)
			.onFinishChange(generateGalaxy);

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
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 100);
		camera.position.z = 3;
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

		generateGalaxy();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			points.rotation.y = elapsedTime * parameters.rotationSpeed;
			points.rotation.x = elapsedTime * parameters.rotationSpeed;

			// Update uniform time
			material.uniforms.uTime.value = elapsedTime;

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();

		// Fullscreen functionality
		const toggleFullscreen = () => {
			if (!document.fullscreenElement) {
				canvas.requestFullscreen().catch((err) => {
					console.error(
						`Error attempting to enable full-screen mode: ${err.message} (${err.name})`
					);
				});
			} else {
				document.exitFullscreen();
			}
		};

		canvas.addEventListener('dblclick', toggleFullscreen);
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
