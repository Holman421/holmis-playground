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
	import { onDestroy } from 'svelte';

	let activePointText: number | null = null;
	let activeGroup: 'helmet' | 'sword' | 'knot' = 'sword';

	$effect(() => {
		const gui = new GUI();
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const gltfLoader = new GLTFLoader();
		const cubeTextureLoader = new THREE.CubeTextureLoader();
		const textureLoader = new THREE.TextureLoader();

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.far = 15;
		directionalLight.shadow.normalBias = 0.05;
		directionalLight.position.set(0.25, 3, -2.25);
		scene.add(directionalLight);

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56
		};

		window.addEventListener('resize', () => {
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			effectComposer.setSize(sizes.width, sizes.height);
			effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		// Base camera
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(1, 0, -6);
		scene.add(camera);

		// Store initial camera state
		const initialCameraState = {
			position: new THREE.Vector3(1, 0, -6),
			target: new THREE.Vector3(0, 0, 0)
		};

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Add controls toggle to GUI (place near other GUI controls)
		const controlsParams = {
			enabled: true
		};

		gui
			.add(controlsParams, 'enabled')
			.name('Enable Controls')
			.onChange((value: boolean) => {
				controls.enabled = value;
			});

		// Add reset camera function
		const resetCamera = () => {
			const wasEnabled = controls.enabled;
			controls.enabled = false;

			const timeline = gsap.timeline({
				onComplete: () => {
					controls.enabled = wasEnabled && controlsParams.enabled;
				}
			});

			timeline.to(
				camera.position,
				{
					duration: 1.5,
					x: initialCameraState.position.x,
					y: initialCameraState.position.y,
					z: initialCameraState.position.z,
					ease: 'power2.inOut'
				},
				0
			);

			timeline.to(
				controls.target,
				{
					duration: 1.5,
					x: initialCameraState.target.x,
					y: initialCameraState.target.y,
					z: initialCameraState.target.z,
					ease: 'power2.inOut',
					onUpdate: () => {
						camera.lookAt(controls.target);
					}
				},
				0
			);
		};

		// Add click listener to the back button
		document.querySelector('button')!.addEventListener('click', () => {
			if (activePointText !== null) {
				points[activePointText].element.querySelector('.text')?.classList.remove('visible');
				activePointText = null;
			}
			resetCamera();
		})! as HTMLElement;

		// Renderer
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

		// Update all materials
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

		const raycaster = new THREE.Raycaster();

		//Environment map
		const environmentMap = cubeTextureLoader.load([
			'/environmentMaps/0/px.png',
			'/environmentMaps/0/nx.png',
			'/environmentMaps/0/py.png',
			'/environmentMaps/0/ny.png',
			'/environmentMaps/0/pz.png',
			'/environmentMaps/0/nz.png'
		]);
		scene.environment = environmentMap;

		// Add environment map controls
		const envMapParams = {
			visible: false
		};

		gui
			.add(envMapParams, 'visible')
			.name('Show Environment Map')
			.onChange((visible: boolean) => {
				scene.background = visible ? environmentMap : null;
				scene.environment = environmentMap;
			});

		// Model references and parameters
		let helmetModel: THREE.Group | null = null;
		let swordModel: THREE.Group | null = null;

		// Change initial values - sword visible first
		const modelParams = {
			showHelmet: false,
			showSword: true,
			knotModel: false
		};

		const solidify = (mesh: any) => {
			const THICKNESS = 0.02;
			const geometry = mesh.geometry;
			const material = new THREE.ShaderMaterial({
				vertexShader: `
					void main() {
					vec3 newPosition = position + normal * ${THICKNESS};
					gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
				}`,
				fragmentShader: `
					void main() {
					gl_FragColor = vec4(0, 0, 0, 1);
				}`,
				transparent: true,
				side: THREE.BackSide
			});

			return new THREE.Mesh(geometry, material);
		};

		// Create knot model
		const texture = textureLoader.load('/textures/fourTone.jpg');
		texture.minFilter = texture.magFilter = THREE.NearestFilter;
		const knot = new THREE.Mesh(
			new THREE.TorusKnotGeometry(0.75, 0.2, 100, 16),
			new THREE.MeshToonMaterial({
				color: '#4e62f9',
				gradientMap: texture
			})
		);
		const adjustedKnot = solidify(knot);
		adjustedKnot.visible = modelParams.knotModel;
		knot.visible = modelParams.knotModel;
		scene.add(knot);
		scene.add(adjustedKnot);

		// Create models folder
		const modelsFolder = gui.addFolder('Models');

		const togglePointVisibility = (group: 'helmet' | 'sword' | 'knot') => {
			points.forEach((point) => {
				point.group === group
					? point.element.classList.add('visible')
					: point.element.classList.remove('visible');
			});
		};

		// Add model controls with manual update of GUI values
		const helmetController = modelsFolder
			.add(modelParams, 'showHelmet')
			.name('Show Helmet')
			.onChange((visible: boolean) => {
				if (helmetModel) {
					activeGroup = 'helmet';
					helmetModel.visible = visible;
					togglePointVisibility('helmet');
					if (visible && swordModel) {
						modelParams.showSword = false;
						swordModel.visible = false;
						swordController.updateDisplay();
					}
					adjustedKnot.visible = false;
					knot.visible = false;
					modelParams.knotModel = false;
					knotController.updateDisplay();
				}
			});

		const swordController = modelsFolder
			.add(modelParams, 'showSword')
			.name('Show Sword')
			.onChange((visible: boolean) => {
				if (swordModel) {
					activeGroup = 'sword';
					swordModel.visible = visible;
					togglePointVisibility('sword');

					activePointText = null;

					if (visible && helmetModel) {
						modelParams.showHelmet = false;
						helmetModel.visible = false;
						helmetController.updateDisplay();
					}
					adjustedKnot.visible = false;
					knot.visible = false;
					modelParams.knotModel = false;
					knotController.updateDisplay();
				}
			});

		const knotController = modelsFolder
			.add(modelParams, 'knotModel')
			.name('Show Knot')
			.onChange((visible: boolean) => {
				adjustedKnot.visible = visible;
				knot.visible = visible;
				activeGroup = 'knot';
				togglePointVisibility('knot');
				if (visible && helmetModel) {
					modelParams.showHelmet = false;
					helmetModel.visible = false;
					helmetController.updateDisplay();
				}

				if (visible && swordModel) {
					modelParams.showSword = false;
					swordModel.visible = false;
					swordController.updateDisplay();
				}
			});

		// Models
		gltfLoader.load('/models/DamagedHelmet/glTF/DamagedHelmet.gltf', (gltf) => {
			helmetModel = gltf.scene;
			helmetModel.scale.set(2, 2, 2);
			helmetModel.rotation.y = Math.PI * 0.5;
			helmetModel.visible = modelParams.showHelmet;
			scene.add(helmetModel);

			updateAllMaterials();
		});

		gltfLoader.load('/models/sword1/fantasy_longsword.glb', (gltf) => {
			swordModel = gltf.scene;
			const scale = 6;
			swordModel.scale.set(scale, scale, scale);

			const boundingBox = new THREE.Box3().setFromObject(swordModel);
			const center = boundingBox.getCenter(new THREE.Vector3());

			swordModel.position.x = -center.x;
			swordModel.position.y = -center.y;
			swordModel.position.z = -center.z;

			swordModel.visible = modelParams.showSword;
			scene.add(swordModel);

			updateAllMaterials();
		});

		// Points
		const points = [
			{
				positions: new THREE.Vector3(3.1, 2.6, -0.2),
				element: document.querySelector('.point-0') as HTMLElement,
				group: 'sword'
			},
			{
				positions: new THREE.Vector3(1.2, 0.85, -0.2),
				element: document.querySelector('.point-1') as HTMLElement,
				group: 'sword'
			},
			{
				positions: new THREE.Vector3(-1.2, -1.7, -0.2),
				element: document.querySelector('.point-2') as HTMLElement,
				group: 'sword'
			},
			{
				positions: new THREE.Vector3(-2.4, -2.4, -0.1),
				element: document.querySelector('.point-3') as HTMLElement,
				group: 'sword'
			},
			{
				positions: new THREE.Vector3(0.8, -0.5, -0.9),
				element: document.querySelector('.point-4') as HTMLElement,
				group: 'helmet'
			},
			{
				positions: new THREE.Vector3(1, 0.85, 0.6),
				element: document.querySelector('.point-5') as HTMLElement,
				group: 'helmet'
			}
		];

		const addPoints = () => {
			const mainContainer = document.querySelector('.mainContainer') as HTMLElement;
			points.forEach((point, index) => {
				mainContainer;
			});
		};

		// After points array definition, add the camera positions and targets
		const pointCameraPositions = [
			{
				position: new THREE.Vector3(2.76, 2.3, -2.33),
				target: new THREE.Vector3(3.3, 2.65, -0.2) // Change lookAt to target
			},
			{
				position: new THREE.Vector3(1.24, 0.89, -1.42),
				target: new THREE.Vector3(1.2, 0.85, -0.2)
			},
			{
				position: new THREE.Vector3(-1.04, -1.0, -1.15),
				target: new THREE.Vector3(-1.2, -1.2, -0.2)
			},
			{
				position: new THREE.Vector3(-2.35, -2.3, -1.04),
				target: new THREE.Vector3(-2.4, -2.2, -0.1)
			},
			{
				position: new THREE.Vector3(0.8, -0.5, -2),
				target: new THREE.Vector3(0.8, -0.5, -0.9)
			},
			{
				position: new THREE.Vector3(1.5, 0.85, 1.2),
				target: new THREE.Vector3(1, 0.85, 0.6)
			}
		];

		// Update camera transition function
		const moveCamera = (pointIndex: number) => {
			if (pointIndex >= pointCameraPositions.length) return;

			const config = pointCameraPositions[pointIndex];
			const targetLookAt = config.target;

			const wasEnabled = controls.enabled;
			controls.enabled = false;

			// Create a temporary vector to store current controls target
			const currentTarget = controls.target.clone();

			// Animate camera position
			gsap.fromTo(
				camera.position,
				{
					x: camera.position.x,
					y: camera.position.y,
					z: camera.position.z
				},
				{
					duration: 1.5,
					x: config.position.x,
					y: config.position.y,
					z: config.position.z,
					ease: 'power2.inOut'
				}
			);

			// Animate controls target
			gsap.fromTo(
				currentTarget,
				{
					x: controls.target.x,
					y: controls.target.y,
					z: controls.target.z
				},
				{
					duration: 1.5,
					x: targetLookAt.x,
					y: targetLookAt.y,
					z: targetLookAt.z,
					ease: 'power2.inOut',
					onUpdate: function () {
						controls.target.copy(currentTarget);
						camera.lookAt(currentTarget);
					},
					onComplete: () => {
						controls.enabled = wasEnabled && controlsParams.enabled;
					}
				}
			);
		};

		// After points are defined, add click handlers
		points.forEach((point, index) => {
			point.element.addEventListener('click', () => {
				// If clicking the same point, hide its text
				if (activePointText === index) {
					point.element.querySelector('.text')?.classList.remove('visible');
					activePointText = null;
				} else {
					// Hide previous point's text if any
					if (activePointText !== null) {
						points[activePointText].element.querySelector('.text')?.classList.remove('visible');
					}
					// Show current point's text
					point.element.querySelector('.text')?.classList.add('visible');
					activePointText = index;
				}
				moveCamera(index);
			});
		});

		points.map((point) => {
			points
				.filter((p) => p.group === 'helmet')
				.forEach((p) => {
					p.element.classList.remove('visible');
				});
		});

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
		stats.showPanel(0);
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
			rotationSpeed: 0.2,
			enableRotation: false
		};

		const pixelAnimation = {
			size: 6
		};

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
		gui.add(params, 'rotationSpeed').min(0).max(1).step(0.01).name('Rotation Speed');
		gui.add(params, 'enableRotation').name('Enable Camera Rotation');

		// Add these variables after the points array
		const pointsScreenPositions = points.map(() => ({
			x: 0,
			y: 0,
			visible: false,
			lerpFactor: 1
		}));

		const clock = new THREE.Clock();
		const radius = 6;

		let animationFrameId: number;
		const tick = () => {
			stats.begin();
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Only rotate if enabled
			if (params.enableRotation) {
				const angle = elapsedTime * params.rotationSpeed;
				camera.position.x = Math.cos(angle) * radius;
				camera.position.z = Math.sin(angle) * radius;
				camera.lookAt(0, 0, 0);
			}

			// Update points
			points
				.filter((p) => p.group === activeGroup)
				.forEach((point, index) => {
					const screenPosition = point.positions.clone();
					screenPosition.project(camera);

					raycaster.setFromCamera(new THREE.Vector2(screenPosition.x, screenPosition.y), camera);
					const intersects = raycaster.intersectObjects(scene.children, true);

					let isVisible =
						intersects.length === 0 ||
						intersects[0].distance > point.positions.distanceTo(camera.position);

					if (point.group === 'sword') {
						isVisible = true;
					}

					// Update visibility
					if (isVisible) {
						point.element.classList.add('visible');
					} else {
						point.element.classList.remove('visible');
					}

					// Calculate target position
					const targetX = screenPosition.x * sizes.width * 0.5;
					const targetY = -screenPosition.y * sizes.height * 0.5;

					// Lerp current position to target
					pointsScreenPositions[index].x +=
						(targetX - pointsScreenPositions[index].x) * pointsScreenPositions[index].lerpFactor;
					pointsScreenPositions[index].y +=
						(targetY - pointsScreenPositions[index].y) * pointsScreenPositions[index].lerpFactor;

					// Apply smoothed position
					point.element.style.transform = `translate(${pointsScreenPositions[index].x}px, 
						${pointsScreenPositions[index].y}px)`;
				});

			// Update passes
			displacementPass.material.uniforms.uTime.value = elapsedTime;

			// Render
			effectComposer.render();

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);

			stats.end();
		};

		tick();
		onDestroy(() => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		});
	});
