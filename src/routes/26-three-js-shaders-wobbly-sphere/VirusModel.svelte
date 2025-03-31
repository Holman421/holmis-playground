<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import wobbleVertexShader from './shaders/wobble/vertex.glsl';
	import wobbleFragmentShader from './shaders/wobble/fragment.glsl';
	import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

	type Uniform = {
		uPositionFrequency: number;
		uTimeFrequency: number;
		uStrength: number;
		uWarpPositionFrequency: number;
		uWarpTimeFrequency: number;
		uWarpStrength: number;
		uColorA: string;
		uColorB: string;
	};

	const { canvasId, propUniforms } = $props<{
		canvasId: string;
		propUniforms: Uniform;
	}>();

	$effect(() => {
		const debugObject: any = {};

		// Canvas
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		//Wobble

		debugObject.colorA = propUniforms.uColorA;
		debugObject.colorB = propUniforms.uColorB;

		// Uniforms
		const uniforms = {
			uTime: new THREE.Uniform(0),
			uPositionFrequency: new THREE.Uniform(propUniforms.uPositionFrequency),
			uTimeFrequency: new THREE.Uniform(propUniforms.uTimeFrequency),
			uStrength: new THREE.Uniform(propUniforms.uStrength),
			uWarpPositionFrequency: new THREE.Uniform(propUniforms.uWarpPositionFrequency),
			uWarpTimeFrequency: new THREE.Uniform(propUniforms.uWarpTimeFrequency),
			uWarpStrength: new THREE.Uniform(propUniforms.uWarpStrength),
			uColorA: { value: new THREE.Color(debugObject.colorA) },
			uColorB: { value: new THREE.Color(debugObject.colorB) },
			uMousePosition: { value: new THREE.Vector2(0, 0) }
		};

		// Material
		const material = new CustomShaderMaterial({
			// CMS
			baseMaterial: THREE.MeshPhysicalMaterial,
			vertexShader: wobbleVertexShader,
			fragmentShader: wobbleFragmentShader,
			uniforms: uniforms,
			silent: true,

			metalness: 0,
			roughness: 0.5,
			color: '#ffffff',
			transmission: 0.0,
			ior: 1.5,
			thickness: 1.5,
			transparent: true,
			wireframe: false
		});

		// Tweaks
		const initTweaks = () => {
			const gui = new GUI({ width: 325 });

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
		};

		initTweaks();

		// Geometry
		let geometry = new THREE.IcosahedronGeometry(2.5, 75);
		geometry = mergeVertices(geometry) as THREE.IcosahedronGeometry;
		geometry.computeTangents();

		// Mesh
		const wobble = new THREE.Mesh(geometry, material);
		scene.add(wobble);

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.position.set(3.25, 2, 4.25);
		scene.add(directionalLight);

		const backLight = new THREE.DirectionalLight('#ffffff', 1.5);
		backLight.position.set(-0.25, -4, 2.25);
		scene.add(backLight);

		const sizes = {
			width: 150,
			height: 150,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		//Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 0, 13);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;
		controls.enabled = false;

		// Add mouse tracking
		const mouse = {
			x: 0,
			y: 0
		};

		window.addEventListener('mousemove', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		});

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			alpha: true
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

			// Rotate mesh
			// wobble.rotation.y = elapsedTime * 0.4;
			// wobble.rotation.x = elapsedTime * 0.25;

			// Update material
			material.uniforms.uTime.value = elapsedTime;
			uniforms.uMousePosition.value.set(mouse.x, mouse.y);

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<canvas id={canvasId} class="webgl size-[150px]"></canvas>
