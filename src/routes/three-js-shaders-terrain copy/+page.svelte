<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { RGBELoader } from 'three/examples/jsm/Addons.js';
	import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import terrainVertexShader from './shaders/terrain/vertex.glsl';
	import terrainFragmentShader from './shaders/terrain/fragment.glsl';

	$effect(() => {
		// Setup
		const gui = new GUI({ width: 325 });
		const debugObject = {
			showWireframe: true,
			showHorizontalPlanes: true,
			showVerticalPlanes: true
		};
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const rgbeLoader = new RGBELoader();

		// Environment map
		rgbeLoader.load('/environmentMaps/spruit_sunrise.hdr', (environmentMap) => {
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.backgroundBlurriness = 0.5;
			scene.environment = environmentMap;
		});

		// Uniforms
		const uniforms = {
			uPositionFrequency: new THREE.Uniform(0.2),
			uStrength: new THREE.Uniform(2.5),
			uWarpFrequency: new THREE.Uniform(5.0),
			uWarpStrength: new THREE.Uniform(0.5),
			uTime: new THREE.Uniform(0),
			uAnimationSpeed: new THREE.Uniform(0.2),
			uStepSize: new THREE.Uniform(1.0)
		};

		const material = new CustomShaderMaterial({
			// CSM
			baseMaterial: THREE.MeshStandardMaterial,
			silent: true,
			vertexShader: terrainVertexShader,
			fragmentShader: terrainFragmentShader,
			uniforms: uniforms,
			wireframe: debugObject.showWireframe,

			// MeshStandartMaterial
			color: '#85d534',
			metalness: 0,
			roughness: 1.0,
			opacity: 0.1,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide
		});

		type Props = {
			rotation: 'x' | 'y' | 'z';
			position: number;
			mainAxisVerticiesCount: number;
			secondaryAxisVerticiesCount?: number;
		};

		// Three.js planes
		const createPlane = ({
			rotation,
			position,
			mainAxisVerticiesCount,
			secondaryAxisVerticiesCount
		}: Props) => {
			let geometry;
			if (rotation === 'y') {
				geometry = new THREE.PlaneGeometry(10, 10, mainAxisVerticiesCount, mainAxisVerticiesCount);
				geometry.rotateX(-Math.PI * 0.5);
				geometry.translate(0, position, 0);
				geometry.name = 'y';
			} else {
				geometry = new THREE.PlaneGeometry(
					10,
					2,
					mainAxisVerticiesCount,
					secondaryAxisVerticiesCount
				);
				if (rotation === 'x') {
					geometry.rotateY(-Math.PI * 0.5);
					geometry.translate(position, 0, 0);
					geometry.name = 'x';
				} else {
					// geometry.rotateZ(-Math.PI * 0.5);
					geometry.translate(0, 0, position);
					geometry.name = 'z';
				}
			}

			const mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);
		};

		const removeExistingPlanes = () => {
			scene.children = scene.children.filter(
				(child) => !(child instanceof THREE.Mesh && child.material === material)
			);
		};

		const togglePlanes = (typesOfPlanes: 'vertical' | 'horizontal', show: boolean) => {
			scene.children.forEach((child) => {
				if (child instanceof THREE.Mesh && child.material === material) {
					if (typesOfPlanes === 'horizontal' && child.geometry.name === 'y') {
						child.visible = show;
					} else if (typesOfPlanes === 'vertical' && child.geometry.name !== 'y') {
						child.visible = show;
					}
				}
			});
		};

		const renderHorizontalPlanes = () => {
			removeExistingPlanes();

			const vertexCountMultiplier = uniforms.uStepSize.value;
			const horizontalPlanesCount = 2 * vertexCountMultiplier;
			const verticalPlanesCount = 10 * vertexCountMultiplier;
			const mainAxisVerticiesCount = 10 * vertexCountMultiplier;
			const secondaryAxisVerticiesCount = 2 * vertexCountMultiplier;

			// Plane loops
			for (let i = 0; i <= horizontalPlanesCount; i++) {
				createPlane({
					rotation: 'y',
					position: i / vertexCountMultiplier - 1,
					mainAxisVerticiesCount: mainAxisVerticiesCount
				});
			}
		};

		const renderVerticalPlanes = () => {
			const vertexCountMultiplier = uniforms.uStepSize.value;
			const verticalPlanesCount = 10 * vertexCountMultiplier;
			const mainAxisVerticiesCount = 10 * vertexCountMultiplier;
			const secondaryAxisVerticiesCount = 2 * vertexCountMultiplier;

			// Plane loops
			for (let i = 0; i <= verticalPlanesCount; i++) {
				createPlane({
					rotation: 'x',
					position: i / vertexCountMultiplier - 5,
					mainAxisVerticiesCount: mainAxisVerticiesCount,
					secondaryAxisVerticiesCount: secondaryAxisVerticiesCount
				});
				createPlane({
					rotation: 'z',
					position: i / vertexCountMultiplier - 5,
					mainAxisVerticiesCount: mainAxisVerticiesCount,
					secondaryAxisVerticiesCount: secondaryAxisVerticiesCount
				});
			}
		};

		// Initial render
		renderHorizontalPlanes();
		renderVerticalPlanes();

		// GUI
		gui
			.add(uniforms.uStepSize, 'value', 1, 10, 1)
			.name('Step Size')
			.onChange(() => {
				renderHorizontalPlanes();
				renderVerticalPlanes();
			});
		gui
			.add(debugObject, 'showHorizontalPlanes')
			.name('Show horizontal planes')
			.onChange(() => {
				togglePlanes('horizontal', debugObject.showHorizontalPlanes);
			});
		gui
			.add(debugObject, 'showVerticalPlanes')
			.name('Show vertical planes')
			.onChange(() => {
				togglePlanes('vertical', debugObject.showVerticalPlanes);
			});
		gui
			.add(debugObject, 'showWireframe')
			.name('Show Wireframe')
			.onChange(() => {
				(material as any).wireframe = debugObject.showWireframe;
			});

		// Board
		const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11));
		const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10));
		const evaluator = new Evaluator();
		const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION);
		board.geometry.clearGroups();
		const boardMaterial = new THREE.MeshStandardMaterial({
			color: '#ffffff',
			metalness: 0,
			roughness: 0.3
		});

		board.material = boardMaterial;
		board.castShadow = true;
		board.receiveShadow = true;

		scene.add(board);

		/**
		 * Lights
		 */
		const directionalLight = new THREE.DirectionalLight('#ffffff', 2);
		directionalLight.position.set(6.25, 3, 4);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.near = 0.1;
		directionalLight.shadow.camera.far = 30;
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
		camera.position.set(-10, 6, -2);
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

			// Update uniforms
			uniforms.uTime.value = elapsedTime;

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