</script>

<div class="fixed inset-0 mainContainer">
	<canvas class="webgl"></canvas>

	<button class="absolute top-[85px] left-[30px]">Go back</button>

	{#each Array(6) as _, i}
		<div class="point point-{i} visible">
			<div class="label">{i + 1}</div>
			<div class="text" class:visible={activePointText === i}>
				{#if i === 0}
					The point is pretty sharp
				{:else if i === 1}
					Imagine cool a fact about the blade
				{:else if i === 2}
					Expensive af gem
				{:else if i === 3}
					This is a really cool handle
				{:else if i === 4}
					This helmet is from 2045
				{:else if i === 5}
					Another helmet fact
				{:else}
					And another one
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.point {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 0;
	}

	.point .label {
		position: absolute;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #00000077;
		border: 1px solid #ffffff77;
		font-family: Helvetica, Arial, sans-serif;
		text-align: center;
		line-height: 40px;
		font-size: 18px;
		cursor: pointer;
		transform: scale(0, 0);
		transition: transform 0.3s;
	}

	.point.visible .label {
		transform: scale(1, 1);
	}

	.point .text {
		position: absolute;
		top: 50px;
		left: 40%;
		transform: translateX(-50%);
		width: 200px;
		padding: 20px;
		border-radius: 4px;
		background: #00000077;
		border: 1px solid #ffffff77;
		color: #ffffff;
		line-height: 1.3em;
		font-family: Helvetica, Arial, sans-serif;
		font-size: 18px;
		opacity: 0;
		transition: opacity 1s ease-in-out;
		pointer-events: none;
	}

	.point .text.visible {
		opacity: 1;
		transition: opacity 1s ease-in-out 0.5s;
	}

	canvas.webgl {
		position: fixed;
		top: 56px;
		left: 0;
		outline: none;
	}
</style>
