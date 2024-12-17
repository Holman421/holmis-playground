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
		const loadingBarElement = document.querySelector('.loading-bar') as HTMLDivElement;
		const loadingManager = new THREE.LoadingManager(
			() => {
				gsap.delayedCall(0.5, () => {
					gsap.to(overlayMaterial.uniforms.uAplha, { duration: 3, value: 0 });
					loadingBarElement.classList.add('ended');
					loadingBarElement.style.transform = '';
				});
			},
			(itemUrl, itemsLoaded, itemsTotal) => {
				const progressRatio = itemsLoaded / itemsTotal;
				console.log(`Loading ${itemUrl}: ${progressRatio * 100}%`);
				gsap.to(loadingBarElement, { scaleX: progressRatio, duration: 0.5 });
			}
		);
		const scene = new THREE.Scene();
		const rgbeLoader = new RGBELoader(loadingManager);
		const gltfLoader = new GLTFLoader(loadingManager);
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

		// Overlay
		const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
		const overlayMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uAplha: { value: 1 }
			},
			vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
			fragmentShader: `
			uniform float uAplha;
        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAplha);
        }
    `,
			transparent: true
		});
		const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
		scene.add(overlay);

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
			uAnimationSpeed: 0.1
		};

		const animationState = {
			isTerrainAnimating: false,
			isButtonsActive: true
		};

		const gridSize = 250;

		// Create Geometry
		const pillarGeometry = new THREE.BoxGeometry(0.04, 1, 0.04);

		// Replace ShaderMaterial with CustomShaderMaterial
		const material = new CustomShaderMaterial({
			precision: 'lowp',
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
			color: '#eafd05'
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

		const text3D = 'Wonder Makers';

		// Add text settings
		const textSettings = {
			content: text3D,
			size: 0.9,
			height: 0.2
		};

		const mainColor = '#eafd05';

		// Store the text mesh reference
		let textMesh: THREE.Mesh | null = null;

		// Function to create or update text
		const updateText = (font: any) => {
			const textGeometry = new TextGeometry(textSettings.content, {
				font,
				size: textSettings.size,
				height: textSettings.height,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 0.03,
				bevelSize: 0.02,
				bevelOffset: 0,
				bevelSegments: 5
			});

			const textMaterial = new THREE.MeshStandardMaterial({
				color: mainColor,
				metalness: 0.3,
				roughness: 0.4
			});

			// Remove existing text mesh if it exists
			if (textMesh) {
				scene.remove(textMesh);
			}

			// Create new text mesh
			textMesh = new THREE.Mesh(textGeometry, textMaterial);
			textGeometry.center();
			textMesh.position.y = 1.0;
			textMesh.position.x = -5.5;
			textMesh.castShadow = false;
			textMesh.rotateY(-Math.PI * 0.5);
			scene.add(textMesh);
		};

		// Add 3D Text
		const fontLoader = new FontLoader();
		fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
			// Store font for later use
			const storedFont = font;

			// Initial text creation
			updateText(font);

			// Add GUI controls for text
			const textFolder = gui.addFolder('Text Settings');
			textFolder
				.add(textSettings, 'content')
				.name('Text Content')
				.onChange(() => updateText(storedFont));
			textFolder
				.add(textSettings, 'size', 0.1, 2, 0.1)
				.name('Text Size')
				.onChange(() => updateText(storedFont));
			textFolder
				.add(textSettings, 'height', 0.1, 1, 0.1)
				.name('Text Height')
				.onChange(() => updateText(storedFont));
		});

		// GSAP GUI Animations
		const animatePositionFrequency = () => {
			const timeline = gsap.timeline();
			const duration = 7;

			timeline
				.to(settings, {
					uPositionFrequency: 0.2,
					duration: 2,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
					}
				})
				.to(settings, {
					uPositionFrequency: 4.5,
					duration: 3,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
					}
				})
				.to(settings, {
					uPositionFrequency: 2,
					duration: 2,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
					}
				});

			if (wmStar) {
				timeline
					.to(
						wmStar.scale,
						{
							x: 0.8,
							y: 0.8,
							z: 0.8,
							duration: 2,
							easing: 'power4.inOut'
						},
						0
					)
					.to(
						wmStar.scale,
						{
							x: 0.05,
							y: 0.05,
							z: 0.05,
							duration: 3,
							easing: 'power4.inOut'
						},
						2
					)
					.to(
						wmStar.scale,
						{
							x: 0.2,
							y: 0.2,
							z: 0.2,
							duration: 2,
							easing: 'power4.inOut'
						},
						5
					);

				timeline
					.to(
						wmStar.position,
						{
							y: 2.5,
							duration: 2,
							easing: 'power4.inOut'
						},
						0
					)
					.to(
						wmStar.position,
						{
							y: 2.0,
							duration: 3,
							easing: 'power4.inOut'
						},
						2
					)
					.to(
						wmStar.position,
						{
							y: 2.0,
							duration: 2,
							easing: 'power4.inOut'
						},
						5
					);
			}

			return { timeline, duration };
		};

		const animateBaseHeight = () => {
			const timeline = gsap.timeline();
			const duration = 4.75;

			// Terrain animation
			timeline
				.to(settings, {
					uBaseHeight: 0.5,
					duration: 1.5,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uBaseHeight.value = settings.uBaseHeight;
					}
				})
				.to(settings, {
					uBaseHeight: 1,
					duration: 2,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uBaseHeight.value = settings.uBaseHeight;
					}
				})
				.to(settings, {
					uBaseHeight: 0.85,
					duration: 1.25,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uBaseHeight.value = settings.uBaseHeight;
					}
				});

			// Star animation
			if (wmStar) {
				timeline
					.to(
						wmStar.position,
						{
							y: 0.5,
							duration: 1.5,
							easing: 'power4.inOut'
						},
						0
					)
					.to(
						wmStar.position,
						{
							y: 2.5,
							duration: 2,
							easing: 'power4.inOut'
						},
						1.5
					)
					.to(
						wmStar.position,
						{
							y: 2.0,
							duration: 1.25,
							easing: 'power4.inOut'
						},
						3.5
					);
			}

			return { timeline, duration };
		};

		const animateTerrainIntensity = () => {
			const timeline = gsap.timeline();
			const duration = 4.5; // 2 + 3 + 2 + 0.75 seconds total

			timeline
				.to(settings, {
					uStrength: 0.6,
					duration: 1.5,
					easing: 'power4.out',
					onUpdate: () => {
						material.uniforms.uStrength.value = settings.uStrength;
					}
				})
				.to(settings, {
					uStrength: 2,
					duration: 1.75,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uStrength.value = settings.uStrength;
					}
				})
				.to(settings, {
					uStrength: 1.65,
					duration: 1.25,
					easing: 'power4.inOut',
					onUpdate: () => {
						material.uniforms.uStrength.value = settings.uStrength;
					}
				});

			return { timeline, duration };
		};

		// Add raycaster setup
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		let hoveredBox: any = null;

		const boxPosition = {
			x: -5.5,
			y: -0.1,
			z: 0
		};

		const labelPosition = {
			x: -5.63,
			y: -0.1,
			z: 0
		};

		// Create box labels
		const createBoxLabel = (text: string, font: any, parentBox: THREE.Mesh) => {
			const textGeometry = new TextGeometry(text, {
				font,
				size: 0.15,
				height: 0.05,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 0.01,
				bevelSize: 0.005,
				bevelOffset: 0,
				bevelSegments: 5
			});

			const textMaterial = new THREE.MeshStandardMaterial({
				color: '#000000',
				metalness: 0.3,
				roughness: 0.4
			});

			const textMesh = new THREE.Mesh(textGeometry, textMaterial);
			textGeometry.center();

			// Position text relative to parent box using labelPosition
			textMesh.position.copy(parentBox.position);
			textMesh.position.x = labelPosition.x;
			textMesh.rotation.y = -Math.PI * 0.5;

			scene.add(textMesh);
			return textMesh;
		};

		// Create boxes with labels
		const boxOne = new THREE.Mesh(
			new THREE.BoxGeometry(0.3, 0.5, 1.5),
			new THREE.MeshStandardMaterial({ color: mainColor })
		);
		const boxTwo = new THREE.Mesh(
			new THREE.BoxGeometry(0.3, 0.5, 1.5),
			new THREE.MeshStandardMaterial({ color: mainColor })
		);
		const boxThree = new THREE.Mesh(
			new THREE.BoxGeometry(0.3, 0.5, 1.5),
			new THREE.MeshStandardMaterial({ color: mainColor })
		);

		const boxes = [boxOne, boxTwo, boxThree];
		let boxLabels: THREE.Mesh[] = [];

		boxOne.position.set(boxPosition.x, boxPosition.y, boxPosition.z);
		boxTwo.position.set(boxPosition.x, boxPosition.y, boxPosition.z + 2.5);
		boxThree.position.set(boxPosition.x, boxPosition.y, boxPosition.z - 2.5);

		scene.add(boxOne);
		scene.add(boxTwo);
		scene.add(boxThree);

		// Load font and create labels
		fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
			boxLabels = [
				createBoxLabel('Position', font, boxOne),
				createBoxLabel('Height', font, boxTwo),
				createBoxLabel('Intensity', font, boxThree)
			];
		});

		// Add event listeners
		const onMouseMove = (event: MouseEvent) => {
			mouse.x = (event.clientX / sizes.width) * 2 - 1;
			mouse.y = -((event.clientY - 56) / sizes.height) * 2 + 1;
		};

		const triggerButtonAnimation = (
			boxIndex: number,
			animation: { timeline: gsap.core.Timeline; duration: number }
		) => {
			if (!animationState.isButtonsActive) return;

			animationState.isButtonsActive = false;

			const clickTimeline = gsap.timeline();

			// Create click animation
			clickTimeline
				.to(
					boxLabels[boxIndex].position,
					{
						x: labelPosition.x + 0.1,
						duration: 0.2,
						ease: 'power2.out'
					},
					0
				)
				.to(
					boxes[boxIndex].position,
					{
						x: boxPosition.x + 0.1,
						duration: 0.2,
						ease: 'power2.out'
					},
					0
				)
				.to(
					boxLabels[boxIndex].position,
					{
						x: labelPosition.x,
						duration: 0.3,
						ease: 'elastic.out(1, 0.3)'
					},
					'+=0.2'
				)
				.to(
					boxes[boxIndex].position,
					{
						x: boxPosition.x,
						duration: 0.3,
						ease: 'elastic.out(1, 0.3)'
					},
					'-=0.3'
				);

			// Create master timeline
			const masterTimeline = gsap.timeline({
				onComplete: () => {
					animationState.isButtonsActive = true;
				}
			});

			masterTimeline
				.add(clickTimeline)
				.add(animation.timeline, '>')
				.add(() => {}, `+=${animation.duration - animation.timeline.duration()}`);
		};

		const onClick = () => {
			if (hoveredBox && animationState.isButtonsActive) {
				let animation: any;
				const boxIndex = boxes.indexOf(hoveredBox);

				if (hoveredBox === boxOne) {
					animation = animatePositionFrequency();
				} else if (hoveredBox === boxTwo) {
					animation = animateBaseHeight();
				} else if (hoveredBox === boxThree) {
					animation = animateTerrainIntensity();
				}

				triggerButtonAnimation(boxIndex, animation);
			}
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('click', onClick);

		// GUI Controls
		gui
			.add(settings, 'uPositionFrequency', 0.1, 5.0, 0.05)
			.name('Position Frequency')
			.onChange(() => {
				material.uniforms.uPositionFrequency.value = settings.uPositionFrequency;
			});
		gui
			.add({ animate: () => triggerButtonAnimation(0, animatePositionFrequency()) }, 'animate')
			.name('Animate Position Frequency');
		gui
			.add({ animate: () => triggerButtonAnimation(1, animateBaseHeight()) }, 'animate')
			.name('Animate Base Height');
		gui
			.add({ animate: () => triggerButtonAnimation(2, animateTerrainIntensity()) }, 'animate')
			.name('Animate Terrain Intensity');
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
		gui.add(animationState, 'isTerrainAnimating').name('Toggle Terrain Animation');

		const renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: 'high-performance'
		});
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

			// Update raycaster
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(boxes);

			// Reset previously hovered box
			if (hoveredBox && (!intersects.length || intersects[0].object !== hoveredBox)) {
				const boxIndex = boxes.indexOf(hoveredBox);
				gsap.to(hoveredBox.position, {
					x: boxPosition.x,
					duration: 0.3
				});
				gsap.to(boxLabels[boxIndex].position, {
					x: labelPosition.x,
					duration: 0.3
				});
				hoveredBox = null;
				canvas.style.cursor = 'default'; // Add this line
			}

			// Handle new hover
			if (intersects.length) {
				const newHoveredBox = intersects[0].object as THREE.Mesh;
				if (hoveredBox !== newHoveredBox && animationState.isButtonsActive) {
					hoveredBox = newHoveredBox;
					gsap.to(hoveredBox.position, {
						x: boxPosition.x - 0.05,
						duration: 0.3
					});

					// Move corresponding label
					const boxIndex = boxes.indexOf(hoveredBox);
					if (boxIndex !== -1 && boxLabels[boxIndex]) {
						gsap.to(boxLabels[boxIndex].position, {
							x: labelPosition.x - 0.05,
							duration: 0.3
						});
					}

					canvas.style.cursor = 'pointer'; // Add this line
				}
			} else {
				canvas.style.cursor = animationState.isButtonsActive ? 'default' : 'not-allowed';
			}

			// Update star rotation always
			if (wmStar) {
				wmStar.rotation.y = elapsedTime * settings.uAnimationSpeed * 2.0;
				wmStar.rotation.z = elapsedTime * settings.uAnimationSpeed * 2.0;
			}

			// Update terrain animation only if enabled
			if (animationState.isTerrainAnimating) {
				material.uniforms.uTime.value = elapsedTime;
			}

			controls.update();
			renderer.render(scene, camera);
			window.requestAnimationFrame(tick);
		};
		tick();

		// Clean up event listeners
		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('click', onClick);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
	<div class="loading-bar"></div>
</div>

<style>
	.loading-bar {
		position: absolute;
		top: 50%;
		width: 100%;
		height: 2px;
		background: #ffffff;
		transform: scaleX(0);
		transform-origin: top left;
		transition: transform 0.5s;
		will-change: transform;
	}

	.loading-bar.ended {
		transform-origin: top right;
		transition: transform 1.5s ease-in-out;
	}
</style>
