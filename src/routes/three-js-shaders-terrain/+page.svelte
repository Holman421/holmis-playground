<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import terrainVertexShader from './shaders/terrain/vertex.glsl';
	import terrainFragmentShader from './shaders/terrain/fragment.glsl';

	$effect(() => {
		//Setup
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};
		debugObject.showWireframe = false;
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

		// Geometry
		const geometry = new THREE.PlaneGeometry(10, 10, 1000, 1000);
		geometry.rotateX(-Math.PI * 0.5);
		geometry.deleteAttribute('normal');
		geometry.deleteAttribute('uv');

		// Uniforms
		const uniforms = {
			uPositionFrequency: { value: 0.2 },
			uStrength: { value: 2.5 },
			uWarpFrequency: { value: 5.0 },
			uWarpStrength: { value: 0.5 },
			uTime: { value: 0 },
			uAnimationSpeed: { value: 0.05 },
			uStepSize: { value: 0.05 },
			uColorWaterDeep: { value: new THREE.Color('#0066ff') },
			uColorWaterSurface: { value: new THREE.Color('#4d94ff') },
			uColorSand: { value: new THREE.Color('#ffcc99') },
			uColorGrass: { value: new THREE.Color('#66cc00') },
			uColorRock: { value: new THREE.Color('#999999') },
			uColorSnow: { value: new THREE.Color('#ffffff') }
		};

		// GUI Debug
		gui.add(uniforms.uPositionFrequency, 'value', 0, 1, 0.01).name('Position Frequency');
		gui.add(uniforms.uStrength, 'value', 0, 10, 0.1).name('Strength');
		gui.add(uniforms.uWarpFrequency, 'value', 0, 10, 0.1).name('Warp Frequency');
		gui.add(uniforms.uWarpStrength, 'value', 0, 1, 0.01).name('Warp Strength');
		gui.add(uniforms.uAnimationSpeed, 'value', 0, 1, 0.01).name('Animation Speed');
		gui.add(uniforms.uStepSize, 'value', 0, 1, 0.01).name('Step Size');

		// Material
		const material = new CustomShaderMaterial({
			// CSM
			baseMaterial: THREE.MeshStandardMaterial,
			silent: true,
			vertexShader: terrainVertexShader,
			fragmentShader: terrainFragmentShader,
			uniforms: uniforms,
			// MeshStandartMaterial
			color: '#85d534',
			metalness: 0,
			roughness: 1.5
		});

		gui
			.add(debugObject, 'showWireframe')
			.name('Show Wireframe')
			.onChange(() => {
				(material as any).wireframe = debugObject.showWireframe;
			});

		const depthMaterial = new CustomShaderMaterial({
			baseMaterial: THREE.MeshDepthMaterial,
			silent: true,
			vertexShader: terrainVertexShader,
			uniforms: uniforms,
			depthPacking: THREE.RGBADepthPacking
		});

		// Mesh
		const terrain = new THREE.Mesh(geometry, material);
		terrain.customDepthMaterial = depthMaterial;
		terrain.castShadow = true;
		terrain.receiveShadow = true;
		scene.add(terrain);

		// Board
		const createBoard = () => {
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
		};
		createBoard();

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
		const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
		scene.add(directionalLightHelper);

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		window.addEventListener('resize', () => {
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});
		// camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-10, 6, -2);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Renderer
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

		//Animate
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			controls.update();
			uniforms.uTime.value = elapsedTime;
			renderer.render(scene, camera);
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
