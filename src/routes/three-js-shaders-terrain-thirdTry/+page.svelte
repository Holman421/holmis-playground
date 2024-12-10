<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { RGBELoader } from 'three/examples/jsm/Addons.js';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import terrainVertexShader from './shaders/terrain/vertex.glsl';
	import terrainFragmentShader from './shaders/terrain/fragment.glsl';

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

		rgbeLoader.load('/environmentMaps/spruit_sunrise.hdr', (environmentMap) => {
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;

			scene.background = environmentMap;
			scene.backgroundBlurriness = 0.5;
			scene.environment = environmentMap;
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
		const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
		scene.add(directionalLightHelper);

		// GUI Settings
		const settings = {
			uPositionFrequency: 0.3,
			uWarpFrequency: 0.2,
			uWarpStrength: 0.5,
			uStrength: 2.0,
			uBaseHeight: 0.5
		};

		const gridSize = 100;

		// Create Geometry
		const pillarGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);

		// Create Shader Material
		const material = new THREE.ShaderMaterial({
			vertexShader: terrainVertexShader,
			fragmentShader: terrainFragmentShader,
			uniforms: {
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
			}
		});

		// Create Instanced Mesh
		const instancedMesh = new THREE.InstancedMesh(pillarGeometry, material, gridSize * gridSize);
		instancedMesh.castShadow = true;
		instancedMesh.receiveShadow = true;

		// Position Instances
		const dummy = new THREE.Object3D();
		for (let i = 0; i < gridSize * gridSize; i++) {
			const x = (i % gridSize) * 0.1 - (gridSize * 0.1) / 2;
			const z = Math.floor(i / gridSize) * 0.1 - (gridSize * 0.1) / 2;

			dummy.position.set(x, 0, z);
			dummy.updateMatrix();
			instancedMesh.setMatrixAt(i, dummy.matrix);
		}
		scene.add(instancedMesh);

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
			.add(settings, 'uStrength', 0.1, 5.0, 0.1)
			.name('Strength')
			.onChange(() => {
				material.uniforms.uStrength.value = settings.uStrength;
			});
		gui
			.add(settings, 'uBaseHeight', 0.0, 1.0, 0.01)
			.name('Base Height')
			.onChange(() => {
				material.uniforms.uBaseHeight.value = settings.uBaseHeight;
			});

		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;

		// Animation Loop
		const clock = new THREE.Clock();
		const tick = () => {
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
