<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { setupLightGUI } from '$lib/utils/lightGUI';
	import { setupCameraMovement } from '$lib/utils/cameraMovementSetUp';
	import { gsap } from 'gsap';
	import {
		EffectComposer,
		OutputPass,
		RenderPass,
		ShaderPass,
		UnrealBloomPass
	} from 'three/examples/jsm/Addons.js';
	import { setupCameraGUI } from '$lib/utils/cameraGUI';

	// Move debug object and GUI outside effect
	const debugObject: any = {
		outerThreshold: 0.0, // Start closed
		innerThreshold: 0.0, // Keep small gap for better effect
		waveCount: 17.0,
		colorA: '#004cc7',
		colorB: '#d6e0ff',
		noiseStrength: 1.75,
		waveSpeed: 2.0,
		distortionScale: 27.5
	};

	$effect(() => {
		// Add raycaster setup near the start
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		let portalCircle: THREE.Mesh;

		const BLOOM_SCENE = 1;
		const bloomLayer = new THREE.Layers();
		bloomLayer.set(BLOOM_SCENE);

		// Add these near the start after creating the bloom layer
		const materials: { [key: string]: THREE.Material } = {};
		const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });

		// Create uniforms outside effect
		const gui = new GUI({ width: 325 });
		let portalMaterial: any;
		const uniforms = {
			uTime: { value: 0 },
			uOuterThreshold: { value: debugObject.outerThreshold },
			uInnerThreshold: { value: debugObject.innerThreshold },
			uWaveCount: { value: debugObject.waveCount },
			uColorA: { value: new THREE.Color(debugObject.colorA) },
			uColorB: { value: new THREE.Color(debugObject.colorB) },
			uNoiseStrength: { value: debugObject.noiseStrength },
			uWaveSpeed: { value: debugObject.waveSpeed },
			uDistortionScale: { value: debugObject.distortionScale }
		};
		// Base
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();

		// Update background color to match fog
		const backgroundColor = '#262837';
		scene.background = new THREE.Color(backgroundColor);

		// Add fog with matching color
		const fogColor = backgroundColor;
		const fogNear = 1;
		const fogFar = 40;
		scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

		// Update fog controls to also change background
		const fogFolder = gui.addFolder('Fog');
		fogFolder.addColor({ fogColor }, 'fogColor').onChange((value: THREE.ColorRepresentation) => {
			(scene.fog as THREE.Fog).color.set(value);
			if (scene.background instanceof THREE.Color) {
				scene.background.set(value);
			}
		});
		fogFolder.add(scene.fog, 'near').min(0).max(10).step(0.1);
		fogFolder.add(scene.fog, 'far').min(10).max(100).step(0.1);

		const textureLoader = new THREE.TextureLoader();

		// Sizes (moved up)
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		// Load floor textures
		const floorTextures = {
			diffuse: textureLoader.load('/textures/metal-floor/metal_plate_02_diff_1k.jpg'),
			displacement: textureLoader.load('/textures/metal-floor/metal_plate_02_disp_1k.jpg'),
			normal: textureLoader.load('/textures/metal-floor/metal_plate_02_nor_gl_1k.jpg'),
			roughness: textureLoader.load('/textures/metal-floor/metal_plate_02_rough_1k.jpg'),
			metalnessMap: textureLoader.load('/textures/metal-floor/metal_plate_02_metal_1k.jpg'),
			aoMap: textureLoader.load('/textures/metal-floor/metal_plate_02_ao_1k.jpg')
		};

		// Configure texture settings
		Object.values(floorTextures).forEach((texture) => {
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.set(4, 4); // Adjust repeat value as needed
		});

		// Renderer (now after sizes)
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.toneMappingExposure = 1.0;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.setClearColor(new THREE.Color(backgroundColor), 1);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Load model
		const gltfLoader = new GLTFLoader();
		let portalModel: THREE.Group;
		gltfLoader.load('/models/portal-gateway/portal-gateway.glb', (gltf) => {
			portalModel = gltf.scene;
			portalModel.position.set(0, -1.9, 0);

			// Update materials
			portalModel.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.material.envMapIntensity = 0; // Remove env map influence
					child.material.needsUpdate = true;
					child.material.metalness = 0.8;
					child.material.roughness = 0.2;
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			scene.add(portalModel);
		});

		const addFloor = () => {
			const floorMaterial = new THREE.MeshStandardMaterial({
				color: '#666666',
				map: floorTextures.diffuse,
				normalMap: floorTextures.normal,
				normalScale: new THREE.Vector2(0.3, 0.3),
				metalnessMap: floorTextures.metalnessMap,
				metalness: 0.75,
				roughnessMap: floorTextures.roughness,
				roughness: 1.0,
				aoMap: floorTextures.aoMap,
				aoMapIntensity: 0.3,
				displacementMap: floorTextures.displacement,
				displacementScale: 0.25
			});

			const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 200, 200), floorMaterial);
			const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 200, 200), floorMaterial);

			floor.rotation.x = -Math.PI * 0.5;
			floor.position.y = -2;
			floor.receiveShadow = true;

			ceiling.rotation.x = Math.PI * 0.5;
			ceiling.position.y = 4;

			// Need to set up uv2 for aoMap
			floor.geometry.setAttribute(
				'uv2',
				new THREE.Float32BufferAttribute(floor.geometry.attributes.uv.array, 2)
			);

			ceiling.geometry.setAttribute(
				'uv2',
				new THREE.Float32BufferAttribute(ceiling.geometry.attributes.uv.array, 2)
			);

			scene.add(floor);
			scene.add(ceiling);

			// Updated GUI controls
			// const floorFolder = gui.addFolder('Floor Material');
			// floorFolder
			// 	.addColor(floorMaterial, 'color')
			// 	.onChange(() => (floorMaterial.needsUpdate = true));
			// floorFolder
			// 	.add(floorMaterial, 'roughness', 0, 1, 0.01)
			// 	.onChange(() => (floorMaterial.needsUpdate = true));
			// floorFolder
			// 	.add(floorMaterial, 'metalness', 0, 1, 0.01)
			// 	.onChange(() => (floorMaterial.needsUpdate = true));
			// floorFolder
			// 	.add(floorMaterial, 'aoMapIntensity', 0, 1, 0.01)
			// 	.onChange(() => (floorMaterial.needsUpdate = true));
			// floorFolder
			// 	.add(floorMaterial.normalScale, 'x', 0, 1, 0.01)
			// 	.name('Normal Scale X')
			// 	.onChange(() => (floorMaterial.needsUpdate = true));
			// floorFolder
			// 	.add(floorMaterial.normalScale, 'y', 0, 1, 0.01)
			// 	.name('Normal Scale Y')
			// 	.onChange(() => (floorMaterial.needsUpdate = true));
		};

		addFloor();

		// Lights
		const addLights = () => {
			const ambientLight = new THREE.AmbientLight('#ffffff', 0.3);
			scene.add(ambientLight);

			const pointLight = new THREE.PointLight('#ffffff', 50);
			pointLight.position.set(3.2, 1.2, 4.2);
			pointLight.castShadow = true;

			// Configure shadow settings for point light
			pointLight.shadow.mapSize.width = 2048;
			pointLight.shadow.mapSize.height = 2048;
			pointLight.shadow.camera.near = 0.1;
			pointLight.shadow.camera.far = 20;
			pointLight.shadow.bias = -0.0005;
			pointLight.shadow.normalBias = 0.02;

			// Add shadow camera helper for debugging
			const shadowHelper = new THREE.CameraHelper(pointLight.shadow.camera);
			shadowHelper.visible = false; // hide by default
			scene.add(shadowHelper);

			setupLightGUI(pointLight, gui, 'Main light');
			scene.add(pointLight);
		};
		addLights();

		// Add custom circle mesh
		const createGridCircle = () => {
			const segments = 256;
			const radius = 2.15;
			const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);

			// Convert vertices to be within a circle
			const positions = geometry.attributes.position.array;
			for (let i = 0; i < positions.length; i += 3) {
				const x = positions[i];
				const y = positions[i + 1];
				const z = positions[i + 2];

				const distance = Math.sqrt(x * x + y * y);
				if (distance > radius) {
					const angle = Math.atan2(y, x);
					positions[i] = Math.cos(angle) * radius;
					positions[i + 1] = Math.sin(angle) * radius;
				}
			}
			geometry.computeVertexNormals();

			// Create material based on MeshStandardMaterial
			const material = new THREE.MeshStandardMaterial({
				transparent: true,
				side: THREE.DoubleSide,
				metalness: 0.2,
				roughness: 0.5
			});

			// Store reference to compiled shader
			let materialRef: any = material;

			material.onBeforeCompile = (shader) => {
				materialRef.shader = shader;
				shader.uniforms = {
					...shader.uniforms,
					...uniforms
				};

				// Add custom varyings
				shader.vertexShader = shader.vertexShader.replace(
					'varying vec3 vViewPosition;',
					`varying vec3 vViewPosition;
					varying vec2 vUv;
					varying float vElevation;
					
					// Add uniform declarations
					uniform float uTime;
					uniform float uWaveCount;
					uniform float uNoiseStrength;
					uniform float uWaveSpeed;
					uniform float uDistortionScale;`
				);

				// Inject custom vertex logic
				shader.vertexShader = shader.vertexShader.replace(
					'#include <begin_vertex>',
					`
					vec2 center = vec2(0.5);
					float dist = length(uv - center);

					float angle = atan(uv.y - 0.5, uv.x - 0.5);
					float spiralRotation = dist * uWaveCount;
					angle += spiralRotation + uTime * uWaveSpeed;

					float spiral = sin(angle) * (1.0 - dist);
					float noise = cnoise(vec3(uv * uDistortionScale, uTime * 0.5));
					float distortion = noise * uNoiseStrength * (1.0 - dist);

					float finalWave = spiral + distortion;
					
					vec3 transformed = vec3(position);
					transformed.z += finalWave * 0.2;
					vElevation = finalWave;
					vUv = uv;
					`
				);

				// Insert Perlin noise function before main
				shader.vertexShader = shader.vertexShader.replace(
					'void main() {',
					`
					vec4 permute(vec4 x) {return mod(((x*34.0)+1.0)*x, 289.0);}
					vec4 taylorInvSqrt(vec4 r) {return 1.79284291400159 - 0.85373472095314 * r;}
					vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

					float cnoise(vec3 P) {
						vec3 Pi0 = floor(P);
						vec3 Pi1 = Pi0 + vec3(1.0);
						Pi0 = mod(Pi0, 289.0);
						Pi1 = mod(Pi1, 289.0);
						vec3 Pf0 = fract(P);
						vec3 Pf1 = Pf0 - vec3(1.0);
						vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
						vec4 iy = vec4(Pi0.yy, Pi1.yy);
						vec4 iz0 = Pi0.zzzz;
						vec4 iz1 = Pi1.zzzz;

						vec4 ixy = permute(permute(ix) + iy);
						vec4 ixy0 = permute(ixy + iz0);
						vec4 ixy1 = permute(ixy + iz1);

						vec4 gx0 = ixy0 / 7.0;
						vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
						gx0 = fract(gx0);
						vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
						vec4 sz0 = step(gz0, vec4(0.0));
						gx0 -= sz0 * (step(0.0, gx0) - 0.5);
						gy0 -= sz0 * (step(0.0, gy0) - 0.5);

						vec4 gx1 = ixy1 / 7.0;
						vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
						gx1 = fract(gx1);
						vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
						vec4 sz1 = step(gz1, vec4(0.0));
						gx1 -= sz1 * (step(0.0, gx1) - 0.5);
						gy1 -= sz1 * (step(0.0, gy1) - 0.5);

						vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
						vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
						vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
						vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
						vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
						vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
						vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
						vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

						vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
						g000 *= norm0.x;
						g010 *= norm0.y;
						g100 *= norm0.z;
						g110 *= norm0.w;
						vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
						g001 *= norm1.x;
						g011 *= norm1.y;
						g101 *= norm1.z;
						g111 *= norm1.w;

						float n000 = dot(g000, Pf0);
						float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
						float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
						float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
						float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
						float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
						float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
						float n111 = dot(g111, Pf1);

						vec3 fade_xyz = fade(Pf0);
						vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
						vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
						float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
						return 2.2 * n_xyz;
					}

					void main() {`
				);

				// Modify fragment shader
				shader.fragmentShader = shader.fragmentShader.replace(
					'varying vec3 vViewPosition;',
					`varying vec3 vViewPosition;
					varying vec2 vUv;
					varying float vElevation;
					uniform float uTime;
					uniform float uOuterThreshold;
					uniform float uInnerThreshold;
					uniform vec3 uColorA;
					uniform vec3 uColorB;`
				);

				// Add custom color mixing and transparency
				shader.fragmentShader = shader.fragmentShader.replace(
					'#include <map_fragment>',
					`
					vec2 center = vec2(0.5);
					float dist = length(vUv - center);

					// Modify ring calculation to hide when both thresholds are 0
					float ring = 0.0;
					if (uOuterThreshold > 0.0 || uInnerThreshold > 0.0) {
						ring = smoothstep(uOuterThreshold, uInnerThreshold, dist);
						ring *= smoothstep(1.0, 0.0, dist);
					}

					vec3 mixedColor = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vElevation * 3.0));
					diffuseColor.rgb = mixedColor;
					diffuseColor.a = ring;
					`
				);

				// Add a new replacement after emissivemap_fragment
				shader.fragmentShader = shader.fragmentShader.replace(
					'#include <emissivemap_fragment>',
					`
						#include <emissivemap_fragment>
						totalEmissiveRadiance = mixedColor * ring * 2.0;
						`
				);
			};

			// Add custom property to check if shader is ready
			material.customProgramCacheKey = () => (materialRef.shader ? '1' : '0');

			const circle = new THREE.Mesh(geometry, material);
			circle.position.y = 0.5;
			circle.castShadow = true;
			circle.receiveShadow = true;
			portalCircle = circle; // Store reference for raycaster
			scene.add(circle);

			return { materialRef, circle };
		};

		const { materialRef, circle } = createGridCircle();

		portalMaterial = materialRef;

		const handleAddGUIControls = () => {
			gui
				.add(debugObject, 'outerThreshold', -1, 1, 0.01)
				.name('Outer Threshold')
				.onChange(() => {
					uniforms.uOuterThreshold.value = debugObject.outerThreshold;
				});

			gui
				.add(debugObject, 'innerThreshold')
				.min(-1)
				.max(1)
				.step(0.01)
				.name('Inner Threshold')
				.onChange(() => {
					uniforms.uInnerThreshold.value = debugObject.innerThreshold;
				});

			gui
				.add(debugObject, 'waveCount')
				.min(1)
				.max(50)
				.step(1)
				.name('Wave Count')
				.onChange(() => {
					uniforms.uWaveCount.value = debugObject.waveCount;
				});

			gui
				.addColor(debugObject, 'colorA')
				.name('Color A')
				.onChange(() => {
					uniforms.uColorA.value.set(debugObject.colorA);
				});

			gui
				.addColor(debugObject, 'colorB')
				.name('Color B')
				.onChange(() => {
					uniforms.uColorB.value.set(debugObject.colorB);
				});

			gui
				.add(debugObject, 'noiseStrength')
				.min(0)
				.max(10)
				.step(0.01)
				.name('Noise Strength')
				.onChange(() => {
					uniforms.uNoiseStrength.value = debugObject.noiseStrength;
				});

			gui
				.add(debugObject, 'waveSpeed')
				.min(0)
				.max(5)
				.step(0.1)
				.name('Wave Speed')
				.onChange(() => {
					uniforms.uWaveSpeed.value = debugObject.waveSpeed;
				});

			gui
				.add(debugObject, 'distortionScale')
				.min(1)
				.max(50)
				.step(0.1)
				.name('Distortion Scale')
				.onChange(() => {
					uniforms.uDistortionScale.value = debugObject.distortionScale;
				});
		};

		handleAddGUIControls();

		const handlePortalClick = () => {
			const timeline = gsap.timeline();
			const targetThreshold = debugObject.outerThreshold === 1 ? 0 : 1;

			if (targetThreshold === 1) {
				// Pre-animation sequence when opening
				timeline
					.to(debugObject, {
						outerThreshold: 0.2,
						duration: 0.15,
						ease: 'power2.out'
					})
					.to(debugObject, {
						outerThreshold: 0,
						duration: 0.05
					})
					.to(
						debugObject,
						{
							outerThreshold: 0.4,
							duration: 0.25,
							ease: 'power2.out'
						},
						'+=0.35'
					)
					.to(debugObject, {
						outerThreshold: 0,
						duration: 0.1
					})
					.to(
						debugObject,
						{
							outerThreshold: 1,
							duration: 2,
							ease: 'power4.inOut'
						},
						'+=0.15'
					)
					// Add wave count animation during the final phase
					.to(
						debugObject,
						{
							waveCount: 50,
							duration: 1,
							ease: 'power1.inOut',
							yoyo: true,
							repeat: 1,
							onComplete: () => {
								debugObject.waveCount = 17; // Ensure it ends at 17
							}
						},
						'-=1.5'
					); // Start 2 seconds before the end
			} else {
				// Simple close animation
				timeline.to(debugObject, {
					outerThreshold: 0,
					duration: 2,
					ease: 'power4.in'
				});
			}

			// Update uniforms and GUI on every frame
			timeline.eventCallback('onUpdate', () => {
				uniforms.uOuterThreshold.value = debugObject.outerThreshold;
				uniforms.uWaveCount.value = debugObject.waveCount;

				// Update both controllers
				const controllers = gui.controllers.filter(
					(c) => c.property === 'outerThreshold' || c.property === 'waveCount'
				);
				controllers.forEach((controller) => controller.updateDisplay());
			});
		};

		const onClick = (event: MouseEvent) => {
			mouse.x = (event.clientX / sizes.width) * 2 - 1;
			mouse.y = -(event.clientY / sizes.height) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObject(portalCircle);

			if (intersects.length > 0) {
				handlePortalClick();
				event.stopPropagation(); // Prevent event from bubbling to window
			}
		};

		// Only add click listener to the canvas
		canvas.addEventListener('click', onClick);

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

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-0, 0, 12);
		scene.add(camera);

		setupCameraGUI(camera, gui);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Add smooth camera movement function
		const moveCameraToCenter = () => {
			gsap.to(camera.position, {
				x: 0,
				y: 0,
				z: 0,
				duration: 2,
				ease: 'power2.inOut',
				onUpdate: () => {
					// Update controls target to maintain proper orbiting
					controls.target.set(0, 0, 0);
					controls.update();
				}
			});
		};

		// Add camera movement controls to GUI
		const cameraMovementFolder = gui.addFolder('Camera Movement');
		cameraMovementFolder
			.add({ moveToCenter: moveCameraToCenter }, 'moveToCenter')
			.name('Move To Center');

		// Setup camera movement
		const cameraMovement = setupCameraMovement(
			camera,
			scene.position,
			{
				smoothFactor: 0.15,
				xSensitivity: 2.5,
				ySensitivity: 1.5,
				basePosition: { x: 5, y: 1.5, z: 16 }
			},
			true
		);

		const bloomDebugObject = {
			threshold: 0.5,
			strength: 0.5,
			radius: 0.1
		};

		const renderScene = new RenderPass(scene, camera);

		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			1.5,
			0.4,
			0.85
		);
		bloomPass.threshold = bloomDebugObject.threshold;
		bloomPass.strength = bloomDebugObject.strength;
		bloomPass.radius = bloomDebugObject.radius;

		const bloomComposer = new EffectComposer(renderer);
		bloomComposer.renderToScreen = false;
		bloomComposer.addPass(renderScene);
		bloomComposer.addPass(bloomPass);

		const mixPass = new ShaderPass(
			new THREE.ShaderMaterial({
				uniforms: {
					baseTexture: { value: null },
					bloomTexture: { value: bloomComposer.renderTarget2.texture }
				},
				vertexShader: `varying vec2 vUv;

			void main() {

				vUv = uv;

				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			}`,
				fragmentShader: `uniform sampler2D baseTexture;
			uniform sampler2D bloomTexture;

			varying vec2 vUv;

			void main() {

				gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );

			}`,
				defines: {}
			}),
			'baseTexture'
		);
		mixPass.needsSwap = true;

		const outputPass = new OutputPass();

		const finalComposer = new EffectComposer(renderer);
		finalComposer.addPass(renderScene);
		finalComposer.addPass(mixPass);
		finalComposer.addPass(outputPass);

		circle.layers.enable(BLOOM_SCENE);

		const bloomFolder = gui.addFolder('Bloom');

		bloomFolder
			.add(bloomDebugObject, 'threshold')
			.min(0)
			.max(1)
			.step(0.001)
			.onChange(() => {
				bloomPass.threshold = bloomDebugObject.threshold;
			});

		bloomFolder
			.add(bloomDebugObject, 'strength')
			.min(0)
			.max(3)
			.step(0.001)
			.onChange(() => {
				bloomPass.strength = bloomDebugObject.strength;
			});

		bloomFolder
			.add(bloomDebugObject, 'radius')
			.min(0)
			.max(1)
			.step(0.001)
			.onChange(() => {
				bloomPass.radius = bloomDebugObject.radius;
			});

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Check if shader is compiled before updating uniforms
			if (portalMaterial.shader) {
				portalMaterial.shader.uniforms.uTime.value = elapsedTime;
			}

			controls.update();
			cameraMovement.updateCamera();

			// Apply selective bloom rendering
			scene.traverse((obj) => {
				if (obj instanceof THREE.Mesh && !bloomLayer.test(obj.layers)) {
					materials[obj.uuid] = obj.material;
					obj.material = darkMaterial;
				}
			});

			bloomComposer.render();

			// Restore materials
			scene.traverse((obj) => {
				if (materials[obj.uuid]) {
					(obj as THREE.Mesh).material = materials[obj.uuid];
					delete materials[obj.uuid];
				}
			});

			finalComposer.render();

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			cameraMovement.cleanup();
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			canvas.removeEventListener('click', onClick);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>
