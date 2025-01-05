<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import slicedVertexShader from './shaders/sliced/vertex.glsl';
	import slicedFragmentShader from './shaders/sliced/fragment.glsl';

	$effect(() => {
		const gui = new GUI({ width: 325 });

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
		rgbeLoader.load('/aerodynamics/aerodynamics_workshop.hdr', (environmentMap) => {
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.backgroundBlurriness = 0.5;
			scene.environment = environmentMap;
		});

		/**
		 * Sliced model
		 */

		// Uniforms
		const uniforms = {
			uSliceStart: new THREE.Uniform(1.75),
			uSliceArc: new THREE.Uniform(1.25)
		};

		const patchMap = {
			csm_Slice: {
				'#include <colorspace_fragment>': `
            		#include <colorspace_fragment>
			
    				if(!gl_FrontFacing)
    				    gl_FragColor = vec4(0.9, 0.0, 0.2, 1.0);
      	  `
			}
		};

		gui
			.add(uniforms.uSliceStart, 'value')
			.min(-Math.PI)
			.max(Math.PI)
			.step(0.01)
			.name('Slice start');
		gui
			.add(uniforms.uSliceArc, 'value')
			.min(0)
			.max(Math.PI * 2)
			.step(0.01)
			.name('Slice arc');

		// Geometry
		const geometry = new THREE.IcosahedronGeometry(2.5, 5);

		// Material
		const material = new THREE.MeshStandardMaterial({
			metalness: 0.95,
			roughness: 0.15,
			envMapIntensity: 0.5,
			color: '#858080'
		});

		const slicedMaterial = new CustomShaderMaterial({
			// CMS
			baseMaterial: THREE.MeshStandardMaterial,
			vertexShader: slicedVertexShader,
			fragmentShader: slicedFragmentShader,
			silent: true,
			uniforms: uniforms,
			patchMap: patchMap,

			// MeshStandardMaterial properties
			metalness: 0.95,
			roughness: 0.15,
			envMapIntensity: 0.5,
			color: '#858080',
			side: THREE.DoubleSide
		});

		const slicedDepthMaterial = new CustomShaderMaterial({
			// CMS
			baseMaterial: THREE.MeshDepthMaterial,
			vertexShader: slicedVertexShader,
			fragmentShader: slicedFragmentShader,
			silent: true,
			uniforms: uniforms,
			patchMap: patchMap,

			depthPacking: THREE.RGBADepthPacking
		});

		let model: any = null;
		// Model
		gltfLoader.load('/aerodynamics/gears.glb', (gltf) => {
			model = gltf.scene;

			model.traverse((child: any) => {
				if (child.isMesh) {
					if (child.name === 'outerHull') {
						child.material = slicedMaterial;
						child.customDepthMaterial = slicedDepthMaterial;
					} else {
						child.material = material;
					}
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			scene.add(model);
		});

		/**
		 * Plane
		 */
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10, 10),
			new THREE.MeshStandardMaterial({ color: '#aaaaaa' })
		);
		plane.receiveShadow = true;
		plane.position.x = -4;
		plane.position.y = -3;
		plane.position.z = -4;
		plane.lookAt(new THREE.Vector3(0, 0, 0));
		scene.add(plane);

		/**
		 * Lights
		 */
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.near = 0.1;
		directionalLight.shadow.camera.far = 30;
		directionalLight.shadow.normalBias = 0.05;
		directionalLight.shadow.camera.top = 8;
		directionalLight.shadow.camera.right = 8;
		directionalLight.shadow.camera.bottom = -8;
		directionalLight.shadow.camera.left = -8;
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
		camera.position.set(-5, 5, 12);
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

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Rotate model
			if (model) {
				model.rotation.y = elapsedTime * 0.1;
			}

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
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
