<script lang="ts">
	import type { AnimatedBox, AnimationMode, BoxConfig, BoxMaterials } from './types';
	import {
		ANIMATION_CONFIG,
		handleGentleAnimation,
		handleAcceleratingAnimation
	} from './animations';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import {
		DRACOLoader,
		GLTFLoader,
		RGBELoader,
		SubsurfaceScatteringShader
	} from 'three/examples/jsm/Addons.js';
	import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
	import { gsap } from 'gsap';

	$effect(() => {
		// Add initial delay flag
		let sceneInitialized = false;
		setTimeout(() => {
			sceneInitialized = true;
		}, 1000);

		// Add mouse movement tracking
		let lastMouseX = 0;
		let lastMouseY = 0;
		let isMouseMoving = false;
		let mouseTimeout: number;

		window.addEventListener('mousemove', (event) => {
			clearTimeout(mouseTimeout);
			isMouseMoving = true;

			// Update pointer position
			pointerPos.set(
				(event.clientX / window.innerWidth) * 2 - 1,
				-((event.clientY - 56) / window.innerHeight) * 2 + 1
			);

			// Set timeout to detect when mouse stops
			mouseTimeout = setTimeout(() => {
				isMouseMoving = false;
			}, 100) as unknown as number;
		});

		function isOutOfBounds({ box, numCols, numRows }: any) {
			const b = box.userData;
			return b.col + b.size > numCols || b.row - b.size + 1 < 0 || b.row + b.size > numRows;
		}
		function areOverlapping(newBox: any, extantBox: any) {
			const nb = newBox.userData;
			const eb = extantBox.userData;
			let colsOverlap =
				(nb.col <= eb.col && nb.col + nb.size > eb.col) ||
				(eb.col <= nb.col && eb.col + eb.size > nb.col);
			let rowsOverlap =
				(nb.row >= eb.row && nb.row - nb.size < eb.row) ||
				(eb.row >= nb.row && eb.row - eb.size < nb.row);
			const areIndeedOverlapping = colsOverlap && rowsOverlap;
			return areIndeedOverlapping;
		}
		const texLoader = new THREE.TextureLoader();
		const imgTexture = texLoader.load('textures/sss/white.jpg');
		const defaultColor = new THREE.Color(0xffff00);
		function getSSSMaterial(color = defaultColor) {
			const shader = SubsurfaceScatteringShader;
			const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
			uniforms['map'].value = imgTexture;
			uniforms['diffuse'].value = new THREE.Vector3(0, 0, 0);
			uniforms['shininess'].value = 100;
			uniforms['thicknessMap'].value = imgTexture;
			let { r, g, b } = color;
			uniforms['thicknessColor'].value = new THREE.Vector3(r, g, b);
			uniforms['thicknessDistortion'].value = 0.1;
			uniforms['thicknessAmbient'].value = 0.1;
			uniforms['thicknessAttenuation'].value = 0.05;
			uniforms['thicknessPower'].value = 2.0;
			uniforms['thicknessScale'].value = 16.0;

			// Add opacity uniform
			uniforms['opacity'] = { value: 1.0 };

			const material = new THREE.ShaderMaterial({
				uniforms: uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader.replace(
					'gl_FragColor = vec4( outgoingLight, 1.0 );',
					'gl_FragColor = vec4( outgoingLight, opacity );'
				),
				lights: true,
				transparent: true // Add transparency support
			});
			// material.extensions.derivatives = true;
			return material;
		}

		function getSunlight() {
			const sunlight = new THREE.DirectionalLight(0xffffff, 20);
			sunlight.position.y = 30;
			sunlight.position.z = 10;
			sunlight.target.position.set(0, 0, -10);
			sunlight.shadow.camera.near = 1;
			sunlight.shadow.camera.far = 100;
			sunlight.shadow.camera.right = 20;
			sunlight.shadow.camera.left = -20;
			sunlight.shadow.camera.top = 20;
			sunlight.shadow.camera.bottom = -20;

			sunlight.castShadow = true;
			sunlight.shadow.mapSize.width = 2048;
			sunlight.shadow.mapSize.height = 2048;
			const dHelper = new THREE.DirectionalLightHelper(sunlight, 5);
			// scene.add(dHelper);
			return sunlight;
		}

		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};

		// Add animation settings to debug object
		debugObject.animationMode = 'gentle';
		gui
			.add(debugObject, 'animationMode', ['gentle', 'accelerating'])
			.name('Animation Style')
			.onChange(() => {
				boxes.children.forEach((box) => {
					box.position.z = 0;
				});
			});

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const rgbeLoader = new RGBELoader();
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./draco/');
		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);

		function getBox({ col, row, size, numCols, numRows }: BoxConfig): AnimatedBox {
			const spacing = 1;
			const startPos = {
				x: numCols * spacing * -0.5,
				y: numRows * spacing * -0.45
			};
			const pos = {
				x: startPos.x + col * spacing,
				y: startPos.y + row * spacing,
				z: 0
			};
			const obj = new THREE.Object3D();
			obj.position.set(pos.x, pos.y, pos.z);

			const geo = new THREE.BoxGeometry(size, size, 10);
			const startHue = 0.4;
			const endHue = 1;
			const hue = startHue + (endHue - startHue) * (col / numCols);
			const color = new THREE.Color().setHSL(hue, 1, 0.5);
			const mat = getSSSMaterial(color);

			const boxMesh = new THREE.Mesh(geo, mat);
			boxMesh.castShadow = true;
			boxMesh.receiveShadow = true;
			boxMesh.position.set(size * 0.5, size * -0.5, 5);
			obj.add(boxMesh);

			const edges = new THREE.EdgesGeometry(geo, 0.1);
			const linesMat = new THREE.LineBasicMaterial({ color });
			const line = new THREE.LineSegments(edges, linesMat);
			boxMesh.add(line);

			const offsetZ = Math.random() * 3;
			const simplePos = new THREE.Vector3(pos.x, pos.y, 0);

			// Replace the animation control variables with a GSAP timeline
			let timeline = gsap.timeline({ paused: true });
			let velocity = 0;
			let isAnimating = false;
			let startTime = 0;

			const randomDelay = Math.random() * 0.5; // Random delay between 0 and 0.5 seconds

			const materials: BoxMaterials = {
				mainMaterial: mat,
				lineMaterial: linesMat
			};

			function update() {
				if (!sceneInitialized) return;

				simplePos.set(obj.position.x, obj.position.y, 0);
				const distance = simplePos.distanceTo(mousePos);
				const isInRange = distance < 11.0;

				if (debugObject.animationMode === 'gentle') {
					if (isInRange && isMouseMoving) {
						const intensity = (11.0 - distance) * 2 + offsetZ;
						timeline = handleGentleAnimation(obj, intensity, timeline);
					}
				} else if (debugObject.animationMode === 'accelerating') {
					if (isInRange && isMouseMoving && !isAnimating) {
						isAnimating = true;
						startTime = clock.getElapsedTime();
						velocity = 0;
						gsap.delayedCall(randomDelay, () => {
							if (isAnimating) velocity = ANIMATION_CONFIG.accelerating.initialVelocity;
						});
					}

					if (isAnimating) {
						const elapsed = clock.getElapsedTime() - startTime;
						velocity = handleAcceleratingAnimation(obj, materials, velocity, randomDelay, elapsed);
						if (elapsed >= ANIMATION_CONFIG.accelerating.totalDuration) {
							isAnimating = false;
							velocity = 0;
						}
					}
				}
			}

			// Make line material support transparency
			linesMat.transparent = true;

			obj.userData = {
				col,
				row,
				size,
				update
			};

			return obj;
		}

		const noise = new ImprovedNoise();
		function createComposition() {
			const arr: any = [];
			const group = new THREE.Group();
			group.userData.update = () => {
				for (let b of group.children) {
					b.userData.update();
				}
			};
			scene.add(group);
			const numCols = 48;
			const numRows = 48;
			const maxSize = 12;
			const noiseScale = 0.025;

			function placeBox({ size, col, row }: any) {
				let props = {
					size,
					col,
					row,
					numCols,
					numRows
				};
				let box = getBox(props);
				let canAdd = true;
				if (!isOutOfBounds({ box, numCols })) {
					for (let b of arr) {
						if (areOverlapping(box, b)) {
							canAdd = false;
							break;
						}
					}
					if (canAdd) {
						arr.push(box);
						group.add(box);
					}
				}
			}
			for (let i = 0, len = numCols * numRows; i < len; i += 1) {
				let col = Math.floor(Math.random() * numCols);
				let row = Math.floor(Math.random() * numRows);
				const ns = noise.noise(col * noiseScale, row * noiseScale, 0);
				const size = Math.floor(Math.abs(ns) * maxSize) + 1;
				placeBox({ col, row, size });
			}
			// fill in little gaps
			for (let i = 0, len = numCols * numRows; i < len; i += 1) {
				let col = i % numCols;
				let row = Math.floor(i / numCols);
				placeBox({ col, row, size: 1 });
			}
			return group;
		}

		const boxes = createComposition();
		scene.add(boxes);

		const raycaster = new THREE.Raycaster();
		const pointerPos = new THREE.Vector2(0, 0);
		const mousePos = new THREE.Vector3(0, 0, 0);

		window.addEventListener('mousemove', (event) => {
			pointerPos.set(
				(event.clientX / window.innerWidth) * 2 - 1,
				-((event.clientY - 56) / window.innerHeight) * 2 + 1
			);
		});

		// Lights
		const sunlight = getSunlight();
		scene.add(sunlight);
		const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.05);
		scene.add(hemiLight);

		const rightLight = new THREE.SpotLight(0x9900ff, 500.0);
		rightLight.position.set(38, 0, 0);
		rightLight.target.position.set(0, 0, -5);
		scene.add(rightLight);
		const helper = new THREE.SpotLightHelper(rightLight);
		// scene.add(helper);

		const leftLight = new THREE.SpotLight(0xffaa00, 500.0);
		leftLight.position.set(-38, 0, 0);
		leftLight.target.position.set(0, 0, -5);
		scene.add(leftLight);
		const helperL = new THREE.SpotLightHelper(leftLight);
		// scene.add(helperL);

		// Sizes
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

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 1000);
		camera.position.set(-0, 0, 50);
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
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		const mousePlane = new THREE.Mesh(
			new THREE.PlaneGeometry(48, 48, 48, 48),
			new THREE.MeshBasicMaterial({
				visible: false
			})
		);

		// mousePlane.position.z = 0.1;
		mousePlane.position.z = 10.1;
		mousePlane.position.y = 1.5;

		scene.add(mousePlane);

		function handleRayCast() {
			raycaster.setFromCamera(pointerPos, camera);
			const intersects = raycaster.intersectObjects([mousePlane], false);
			if (intersects.length > 0) {
				mousePos.copy(intersects[0].point);
			}
		}

		// Animate
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			boxes.userData.update();
			handleRayCast();

			// Update controls
			controls.update();

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
