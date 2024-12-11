<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { RGBELoader } from 'three/examples/jsm/Addons.js';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import terrainVertexShader from './shaders/terrain/vertex.glsl';
	import terrainFragmentShader from './shaders/terrain/fragment.glsl';
	import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const rgbeLoader = new RGBELoader();

		// Camera and Renderer
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-10, 6, -2);
		scene.add(camera);

		let environmentMapVariable: THREE.Texture;
		rgbeLoader.load('/environmentMaps/spruit_sunrise.hdr', (environmentMap) => {
			environmentMapVariable = environmentMap;
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.backgroundBlurriness = 0.5;
			scene.environment = environmentMap;
		});

		const envMapParams = {
			visible: true
		};

		gui
			.add(envMapParams, 'visible')
			.name('Show Environment Map')
			.onChange((visible: boolean) => {
				scene.background = visible ? environmentMapVariable : null;
				// Keep the environment's influence on materials
				scene.environment = environmentMapVariable;
			});

		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		//Lights
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
		// Helper
		// const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
		// scene.add(directionalLightHelper);

		// GUI Settings
		const settings = {
			uPositionFrequency: 2.0,
			uWarpFrequency: 0.2,
			uWarpStrength: 0.5,
			uStrength: 1.65, // Changed default to 0.5 for more moderate initial terrain
			uBaseHeight: 0.85, // Increased to make default height more visible
			uAnimationSpeed: 0.0 // Add this line
		};

		const gridSize = 250; // Changed from 100 to 250

		// Create Geometry
		const pillarGeometry = new THREE.BoxGeometry(0.04, 1, 0.04); // Reduced width from 0.1 to 0.04

		// Replace ShaderMaterial with CustomShaderMaterial
		const material = new CustomShaderMaterial({
			baseMaterial: THREE.MeshStandardMaterial,
			vertexShader: terrainVertexShader,
			fragmentShader: terrainFragmentShader,
			uniforms: {
				uTime: { value: 0 }, // Add this line
				uAnimationSpeed: { value: settings.uAnimationSpeed }, // Add this line
				uGridSize: { value: gridSize },
				uPositionFrequency: { value: settings.uPositionFrequency },
				uWarpFrequency: { value: settings.uWarpFrequency },
				uWarpStrength: { value: settings.uWarpStrength },
				uStrength: { value: settings.uStrength },
				uBaseHeight: { value: settings.uBaseHeight },
				uColorWaterDeep: { value: new THREE.Color('#004466') },
				uColorWaterSurface: { value: new THREE.Color('#0077BB') },
				uColorSand: { value: new THREE.Color('#DDCC99') },
				uColorGrass: { value: new THREE.Color('#33AA33') },
				uColorRock: { value: new THREE.Color('#666666') },
				uColorSnow: { value: new THREE.Color('#FFFFFF') }
			},
			// MeshStandardMaterial properties
			metalness: 0,
			roughness: 1
		});

		// Create Instanced Mesh
		const instancedMesh = new THREE.InstancedMesh(pillarGeometry, material, gridSize * gridSize);
		instancedMesh.castShadow = true;
		instancedMesh.receiveShadow = true;

		// Position Instances
		const dummy = new THREE.Object3D();
		for (let i = 0; i < gridSize * gridSize; i++) {
			const x = (i % gridSize) * 0.04 - (gridSize * 0.04) / 2; // Changed from 0.1 to 0.04
			const z = Math.floor(i / gridSize) * 0.04 - (gridSize * 0.04) / 2; // Changed from 0.1 to 0.05

			dummy.position.set(x, 0, z);
			dummy.updateMatrix();
			instancedMesh.setMatrixAt(i, dummy.matrix);
		}
		scene.add(instancedMesh);

		const createBoard = () => {
			const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11));
			const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10));
			const evaluator = new Evaluator();
			const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION);
			board.position.set(0, 0.75, 0);
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
		};
		createBoard();

		// GUI Controls
		gui
			.add(settings, 'uPositionFrequency', 0.1, 5.0, 0.05)
			.name('Position Frequency')
			.onChange(() => {
				material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
			});
		gui
			.add(settings, 'uWarpFrequency', 0.1, 1.0, 0.01)
			.name('Warp Frequency')
			.onChange(() => {
				material.uniforms.uWarpFrequency.value = settings.uWarpFrequency;
			});
		gui
			.add(settings, 'uWarpStrength', 0.1, 1.0, 0.01)
			.name('Warp Strength')
			.onChange(() => {
				material.uniforms.uWarpStrength.value = settings.uWarpStrength;
			});
		gui
			.add(settings, 'uStrength', 0.1, 2.0, 0.1)
			.name('Terrain Intensity') // Changed name to better reflect its new purpose
			.onChange(() => {
				material.uniforms.uStrength.value = settings.uStrength;
			});
		gui
			.add(settings, 'uBaseHeight', 0.0, 1.0, 0.01)
			.name('Base Height')
			.onChange(() => {
				material.uniforms.uBaseHeight.value = settings.uBaseHeight;
			});
		gui
			.add(settings, 'uAnimationSpeed', 0.0, 1.0, 0.01)
			.name('Animation Speed')
			.onChange(() => {
				material.uniforms.uAnimationSpeed.value = settings.uAnimationSpeed;
			});

		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;

		console.log(renderer.info);

		// Animation Loop
		const clock = new THREE.Clock();
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			material.uniforms.uTime.value = elapsedTime; // Add this line
			controls.update();
			renderer.render(scene, camera);
			window.requestAnimationFrame(tick);
		};
		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
