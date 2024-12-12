<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { RGBELoader } from 'three/examples/jsm/Addons.js';
	import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
	import terrainVertexShader from './shaders/terrain/vertex.glsl';
	import terrainFragmentShader from './shaders/terrain/fragment.glsl';
	import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
	import { gsap } from 'gsap';
	import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
	import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const rgbeLoader = new RGBELoader();
		const gltfLoader = new GLTFLoader();
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

			// scene.background = environmentMap;
			scene.backgroundBlurriness = 0.5;
			scene.environment = environmentMap;
		});

		const envMapParams = {
			visible: false
		};

		gui
			.add(envMapParams, 'visible')
			.name('Show Environment Map')
			.onChange((visible: boolean) => {
				scene.background = visible ? environmentMapVariable : null;
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

		// GUI Settings
		const settings = {
			uPositionFrequency: 2.0,
			uWarpFrequency: 0.2,
			uWarpStrength: 0.5,
			uStrength: 1.6,
			uBaseHeight: 0.85,
			uAnimationSpeed: 0.0
		};

		const gridSize = 250;

		// Create Geometry
		const pillarGeometry = new THREE.BoxGeometry(0.04, 1, 0.04);

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
			metalness: 0,
			roughness: 1
		});

		// Instanced Mesh
		const instancedMesh = new THREE.InstancedMesh(pillarGeometry, material, gridSize * gridSize);
		instancedMesh.castShadow = true;
		instancedMesh.receiveShadow = true;

		// Position Instances
		const dummy = new THREE.Object3D();
		for (let i = 0; i < gridSize * gridSize; i++) {
			const x = (i % gridSize) * 0.04 - (gridSize * 0.04) / 2;
			const z = Math.floor(i / gridSize) * 0.04 - (gridSize * 0.04) / 2;

			dummy.position.set(x, 0, z);
			dummy.updateMatrix();
			instancedMesh.setMatrixAt(i, dummy.matrix);
		}
		scene.add(instancedMesh);

		// Outer Box
		const createBoard = () => {
			const boardFill = new Brush(new THREE.BoxGeometry(11, 2.5, 11));
			const boardHole = new Brush(new THREE.BoxGeometry(10, 2.6, 10));
			const evaluator = new Evaluator();
			const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION);
			board.position.set(0, 0.5, 0);
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

		// Add WMStar
		let wmStar: any = null;
		const starSettings = {
			scale: 0.2,
			color: '#eafd05',
			rotationSpeed: 0.4
		};

		gltfLoader.load('/models/WMStar/star.glb', (gltf) => {
			wmStar = gltf.scene;

			// Set initial scale
			wmStar.scale.set(starSettings.scale, starSettings.scale, starSettings.scale);
			wmStar.position.y = 2.0;
			wmStar.rotateX(Math.PI * 0.5);

			// Add custom material with strong color for visibility
			const debugMaterial = new THREE.MeshStandardMaterial({
				color: starSettings.color,
				metalness: 0.3,
				roughness: 0.4,
				emissive: starSettings.color,
				emissiveIntensity: 0.5
			});

			wmStar.traverse((child: any) => {
				if (child.isMesh) {
					child.material = debugMaterial;
					child.castShadow = true;
					child.receiveShadow = false;
				}
			});

			scene.add(wmStar);
		});

		// Add error handling for model loading
		gltfLoader.manager.onError = function (url) {
			console.error('Error loading', url);
		};

		// Add 3D Text
		const fontLoader = new FontLoader();
		fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
			const textGeometry = new TextGeometry('Wonder Makers', {
				font,
				size: 0.75,
				height: 0.2,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 0.03,
				bevelSize: 0.02,
				bevelOffset: 0,
				bevelSegments: 5
			});

			const textMaterial = new THREE.MeshStandardMaterial({
				color: '#eafd05',
				metalness: 0.3,
				roughness: 0.4
			});

			const textMesh = new THREE.Mesh(textGeometry, textMaterial);
			textGeometry.center();
			textMesh.position.y = 0.6;
			textMesh.position.x = -5.5;
			textMesh.castShadow = false;
			textMesh.rotateY(-Math.PI * 0.5);
			scene.add(textMesh);
		});

		// GSAP GUI Animations
		const animatePositionFrequency = () => {
			gsap.to(settings, {
				uPositionFrequency: 0,
				duration: 3,
				easing: 'power4.in',
				onUpdate: () => {
					material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
				},
				onComplete: () => {
					gsap.to(settings, {
						uPositionFrequency: 5,
						duration: 3,
						easing: 'power4.inOut',
						onUpdate: () => {
							material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
						},
						onComplete: () => {
							gsap.to(settings, {
								uPositionFrequency: 2,
								duration: 3,
								easing: 'power4.inOut',
								onUpdate: () => {
									material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
								}
							});
						}
					});
				}
			});
		};
		const animateBaseHeight = () => {
			gsap.to(settings, {
				uBaseHeight: 0.5,
				duration: 2,
				easing: 'power4.inOut',
				onUpdate: () => {
					material.uniforms.uBaseHeight.value = settings.uBaseHeight;
				},
				onComplete: () => {
					gsap.to(settings, {
						uBaseHeight: 1,
						duration: 2.5,
						easing: 'power4.inOut',
						onUpdate: () => {
							material.uniforms.uBaseHeight.value = settings.uBaseHeight;
						},
						onComplete: () => {
							gsap.to(settings, {
								uBaseHeight: 0.85,
								duration: 1.5,
								easing: 'power4.inOut',
								onUpdate: () => {
									material.uniforms.uBaseHeight.value = settings.uBaseHeight;
								}
							});
						}
					});
				}
			});
		};
		const animateTerrainIntensity = () => {
			const timeline = gsap.timeline();

			timeline
				.to(settings, {
					uStrength: 0.6,
					duration: 2,
					easing: 'power4.out',
					onUpdate: () => {
						material.uniforms.uStrength.value = settings.uStrength;
					}
				})
				.to(settings, {
					uStrength: 2.25,
					duration: 3,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uStrength.value = settings.uStrength;
					},
					delay: 0.75
				})
				.to(settings, {
					uStrength: 1.65,
					duration: 2,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uStrength.value = settings.uStrength;
					}
				});
		};

		// GUI Controls
		gui
			.add(settings, 'uPositionFrequency', 0.1, 5.0, 0.05)
			.name('Position Frequency')
			.onChange(() => {
				material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
			});
		gui.add({ animate: animatePositionFrequency }, 'animate').name('Animate Position Frequency');
		gui.add({ animate: animateBaseHeight }, 'animate').name('Animate Base Height');
		gui.add({ animate: animateTerrainIntensity }, 'animate').name('Animate Terrain Intensity');
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
			.add(settings, 'uStrength', 0.0, 2.0, 0.1)
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
			material.uniforms.uTime.value = elapsedTime;

			// Rotate WMStar
			if (wmStar) {
				wmStar.rotation.y = elapsedTime * starSettings.rotationSpeed;
				wmStar.rotation.z = elapsedTime * starSettings.rotationSpeed;
			}

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
