<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import vertexShader from './shaders/vertex.glsl';
	import fragmentShader from './shaders/fragment.glsl';
	import fragmentShader2 from './shaders/fragment2.glsl';
	import fragmentShader3 from './shaders/fragment3.glsl';
	import fragmentShader4 from './shaders/fragment4.glsl';
	import fragmentShader5 from './shaders/fragment5.glsl';
	import fragmentShader6 from './shaders/fragment6.glsl';
	import fragmentShader7 from './shaders/fragment7.glsl';
	import fragmentShader8 from './shaders/fragment8.glsl';

	// Update interfaces to match Three.js IUniform structure
	interface BaseUniforms {
		[uniform: string]: THREE.IUniform<any>;
		uTime: THREE.IUniform<number>;
		uResolution: THREE.IUniform<THREE.Vector2>;
	}

	interface Shader1Uniforms {
		[uniform: string]: THREE.IUniform<any>;
		uTime: THREE.IUniform<number>;
		uResolution: THREE.IUniform<THREE.Vector2>;
		uColorA: THREE.IUniform<THREE.Color>;
		uColorB: THREE.IUniform<THREE.Color>;
	}

	interface Shader3Uniforms {
		[uniform: string]: THREE.IUniform<any>;
		uTime: THREE.IUniform<number>;
		uResolution: THREE.IUniform<THREE.Vector2>;
		uTimeScale: THREE.IUniform<number>;
		uNoiseScale: THREE.IUniform<number>;
		uDistortScale: THREE.IUniform<number>;
	}

	interface Shader4Uniforms {
		[uniform: string]: THREE.IUniform<any>;
		uTime: THREE.IUniform<number>;
		uResolution: THREE.IUniform<THREE.Vector2>;
		uColorA: THREE.IUniform<THREE.Color>;
		uColorB: THREE.IUniform<THREE.Color>;
		uColorC: THREE.IUniform<THREE.Color>;
		uSpeed: THREE.IUniform<number>;
		uNoiseScale: THREE.IUniform<number>;
		uEdgeIntensity: THREE.IUniform<number>;
		uVignetteIntensity: THREE.IUniform<number>;
		uHighlightColor: THREE.IUniform<THREE.Color>;
		uHighlightIntensity: THREE.IUniform<number>;
		uNormalInfluence: THREE.IUniform<number>;
	}

	interface Shader5Uniforms {
		[uniform: string]: THREE.IUniform<any>;
		uTime: THREE.IUniform<number>;
		uResolution: THREE.IUniform<THREE.Vector2>;
		uNoiseScale: THREE.IUniform<number>;
	}

	interface Shader6Uniforms {
		[uniform: string]: THREE.IUniform<any>;
		uTime: THREE.IUniform<number>;
		uResolution: THREE.IUniform<THREE.Vector2>;
		uBaseColor1: THREE.IUniform<THREE.Color>;
		uBaseColor2: THREE.IUniform<THREE.Color>;
		uAccentColor1: THREE.IUniform<THREE.Color>;
		uAccentColor2: THREE.IUniform<THREE.Color>;
		uAccentColor3: THREE.IUniform<THREE.Color>;
		uAccentColor4: THREE.IUniform<THREE.Color>;
		uNoiseScale: THREE.IUniform<number>;
		uTimeScale: THREE.IUniform<number>;
		uContrast: THREE.IUniform<number>;
		uVignetteIntensity: THREE.IUniform<number>;
	}

	type ShaderMeshType = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

	let currentShader = $state(0);
	let planes: ShaderMeshType[] = []; // Add this to track planes in component scope
	let guiFolders: GUI[] = []; // Add this to track folders
	const shaders = [
		fragmentShader,
		fragmentShader2,
		fragmentShader3,
		fragmentShader4,
		fragmentShader5,
		fragmentShader6,
		fragmentShader7,
		fragmentShader8
	];

	// Move updateGUIVisibility to component scope
	function updateGUIVisibility() {
		guiFolders.forEach((folder, index) => {
			if (index === currentShader) {
				folder.show();
			} else {
				folder.hide();
			}
		});
	}

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const debugObjects = [
			{
				// Shader 1 uniforms
				colorA: '#239f76',
				colorB: '#ffbf59'
			},
			{
				// Shader 2 uniforms
				speed: 0.05,
				noiseScale: 1.0
			},
			{
				// Shader 3 uniforms
				timeScale: 0.05,
				noiseScale: 0.7,
				distortScale: 4.0
			},
			{
				// Shader 4 uniforms
				colorA: '#239f76',
				colorB: '#ffbf59',
				colorC: '#145d58',
				speed: 0.05,
				noiseScale: 1.0,
				edgeIntensity: 0.0,
				vignetteIntensity: 0.0,
				highlightColor: '#ffb399',
				highlightIntensity: 1.0,
				normalInfluence: 1.0
			},
			{
				// Shader 5 uniforms
				noiseScale: 1.0
			},
			{
				// Shader 6 uniforms
				shader6BaseColor1: '#1A6666',
				shader6BaseColor2: '#80B300',
				shader6AccentColor1: '#59001A',
				shader6AccentColor2: '#0033FF',
				shader6AccentColor3: '#4C0000',
				shader6AccentColor4: '#008000',
				shader6NoiseScale: 0.004,
				shader6TimeScale: 0.007,
				shader6Contrast: 2.0,
				shader6VignetteIntensity: 0.65
			},
			{
				// Shader 7 uniforms - if any
			}
		];

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		// Scene
		const scene = new THREE.Scene();

		// Store planes in component scope
		planes = shaders.map((shader, index) => {
			const baseUniforms: BaseUniforms = {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) }
			};

			let uniforms = baseUniforms;
			if (index === 0) {
				uniforms = {
					...baseUniforms,
					uColorA: { value: new THREE.Color(debugObjects[0].colorA) },
					uColorB: { value: new THREE.Color(debugObjects[0].colorB) }
				} as Shader1Uniforms;
			} else if (index === 2) {
				uniforms = {
					...baseUniforms,
					uTimeScale: { value: debugObjects[2].timeScale },
					uNoiseScale: { value: debugObjects[2].noiseScale },
					uDistortScale: { value: debugObjects[2].distortScale }
				} as Shader3Uniforms;
			} else if (index === 3) {
				uniforms = {
					...baseUniforms,
					uColorA: { value: new THREE.Color(debugObjects[3].colorA) },
					uColorB: { value: new THREE.Color(debugObjects[3].colorB) },
					uColorC: { value: new THREE.Color(debugObjects[3].colorC) },
					uSpeed: { value: debugObjects[3].speed },
					uNoiseScale: { value: debugObjects[3].noiseScale },
					uEdgeIntensity: { value: debugObjects[3].edgeIntensity },
					uVignetteIntensity: { value: debugObjects[3].vignetteIntensity },
					uHighlightColor: { value: new THREE.Color(debugObjects[3].highlightColor) },
					uHighlightIntensity: { value: debugObjects[3].highlightIntensity },
					uNormalInfluence: { value: debugObjects[3].normalInfluence }
				} as Shader4Uniforms;
			} else if (index === 4) {
				uniforms = {
					...baseUniforms,
					uNoiseScale: { value: debugObjects[4].noiseScale }
				} as Shader5Uniforms;
			} else if (index === 5) {
				uniforms = {
					...baseUniforms,
					uBaseColor1: { value: new THREE.Color(debugObjects[5].shader6BaseColor1) },
					uBaseColor2: { value: new THREE.Color(debugObjects[5].shader6BaseColor2) },
					uAccentColor1: { value: new THREE.Color(debugObjects[5].shader6AccentColor1) },
					uAccentColor2: { value: new THREE.Color(debugObjects[5].shader6AccentColor2) },
					uAccentColor3: { value: new THREE.Color(debugObjects[5].shader6AccentColor3) },
					uAccentColor4: { value: new THREE.Color(debugObjects[5].shader6AccentColor4) },
					uNoiseScale: { value: debugObjects[5].shader6NoiseScale },
					uTimeScale: { value: debugObjects[5].shader6TimeScale },
					uContrast: { value: debugObjects[5].shader6Contrast },
					uVignetteIntensity: { value: debugObjects[5].shader6VignetteIntensity }
				} as Shader6Uniforms;
			}

			const plane = new THREE.Mesh(
				new THREE.PlaneGeometry(2, 2, 2),
				new THREE.ShaderMaterial({
					vertexShader,
					fragmentShader: shader,
					uniforms
				})
			) as ShaderMeshType;
			plane.visible = index === currentShader;
			scene.add(plane);
			return plane;
		});

		// Update folder creation to store in component scope
		guiFolders = shaders.map((_, index) => {
			const folder = gui.addFolder(`Shader ${index + 1} Settings`);
			folder.hide(); // Hide all folders initially
			return folder;
		});

		// Add GUI controls for shader 3
		const shader3Folder = guiFolders[2];
		shader3Folder.add(debugObjects[2], 'timeScale', 0.01, 2.0).onChange(() => {
			(planes[2].material as THREE.ShaderMaterial).uniforms.uTimeScale.value =
				debugObjects[2].timeScale;
		});
		shader3Folder.add(debugObjects[2], 'noiseScale', 0.1, 10.0).onChange(() => {
			(planes[2].material as THREE.ShaderMaterial).uniforms.uNoiseScale.value =
				debugObjects[2].noiseScale;
		});
		shader3Folder.add(debugObjects[2], 'distortScale', 1.0, 10.0).onChange(() => {
			(planes[2].material as THREE.ShaderMaterial).uniforms.uDistortScale.value =
				debugObjects[2].distortScale;
		});

		// Add GUI controls for shader 4
		const shader4Folder = guiFolders[3];
		shader4Folder.addColor(debugObjects[3], 'colorA').onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uColorA.value.set(
				debugObjects[3].colorA
			);
		});
		shader4Folder.addColor(debugObjects[3], 'colorB').onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uColorB.value.set(
				debugObjects[3].colorB
			);
		});
		shader4Folder.addColor(debugObjects[3], 'colorC').onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uColorC.value.set(
				debugObjects[3].colorC
			);
		});
		shader4Folder.add(debugObjects[3], 'speed', 0.01, 0.2).onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uSpeed.value = debugObjects[3].speed;
		});
		shader4Folder.add(debugObjects[3], 'noiseScale', 0.1, 20.0).onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uNoiseScale.value =
				debugObjects[3].noiseScale;
		});
		shader4Folder.add(debugObjects[3], 'edgeIntensity', 0, 20).onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uEdgeIntensity.value =
				debugObjects[3].edgeIntensity;
		});
		shader4Folder.add(debugObjects[3], 'vignetteIntensity', 0, 1).onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uVignetteIntensity.value =
				debugObjects[3].vignetteIntensity;
		});
		shader4Folder.addColor(debugObjects[3], 'highlightColor').onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uHighlightColor.value.set(
				debugObjects[3].highlightColor
			);
		});
		shader4Folder.add(debugObjects[3], 'normalInfluence', 0, 1).onChange(() => {
			(planes[3].material as THREE.ShaderMaterial).uniforms.uNormalInfluence.value =
				debugObjects[3].normalInfluence;
		});

		// Add GUI controls for shader 5
		const shader5Folder = guiFolders[4];
		shader5Folder.add(debugObjects[4], 'noiseScale', 0.1, 15.0).onChange(() => {
			(planes[4].material as THREE.ShaderMaterial).uniforms.uNoiseScale.value =
				debugObjects[4].noiseScale;
		});

		// Add GUI controls for shader 6
		const shader6Folder = guiFolders[5];
		shader6Folder.addColor(debugObjects[5], 'shader6BaseColor1').onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uBaseColor1.value.set(
				debugObjects[5].shader6BaseColor1
			);
		});
		shader6Folder.addColor(debugObjects[5], 'shader6BaseColor2').onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uBaseColor2.value.set(
				debugObjects[5].shader6BaseColor2
			);
		});
		shader6Folder.addColor(debugObjects[5], 'shader6AccentColor1').onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uAccentColor1.value.set(
				debugObjects[5].shader6AccentColor1
			);
		});
		shader6Folder.addColor(debugObjects[5], 'shader6AccentColor2').onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uAccentColor2.value.set(
				debugObjects[5].shader6AccentColor2
			);
		});
		shader6Folder.addColor(debugObjects[5], 'shader6AccentColor3').onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uAccentColor3.value.set(
				debugObjects[5].shader6AccentColor3
			);
		});
		shader6Folder.addColor(debugObjects[5], 'shader6AccentColor4').onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uAccentColor4.value.set(
				debugObjects[5].shader6AccentColor4
			);
		});
		shader6Folder.add(debugObjects[5], 'shader6NoiseScale', 0.001, 0.01, 0.001).onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uNoiseScale.value =
				debugObjects[5].shader6NoiseScale;
		});
		shader6Folder.add(debugObjects[5], 'shader6TimeScale', 0.001, 0.02, 0.001).onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uTimeScale.value =
				debugObjects[5].shader6TimeScale;
		});
		shader6Folder.add(debugObjects[5], 'shader6Contrast', 0.1, 5.0, 0.1).onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uContrast.value =
				debugObjects[5].shader6Contrast;
		});
		shader6Folder.add(debugObjects[5], 'shader6VignetteIntensity', 0.0, 1.0, 0.01).onChange(() => {
			(planes[5].material as THREE.ShaderMaterial).uniforms.uVignetteIntensity.value =
				debugObjects[5].shader6VignetteIntensity;
		});

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

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

			// Update resolution uniform
			planes.forEach((plane) => {
				(plane.material as THREE.ShaderMaterial).uniforms.uResolution.value.set(
					sizes.width,
					sizes.height
				);
			});
		});

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-0, 0, 4);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update shader uniforms
			planes.forEach((plane) => {
				(plane.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
			});

			controls.update();

			renderer.render(scene, camera);

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			planes = []; // Clean up planes reference
			guiFolders = []; // Clean up folders reference
		};
	});

	// Update visibility when shader changes
	$effect(() => {
		planes.forEach((plane, index) => {
			plane.visible = index === currentShader;
		});
		updateGUIVisibility();
	});

	function switchShader(index: number) {
		currentShader = index;
	}
</script>

<div>
	<canvas class="webgl"></canvas>
	<div class="absolute top-0 h-[calc(100vh-56px)] flex items-end">
		<div class="absolute bottom-0 flex flex-col gap-2 left-4 bg-black p-2">
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 0}
				onclick={() => switchShader(0)}
			>
				Shader 1
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 1}
				onclick={() => switchShader(1)}
			>
				Shader 2
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 2}
				onclick={() => switchShader(2)}
			>
				Shader 3
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 3}
				onclick={() => switchShader(3)}
			>
				Shader 4
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 4}
				onclick={() => switchShader(4)}
			>
				Shader 5
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 5}
				onclick={() => switchShader(5)}
			>
				Shader 6
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 6}
				onclick={() => switchShader(6)}
			>
				Shader 7
			</button>
			<button
				class="whitespace-nowrap border py-1 px-2"
				class:active={currentShader === 7}
				onclick={() => switchShader(7)}
			>
				Shader 8
			</button>
		</div>
	</div>
</div>

<style>
	.active {
		background: #444;
		color: white;
	}
</style>
