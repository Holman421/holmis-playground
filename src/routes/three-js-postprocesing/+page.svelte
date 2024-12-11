<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import {
		DotScreenPass,
		EffectComposer,
		GammaCorrectionShader,
		GlitchPass,
		RenderPass,
		RenderPixelatedPass,
		RGBShiftShader,
		ShaderPass,
		UnrealBloomPass
	} from 'three/examples/jsm/Addons.js';
	import Stats from 'stats.js';
	import { gsap } from 'gsap';

	$effect(() => {
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		/**
		 * Loaders
		 */
		const gltfLoader = new GLTFLoader();
		const cubeTextureLoader = new THREE.CubeTextureLoader();
		const textureLoader = new THREE.TextureLoader();

		/**
		 * Update all materials
		 */
		const updateAllMaterials = () => {
			scene.traverse((child) => {
				if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
					child.material.envMapIntensity = 2.5;
					child.material.needsUpdate = true;
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
		};

		/**
		 * Environment map
		 */
		const environmentMap = cubeTextureLoader.load([
			'/environmentMaps/0/px.png',
			'/environmentMaps/0/nx.png',
			'/environmentMaps/0/py.png',
			'/environmentMaps/0/ny.png',
			'/environmentMaps/0/pz.png',
			'/environmentMaps/0/nz.png'
		]);

		scene.background = environmentMap;
		scene.environment = environmentMap;

		// Add environment map controls
		const envMapParams = {
			visible: true
		};

		gui
			.add(envMapParams, 'visible')
			.name('Show Environment Map')
			.onChange((visible: boolean) => {
				scene.background = visible ? environmentMap : null;
				// Keep the environment's influence on materials
				scene.environment = environmentMap;
			});

		/**
		 * Models
		 */
		gltfLoader.load('/models/DamagedHelmet/glTF/DamagedHelmet.gltf', (gltf) => {
			gltf.scene.scale.set(2, 2, 2);
			gltf.scene.rotation.y = Math.PI * 0.5;
			scene.add(gltf.scene);

			updateAllMaterials();
		});

		/**
		 * Lights
		 */
		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.far = 15;
		directionalLight.shadow.normalBias = 0.05;
		directionalLight.position.set(0.25, 3, -2.25);
		scene.add(directionalLight);

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

			// Update effect composer
			effectComposer.setSize(sizes.width, sizes.height);
			effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(4, 1, -4);
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
		renderer.shadowMap.type = THREE.PCFShadowMap;
		renderer.toneMapping = THREE.ReinhardToneMapping;
		renderer.toneMappingExposure = 1.5;
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Render target
		const renderTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
			samples: renderer.getPixelRatio() === 1 ? 2 : 0
		});

		// Post processing
		const effectComposer = new EffectComposer(renderer, renderTarget);
		effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		effectComposer.setSize(sizes.width, sizes.height);

		const renderPass = new RenderPass(scene, camera);
		effectComposer.addPass(renderPass);

		const dotScreenPass = new DotScreenPass();
		dotScreenPass.enabled = false;
		effectComposer.addPass(dotScreenPass);

		const glitchPass = new GlitchPass();
		glitchPass.enabled = false;
		effectComposer.addPass(glitchPass);

		const rgbShiftPass = new ShaderPass(RGBShiftShader);
		rgbShiftPass.enabled = false;
		effectComposer.addPass(rgbShiftPass);

		const stats = new Stats();
		stats.showPanel(0); // 0: fps, 1: ms, 2:
		document.body.appendChild(stats.dom);

		const TintShader = {
			uniforms: {
				tDiffuse: { value: null },
				uTint: { value: null },
				uVignetteStrength: { value: 3.0 }
			},
			vertexShader: `
			varying vec2 vUv;

				void main() {
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					vUv = uv;
					}
			`,
			fragmentShader: `
			uniform sampler2D tDiffuse;
			uniform vec3 uTint;
			uniform float uVignetteStrength;

			varying vec2 vUv;

			void main() {
			vec4 color = texture2D(tDiffuse, vUv); 
			color.rgb += uTint;

			// Vignette effect
			vec2 center = vec2(0.5, 0.5);
			float dist = distance(vUv, center);
			float vignette = smoothstep(2.9, 0.0, dist * uVignetteStrength);
			
			color.rgb *= vignette;

			gl_FragColor = color;
			}
			`
		};
		const tintPass = new ShaderPass(TintShader);
		tintPass.material.uniforms.uTint.value = new THREE.Vector3(0.0, 0.0, 0.0);
		tintPass.enabled = true;
		effectComposer.addPass(tintPass);

		const DisplacementShader = {
			uniforms: {
				tDiffuse: { value: null },
				uTime: { value: 0.0 },
				uNormalMap: { value: null }
			},
			vertexShader: `
			varying vec2 vUv;

				void main() {
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					vUv = uv;
					}
			`,
			fragmentShader: `
			uniform sampler2D tDiffuse;
			uniform float uTime;
			uniform sampler2D uNormalMap;

			varying vec2 vUv;

			void main() {
				// Normal map displacement
				vec3 normalColor = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
				vec2 newUv = vUv + normalColor.xy * 0.1;
				vec4 color = texture2D(tDiffuse, newUv);

				gl_FragColor = color;
			}
			`
		};

		const displacementPass = new ShaderPass(DisplacementShader);
		displacementPass.enabled = false;
		displacementPass.material.uniforms.uNormalMap.value = textureLoader.load(
			'/textures/interfaceNormalMap.png'
		);
		effectComposer.addPass(displacementPass);

		gui
			.add(tintPass.material.uniforms.uVignetteStrength, 'value')
			.min(0)
			.max(5)
			.step(0.05)
			.name('Vignette Strength');

		const renderPixelatedPass = new RenderPixelatedPass(6, scene, camera);
		renderPixelatedPass.enabled = false;
		effectComposer.addPass(renderPixelatedPass);

		const bloomParams = {
			threshold: 0.6,
			strength: 3,
			radius: 0,
			exposure: 1
		};

		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			1.5,
			0.4,
			0.85
		);
		bloomPass.threshold = bloomParams.threshold;
		bloomPass.strength = bloomParams.strength;
		bloomPass.radius = bloomParams.radius;
		bloomPass.enabled = false;

		gui
			.add(bloomParams, 'threshold')
			.min(0)
			.max(1)
			.step(0.001)
			.onChange(() => {
				bloomPass.threshold = bloomParams.threshold;
			});
		gui
			.add(bloomParams, 'strength')
			.min(0)
			.max(3)
			.step(0.001)
			.onChange(() => {
				bloomPass.strength = bloomParams.strength;
			});
		gui
			.add(bloomParams, 'radius')
			.min(0)
			.max(1)
			.step(0.001)
			.onChange(() => {
				bloomPass.radius = bloomParams.radius;
			});

		effectComposer.addPass(bloomPass);

		const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
		effectComposer.addPass(gammaCorrectionPass);

		// Add post processing controls
		const postProcessingFolder = gui.addFolder('Post Processing');
		const postProcessingParams = {
			none: true,
			dotScreen: false,
			glitch: false,
			rgbShift: false,
			pixels: false,
			displacement: false,
			bloom: false
		};

		// Store controller references
		const controllers = {
			none: postProcessingFolder.add(postProcessingParams, 'none'),
			dotScreen: postProcessingFolder.add(postProcessingParams, 'dotScreen'),
			glitch: postProcessingFolder.add(postProcessingParams, 'glitch'),
			rgbShift: postProcessingFolder.add(postProcessingParams, 'rgbShift'),
			displacement: postProcessingFolder.add(postProcessingParams, 'displacement'),
			pixels: postProcessingFolder.add(postProcessingParams, 'pixels'),
			bloom: postProcessingFolder.add(postProcessingParams, 'bloom')
		};

		type PostProcessingPass =
			| 'none'
			| 'dotScreen'
			| 'glitch'
			| 'rgbShift'
			| 'pixels'
			| 'displacement'
			| 'bloom';

		const updatePasses = (selectedPass: PostProcessingPass, forceNone = false) => {
			if (forceNone) {
				selectedPass = 'none';
			}

			// Update pass states
			dotScreenPass.enabled = selectedPass === 'dotScreen';
			glitchPass.enabled = selectedPass === 'glitch';
			rgbShiftPass.enabled = selectedPass === 'rgbShift';
			renderPixelatedPass.enabled = selectedPass === 'pixels';
			displacementPass.enabled = selectedPass === 'displacement';
			bloomPass.enabled = selectedPass === 'bloom';

			// Update UI controllers
			controllers.none.setValue(selectedPass === 'none');
			controllers.dotScreen.setValue(selectedPass === 'dotScreen');
			controllers.glitch.setValue(selectedPass === 'glitch');
			controllers.rgbShift.setValue(selectedPass === 'rgbShift');
			controllers.pixels.setValue(selectedPass === 'pixels');
			controllers.displacement.setValue(selectedPass === 'displacement');
			controllers.bloom.setValue(selectedPass === 'bloom');
		};

		// Modified controller event handlers
		controllers.none.onChange((value: boolean) => {
			if (!value) {
				// Prevent deselecting 'none' if it's the only active option
				let anyOtherActive = Object.values(postProcessingParams).some(
					(val, index) => index > 0 && val
				);
				if (!anyOtherActive) {
					controllers.none.setValue(true);
				}
			}
		});

		controllers.dotScreen.onChange((value: boolean) =>
			value ? updatePasses('dotScreen') : updatePasses('none', true)
		);
		controllers.glitch.onChange((value: boolean) =>
			value ? updatePasses('glitch') : updatePasses('none', true)
		);
		controllers.rgbShift.onChange((value: boolean) =>
			value ? updatePasses('rgbShift') : updatePasses('none', true)
		);
		controllers.displacement.onChange((value: boolean) =>
			value ? updatePasses('displacement') : updatePasses('none', true)
		);
		controllers.pixels.onChange((value: boolean) =>
			value ? updatePasses('pixels') : updatePasses('none', true)
		);
		controllers.bloom.onChange((value: boolean) =>
			value ? updatePasses('bloom') : updatePasses('none', true)
		);

		const params = {
			pixelSize: 6,
			normalEdgeStrength: 0.3,
			depthEdgeStrength: 0.4,
			pixelAlignedPanning: true,
			rotationSpeed: 0.2 // Move rotation speed into params object
		};

		// Simplified animation parameters
		const pixelAnimation = {
			size: 6
		};

		// Updated animation trigger function using GSAP
		const triggerPixelAnimation = () => {
			renderPixelatedPass.enabled = true;
			updatePasses('pixels');

			gsap
				.timeline()
				.to(pixelAnimation, {
					size: 16,
					duration: 1.5,
					ease: 'power2.out',
					onUpdate: () => {
						renderPixelatedPass.setPixelSize(Math.max(1, pixelAnimation.size));
					}
				})
				.to(pixelAnimation, {
					size: 1,
					duration: 1.5,
					ease: 'power2.out',
					onUpdate: () => {
						renderPixelatedPass.setPixelSize(Math.max(1, pixelAnimation.size));
					},
					onComplete: () => {
						updatePasses('none', true);
						renderPixelatedPass.enabled = false;
					}
				});
		};

		gui
			.add(params, 'pixelSize')
			.min(1)
			.max(16)
			.step(1)
			.onChange(() => {
				renderPixelatedPass.setPixelSize(params.pixelSize);
			});

		// Add animation button
		gui.add({ animate: triggerPixelAnimation }, 'animate').name('Trigger Pixel Animation');

		// Update GUI control
		gui.add(params, 'rotationSpeed').min(0).max(1).step(0.01).name('Rotation Speed');

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		console.log(renderer.info);

		const radius = 6; // Distance from center

		const tick = () => {
			stats.begin();
			const elapsedTime = clock.getElapsedTime();

			// Use params.rotationSpeed instead of rotationSpeed
			const angle = elapsedTime * params.rotationSpeed;
			camera.position.x = Math.cos(angle) * radius;
			camera.position.z = Math.sin(angle) * radius;
			camera.lookAt(0, 0, 0);

			// Update controls
			controls.update();

			// Update passes
			displacementPass.material.uniforms.uTime.value = elapsedTime;

			// Render
			effectComposer.render();

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
			stats.end();
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
