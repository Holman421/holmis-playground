<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import testVertexShader from './shaders/vertex.glsl';
	import testFragmentShader from './shaders/fragment.glsl';
	import atmosphereVertexShader from './atmosphere/vertex.glsl';
	import atmosphereFragmentShader from './atmosphere/fragment.glsl';

	$effect(() => {
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();

		// Textures
		const earthDayTexture = textureLoader.load('/models/earth/day.jpg');
		earthDayTexture.colorSpace = THREE.SRGBColorSpace;
		earthDayTexture.anisotropy = 8;

		const earthNightTexture = textureLoader.load('/models/earth/night.jpg');
		earthNightTexture.colorSpace = THREE.SRGBColorSpace;
		earthNightTexture.anisotropy = 8;

		const earthSpecularCloudsTexture = textureLoader.load('/models/earth/specularClouds.jpg');
		earthSpecularCloudsTexture.anisotropy = 8;

		//Earth
		const earthParameters = {
			atmosphereDayColor: '#00aaff',
			atmosphereTwilightColor: '#ff6600'
		};

		gui
			.addColor(earthParameters, 'atmosphereDayColor')
			.name('Atmosphere Day Color')
			.onChange(() => {
				earthMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor);
				atmosphereMaterial.uniforms.uAtmosphereDayColor.value.set(
					earthParameters.atmosphereDayColor
				);
			});

		gui
			.addColor(earthParameters, 'atmosphereTwilightColor')
			.name('Atmosphere Twilight Color')
			.onChange(() => {
				earthMaterial.uniforms.uAtmosphereTwilightColor.value.set(
					earthParameters.atmosphereTwilightColor
				);
				atmosphereMaterial.uniforms.uAtmosphereTwilightColor.value.set(
					earthParameters.atmosphereTwilightColor
				);
			});

		const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
		const earthMaterial = new THREE.ShaderMaterial({
			vertexShader: testVertexShader,
			fragmentShader: testFragmentShader,
			uniforms: {
				uDayTexture: new THREE.Uniform(earthDayTexture),
				uNightTexture: new THREE.Uniform(earthNightTexture),
				uSunDirection: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
				uSpecularCloundsTexture: new THREE.Uniform(earthSpecularCloudsTexture),
				uAtmosphereDayColor: new THREE.Uniform(new THREE.Color(earthParameters.atmosphereDayColor)),
				uAtmosphereTwilightColor: new THREE.Uniform(
					new THREE.Color(earthParameters.atmosphereTwilightColor)
				)
			}
		});
		const earth = new THREE.Mesh(earthGeometry, earthMaterial);
		scene.add(earth);

		// Atmosphere
		const atmosphereMaterial = new THREE.ShaderMaterial({
			vertexShader: atmosphereVertexShader,
			fragmentShader: atmosphereFragmentShader,
			side: THREE.BackSide,
			transparent: true,
			uniforms: {
				uSunDirection: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
				uAtmosphereDayColor: new THREE.Uniform(new THREE.Color(earthParameters.atmosphereDayColor)),
				uAtmosphereTwilightColor: new THREE.Uniform(
					new THREE.Color(earthParameters.atmosphereTwilightColor)
				)
			}
		});

		const atmosphere = new THREE.Mesh(earthGeometry, atmosphereMaterial);
		atmosphere.scale.set(1.04, 1.04, 1.04);

		scene.add(atmosphere);

		// Sun
		const sunSpherical = new THREE.Spherical(1, Math.PI * 0.5, 0.5);
		const sunDirection = new THREE.Vector3();

		const debugSun = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.1, 2),
			new THREE.MeshBasicMaterial()
		);

		scene.add(debugSun);

		const updateSun = () => {
			sunDirection.setFromSpherical(sunSpherical);
			debugSun.position.copy(sunDirection).multiplyScalar(5);
			earthMaterial.uniforms.uSunDirection.value.copy(sunDirection);
			atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection);
		};
		updateSun();
		gui.add(sunSpherical, 'phi').min(0).max(Math.PI).onChange(updateSun);

		gui.add(sunSpherical, 'theta').min(-Math.PI).max(Math.PI).onChange(updateSun);

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
		const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
		camera.position.x = 12;
		camera.position.y = 5;
		camera.position.z = 4;
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
		renderer.setClearColor('#000011');

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			earth.rotation.y = elapsedTime * 0.1;

			// Update controls
			controls.update();

			// Render
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
