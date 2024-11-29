<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import {
		DRACOLoader,
		GLTFLoader,
		GPUComputationRenderer,
		RGBELoader
	} from 'three/examples/jsm/Addons.js';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import wobbleVertexShader from './shaders/wobble/vertex.glsl';
	import wobbleFragmentShader from './shaders/wobble/fragment.glsl';
	import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

	$effect(() => {
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

		/**
		 * Environment map
		 */
		rgbeLoader.load('/textures/environmentMaps/urban_alley_01_1k.hdr', (environmentMap) => {
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.environment = environmentMap;
		});

		/**
		 * Wobble
		 */

		debugObject.colorA = '#0000ff';
		debugObject.colorB = '#ff0000';

		// Uniforms
		const uniforms = {
			uTime: new THREE.Uniform(0),
			uPositionFrequency: new THREE.Uniform(0.5),
			uTimeFrequency: new THREE.Uniform(0.4),
			uStrength: new THREE.Uniform(0.3),
			uWarpPositionFrequency: new THREE.Uniform(0.38),
			uWarpTimeFrequency: new THREE.Uniform(0.12),
			uWarpStrength: new THREE.Uniform(1.7),
			uColorA: { value: new THREE.Color(debugObject.colorA) },
			uColorB: { value: new THREE.Color(debugObject.colorB) }
		};

		// Material
		const material = new CustomShaderMaterial({
			// CMS
			baseMaterial: THREE.MeshPhysicalMaterial,
			vertexShader: wobbleVertexShader,
			fragmentShader: wobbleFragmentShader,
			uniforms: uniforms,
			silent: true,
			// MeshPhysicalMaterial
			metalness: 0,
			roughness: 0.5,
			color: '#ffffff',
			transmission: 0,
			ior: 1.5,
			thickness: 1.5,
			transparent: true,
			wireframe: false
		});

		const depthMaterial = new CustomShaderMaterial({
			// CMS
			baseMaterial: THREE.MeshDepthMaterial,
			vertexShader: wobbleVertexShader,
			uniforms: uniforms,
			silent: true,
			depthPacking: THREE.RGBADepthPacking
		});

		// Tweaks
		gui
			.add(uniforms.uPositionFrequency, 'value')
			.min(0)
			.max(3)
			.step(0.001)
			.name('uPositionFrequency');
		gui.add(uniforms.uTimeFrequency, 'value').min(0).max(3).step(0.001).name('uTimeFrequency');
		gui.add(uniforms.uStrength, 'value').min(0).max(3).step(0.001).name('uStrength');
		gui
			.add(uniforms.uWarpPositionFrequency, 'value')
			.min(0)
			.max(3)
			.step(0.001)
			.name('uWarpPositionFrequency');
		gui
			.add(uniforms.uWarpTimeFrequency, 'value')
			.min(0)
			.max(3)
			.step(0.001)
			.name('uWarpTimeFrequency');
		gui.add(uniforms.uWarpStrength, 'value').min(0).max(3).step(0.001).name('uWarpStrength');
		gui.add(material, 'metalness', 0, 1, 0.001);
		gui.add(material, 'roughness', 0, 1, 0.001);
		gui.add(material, 'transmission', 0, 1, 0.001);
		gui.add(material, 'ior', 0, 10, 0.001);
		gui.add(material, 'thickness', 0, 10, 0.001);
		// gui.addColor(material, 'color');
		gui
			.addColor(debugObject, 'colorA')
			.name('First color')
			.onChange(() => {
				uniforms.uColorA.value.set(debugObject.colorA);
			});
		gui
			.addColor(debugObject, 'colorB')
			.name('Second color')
			.onChange(() => {
				uniforms.uColorB.value.set(debugObject.colorB);
			});

		// Geometry
		let geometry = new THREE.IcosahedronGeometry(2.5, 75);
		geometry = mergeVertices(geometry) as THREE.IcosahedronGeometry;
		geometry.computeTangents();

		// Mesh
		const wobble = new THREE.Mesh(geometry, material);
		wobble.customDepthMaterial = depthMaterial;
		wobble.receiveShadow = true;
		wobble.castShadow = true;
		scene.add(wobble);

		/**
		 * Plane
		 */
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(15, 15, 15),
			new THREE.MeshStandardMaterial()
		);
		plane.receiveShadow = true;
		plane.rotation.y = Math.PI;
		plane.position.y = -5;
		plane.position.z = 5;
		scene.add(plane);

		/**
		 * Lights
		 */
		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.far = 15;
		directionalLight.shadow.normalBias = 0.05;
		directionalLight.position.set(0.25, 2, -2.25);
		scene.add(directionalLight);

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
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(13, -3, -5);
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
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Update material
			material.uniforms.uTime.value = elapsedTime;

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
