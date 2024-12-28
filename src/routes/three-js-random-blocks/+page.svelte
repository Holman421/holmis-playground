<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import {
		DRACOLoader,
		EffectComposer,
		GLTFLoader,
		RenderPass,
		RGBELoader,
		UnrealBloomPass
	} from 'three/examples/jsm/Addons.js';
	import getLayer from './getLayer';

	interface DebugObject {
		numBoxes: number;
		boxColor: number;
		hoverColor: number;
		rotationSpeed: number;
		isStraightening: boolean;
		lerpFactor: number;
		maxDelay: number;
		elapsedStraightenTime: number;
		bloom: {
			strength: number;
			radius: number;
			threshold: number;
		};
		fog: {
			color: number;
			density: number;
		};
		isCentering: boolean;
		centeringLerpFactor: number;
		elapsedCenteringTime: number;
		centerPosition: THREE.Vector3;
		isResetting: boolean;
		isAnimating: boolean;
		groupRotation: number;
		centralCube: {
			scale: number;
			opacity: number;
			lerpFactor: number;
		};
		camera: {
			initialZ: number;
			targetZ: number;
			zoomStartThreshold: number;
			lerpFactor: number;
		};
		title: {
			opacity: number;
			lerpFactor: number;
		};
		isHoverEnabled: boolean;
	}

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: DebugObject = {
			numBoxes: 150,
			boxColor: 0x808080,
			hoverColor: 0x4362b6, // Fix color format (remove quotes)
			rotationSpeed: 0.002,
			isStraightening: false,
			lerpFactor: 0.05,
			maxDelay: 1.0, // Maximum delay in seconds
			elapsedStraightenTime: 0,
			bloom: {
				strength: 0.75,
				radius: 0,
				threshold: 0
			},
			fog: {
				color: 0x0033bb,
				density: 0.1
			},
			isCentering: false,
			centeringLerpFactor: 0.05,
			elapsedCenteringTime: 0,
			centerPosition: new THREE.Vector3(0, 0, 0),
			isResetting: false,
			isAnimating: true,
			groupRotation: 0.002,
			centralCube: {
				scale: 2.0,
				opacity: 0,
				lerpFactor: 0.05
			},
			camera: {
				initialZ: 13,
				targetZ: 1,
				zoomStartThreshold: 0.99, // When to start camera zoom (80% through centering)
				lerpFactor: 0.05
			},
			title: {
				opacity: 0,
				lerpFactor: 0.05
			},
			isHoverEnabled: true // Add this flag
		};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		const bgCol = debugObject.fog.color;
		// Scene
		const scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(debugObject.fog.color, debugObject.fog.density);

		// GUI
		const bloomFolder = gui.addFolder('Bloom');
		bloomFolder.add(debugObject.bloom, 'strength', 0, 2, 0.01).onChange((value: number) => {
			bloomPass.strength = value;
		});
		bloomFolder.add(debugObject.bloom, 'radius', 0, 2, 0.01).onChange((value: number) => {
			bloomPass.radius = value;
		});
		bloomFolder.add(debugObject.bloom, 'threshold', 0, 1, 0.01).onChange((value: number) => {
			bloomPass.threshold = value;
		});

		const fogFolder = gui.addFolder('Fog');
		fogFolder.addColor(debugObject.fog, 'color').onChange((value: number) => {
			scene.fog?.color.set(value);
		});
		fogFolder.add(debugObject.fog, 'density', 0, 0.5, 0.01).onChange((value: number) => {
			(scene.fog as any).density = value;
		});

		// Lights

		function getSpherePoint(radius: number) {
			radius += Math.random() * 2.5 - 1.5;
			const u = Math.random();
			const v = Math.random();
			const theta = 2 * Math.PI * u;
			const phi = Math.acos(2 * v - 1);
			const x = radius * Math.sin(phi) * Math.cos(theta);
			const y = radius * Math.sin(phi) * Math.sin(theta);
			const z = radius * Math.cos(phi);
			return new THREE.Vector3(x, y, z);
		}

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
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
		camera.position.z = debugObject.camera.initialZ;
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.setSize(sizes.width, sizes.height);

		// Postprocessing
		const composer = new EffectComposer(renderer);
		const renderScene = new RenderPass(scene, camera);
		const bloomPass = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), 1.05, 0, 0);
		composer.addPass(renderScene);
		composer.addPass(bloomPass);

		// Cube
		const geometry = new THREE.BoxGeometry();

		// Add central cube
		const centralCubeMaterial = new THREE.MeshBasicMaterial({
			color: debugObject.boxColor,
			transparent: true,
			opacity: 0
		});
		const centralCube = new THREE.Mesh(geometry, centralCubeMaterial);
		centralCube.scale.setScalar(debugObject.centralCube.scale);
		const centralCubeEdges = new THREE.EdgesGeometry(geometry);
		const centralCubeLines = new THREE.LineSegments(
			centralCubeEdges,
			new THREE.LineBasicMaterial({
				color: 0xffffff,
				transparent: true,
				opacity: 0
			})
		);
		centralCubeLines.scale.setScalar(1.01);
		centralCube.add(centralCubeLines);
		scene.add(centralCube);

		interface CubeUserData {
			originalAxis: 'x' | 'y' | 'z';
			originalRate: number;
			targetRotation: THREE.Euler;
			straightenDelay: number;
			originalPosition: THREE.Vector3;
			originalRotation: number;
			centeringDelay: number;
			update: () => void;
		}

		function getBox() {
			const material = new THREE.MeshBasicMaterial({
				color: debugObject.boxColor
			});
			const cube = new THREE.Mesh(geometry, material);
			cube.position.copy(getSpherePoint(6));
			cube.rotation.x = Math.random() * Math.PI;
			cube.rotation.y = Math.random() * Math.PI;
			cube.rotation.z = Math.random() * Math.PI;

			const upperScale = 1.5;
			cube.scale.set(
				0.2 + Math.random() * upperScale,
				0.2 + Math.random() * upperScale,
				0.2 + Math.random() * upperScale
			);

			const edges = new THREE.EdgesGeometry(geometry);
			const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
			lines.scale.setScalar(1.01);
			cube.add(lines);

			const axisProbability = Math.random() * 3;
			const axis = axisProbability < 1 ? 'x' : axisProbability < 2 ? 'y' : 'z';
			const rate = Math.random() * 0.002 + 0.005;
			const initialRotation = Math.random() * Math.PI;
			cube.rotation[axis] = initialRotation;

			cube.userData = {
				originalAxis: axis as 'x' | 'y' | 'z',
				originalRate: rate,
				targetRotation: new THREE.Euler(0, 0, 0),
				straightenDelay: Math.random() * debugObject.maxDelay,
				originalPosition: cube.position.clone(),
				originalRotation: initialRotation,
				centeringDelay: Math.random() * debugObject.maxDelay,
				update() {
					if (!debugObject.isAnimating && !debugObject.isResetting) return;

					if (debugObject.isResetting) {
						cube.position.lerp(this.originalPosition, debugObject.centeringLerpFactor);
						cube.rotation[this.originalAxis] = THREE.MathUtils.lerp(
							cube.rotation[this.originalAxis],
							this.originalRotation,
							debugObject.lerpFactor
						);
					} else if (debugObject.isStraightening) {
						// Only start straightening after delay
						if (debugObject.elapsedStraightenTime > this.straightenDelay) {
							cube.rotation.x = THREE.MathUtils.lerp(
								cube.rotation.x,
								this.targetRotation.x,
								debugObject.lerpFactor
							);
							cube.rotation.y = THREE.MathUtils.lerp(
								cube.rotation.y,
								this.targetRotation.y,
								debugObject.lerpFactor
							);
							cube.rotation.z = THREE.MathUtils.lerp(
								cube.rotation.z,
								this.targetRotation.z,
								debugObject.lerpFactor
							);
						} else {
							cube.rotation[this.originalAxis] +=
								this.originalRate * (debugObject.rotationSpeed / 0.002);
						}
					} else if (debugObject.isCentering) {
						if (debugObject.elapsedCenteringTime > this.centeringDelay) {
							cube.position.lerp(debugObject.centerPosition, debugObject.centeringLerpFactor);
						}
					} else {
						cube.rotation[this.originalAxis] +=
							this.originalRate * (debugObject.rotationSpeed / 0.002);
					}
				}
			} as CubeUserData;
			return cube;
		}

		const boxFolder = gui.addFolder('Boxes');
		boxFolder.addColor(debugObject, 'boxColor').onChange(() => {
			boxGroup.children.forEach((box) => {
				if (box !== hoveredBox) {
					(box as THREE.Mesh).material = new THREE.MeshBasicMaterial({
						color: debugObject.boxColor
					});
				}
			});
		});
		boxFolder.addColor(debugObject, 'hoverColor').name('Hover Color');
		boxFolder.add(debugObject, 'rotationSpeed', 0, 0.01, 0.0001);
		boxFolder.add(debugObject, 'numBoxes', 10, 300, 1).onChange((value: number) => {
			while (boxGroup.children.length > 0) {
				boxGroup.remove(boxGroup.children[0]);
			}
			for (let i = 0; i < value; i++) {
				const box = getBox();
				boxGroup.add(box);
			}
		});
		boxFolder.add(debugObject, 'lerpFactor', 0.01, 0.1, 0.01).name('Straighten Speed');
		boxFolder.add(debugObject, 'maxDelay', 0, 2, 0.1).name('Max Delay');
		boxFolder.add(debugObject, 'centeringLerpFactor', 0.01, 0.1, 0.01).name('Center Speed');
		boxFolder
			.add(
				{
					straightenBoxes: () => {
						debugObject.isStraightening = true;
						debugObject.elapsedStraightenTime = 0;
						debugObject.isHoverEnabled = false; // Disable hover effect
						if (hoveredBox) {
							(hoveredBox.material as THREE.MeshBasicMaterial).color.setHex(debugObject.boxColor);
							hoveredBox = null;
						}

						// Check if boxes are close enough to target rotation
						const checkComplete = () => {
							debugObject.elapsedStraightenTime += 0.016; // Approximate for 60fps
							let allStraight = true;

							// Update central cube opacity
							debugObject.centralCube.opacity = THREE.MathUtils.lerp(
								debugObject.centralCube.opacity,
								1,
								debugObject.centralCube.lerpFactor
							);
							centralCubeMaterial.opacity = debugObject.centralCube.opacity;
							(centralCubeLines.material as THREE.LineBasicMaterial).opacity =
								debugObject.centralCube.opacity;

							boxGroup.children.forEach((box) => {
								const rot = box.rotation;
								const target = box.userData.targetRotation;
								if (
									Math.abs(rot.x - target.x) > 0.01 ||
									Math.abs(rot.y - target.y) > 0.01 ||
									Math.abs(rot.z - target.z) > 0.01
								) {
									allStraight = false;
								}
							});
							if (allStraight && debugObject.elapsedStraightenTime > debugObject.maxDelay) {
								debugObject.isStraightening = false;
								// Start centering animation
								debugObject.isCentering = true;
								debugObject.elapsedCenteringTime = 0;
								checkCenteringComplete();
							} else {
								requestAnimationFrame(checkComplete);
							}
						};

						const checkCenteringComplete = () => {
							debugObject.elapsedCenteringTime += 0.016;
							let allCentered = true;
							boxGroup.children.forEach((box) => {
								if (box.position.distanceTo(debugObject.centerPosition) > 0.01) {
									allCentered = false;
								}
							});
							const groupRotationComplete = Math.abs(boxGroup.rotation.y) < 0.01;

							// Calculate progress through centering phase
							const centeringProgress = debugObject.elapsedCenteringTime / debugObject.maxDelay;

							// Start camera zoom when reaching threshold
							if (centeringProgress > debugObject.camera.zoomStartThreshold) {
								camera.position.z = THREE.MathUtils.lerp(
									camera.position.z,
									debugObject.camera.targetZ,
									debugObject.camera.lerpFactor
								);
							}

							if (
								allCentered &&
								groupRotationComplete &&
								debugObject.elapsedCenteringTime > debugObject.maxDelay
							) {
								debugObject.isCentering = false;
								debugObject.isAnimating = false;
								// Start title animation
								showTitle();
							} else {
								requestAnimationFrame(checkCenteringComplete);
							}
						};

						checkComplete();
					}
				},
				'straightenBoxes'
			)
			.name('Straighten & Center');
		boxFolder
			.add(
				{
					resetScene: () => {
						debugObject.isResetting = true;
						debugObject.isStraightening = false;
						debugObject.isCentering = false;
						debugObject.elapsedStraightenTime = 0;
						debugObject.elapsedCenteringTime = 0;
						debugObject.isHoverEnabled = true; // Re-enable hover effect
						debugObject.title.opacity = 0;
						const titleElement = document.querySelector('.title') as HTMLElement;
						titleElement.style.opacity = '0';

						const checkResetComplete = () => {
							let allReset = true;
							boxGroup.children.forEach((box) => {
								const pos = box.position;
								const originalPos = box.userData.originalPosition;
								const rot = box.rotation[box.userData.originalAxis as keyof THREE.Euler];
								const originalRot = box.userData.originalRotation;

								if (
									pos.distanceTo(originalPos) > 0.01 ||
									Math.abs((rot as any) - originalRot) > 0.01
								) {
									allReset = false;
								}
							});

							// Add camera position check
							const cameraReset = Math.abs(camera.position.z - debugObject.camera.initialZ) < 0.01;
							const groupRotationComplete = Math.abs(boxGroup.rotation.y % (Math.PI * 2)) < 0.01;

							// Lerp camera position
							camera.position.z = THREE.MathUtils.lerp(
								camera.position.z,
								debugObject.camera.initialZ,
								debugObject.camera.lerpFactor
							);

							if (allReset && groupRotationComplete && cameraReset) {
								debugObject.isResetting = false;
								debugObject.isAnimating = true;
								boxGroup.rotation.y = 0;
								debugObject.centralCube.opacity = 0;
								centralCubeMaterial.opacity = 0;
								(centralCubeLines.material as THREE.LineBasicMaterial).opacity = 0;
								camera.position.z = debugObject.camera.initialZ; // Set final position exactly
							} else {
								requestAnimationFrame(checkResetComplete);
							}
						};

						checkResetComplete();
					}
				},
				'resetScene'
			)
			.name('Reset Scene');

		const centralCubeFolder = gui.addFolder('Central Cube');
		centralCubeFolder
			.add(debugObject.centralCube, 'scale', 1.5, 4, 0.1)
			.onChange((value: number) => {
				centralCube.scale.setScalar(value);
				centralCubeLines.scale.setScalar(value * 1.01);
			});
		centralCubeFolder
			.add(debugObject.centralCube, 'lerpFactor', 0.01, 0.1, 0.01)
			.name('Fade Speed');

		const cameraFolder = gui.addFolder('Camera');
		cameraFolder.add(debugObject.camera, 'targetZ', 0.5, 5, 0.1).name('Zoom Target');
		cameraFolder.add(debugObject.camera, 'zoomStartThreshold', 0, 1, 0.05).name('Zoom Timing');
		cameraFolder.add(debugObject.camera, 'lerpFactor', 0.01, 0.1, 0.01).name('Zoom Speed');

		const numBoxes = debugObject.numBoxes;

		const boxGroup = new THREE.Group();
		boxGroup.userData.update = () => {
			if (debugObject.isResetting) {
				boxGroup.rotation.y = THREE.MathUtils.lerp(
					boxGroup.rotation.y,
					0,
					debugObject.centeringLerpFactor
				);
			} else if (debugObject.isCentering) {
				boxGroup.rotation.y = THREE.MathUtils.lerp(
					boxGroup.rotation.y,
					0,
					debugObject.centeringLerpFactor
				);
			} else if (debugObject.isAnimating) {
				boxGroup.rotation.y += debugObject.groupRotation;
			}
			boxGroup.children.forEach((box) => {
				box.userData.update();
			});
		};
		scene.add(boxGroup);

		for (let i = 0; i < numBoxes; i++) {
			const box = getBox();
			boxGroup.add(box);
		}

		// Sprites BG
		const gradientBackground = getLayer({
			hue: 0.5,
			numSprites: 8,
			opacity: 0.2,
			radius: 10,
			size: 24,
			z: -15.5
		});
		gradientBackground.scale.setScalar(2.0);
		// scene.add(gradientBackground);

		function showTitle() {
			const titleElement = document.querySelector('.title') as HTMLElement;
			const animateTitle = () => {
				debugObject.title.opacity = THREE.MathUtils.lerp(
					debugObject.title.opacity,
					1,
					debugObject.title.lerpFactor
				);
				titleElement.style.opacity = debugObject.title.opacity.toString();

				if (debugObject.title.opacity < 0.99) {
					requestAnimationFrame(animateTitle);
				}
			};
			animateTitle();
		}

		// Add after scene setup
		const raycaster = new THREE.Raycaster();
		raycaster.params.Line.threshold = 0.1; // Improve line detection
		raycaster.params.Points.threshold = 0.1; // Improve point detection
		const mouse = new THREE.Vector2();
		let hoveredBox: THREE.Mesh | null = null; // Add this declaration

		canvas.addEventListener('mousemove', (event: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		});

		// Animate
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update raycaster with more precise intersection testing
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(boxGroup.children, true); // true for recursive

			if (debugObject.isHoverEnabled) {
				if (intersects.length > 0) {
					// Get the root mesh (parent) of the intersected object
					let targetObject = intersects[0].object;
					while (targetObject.parent && targetObject.parent !== boxGroup) {
						targetObject = targetObject.parent;
					}

					if (hoveredBox !== targetObject) {
						if (hoveredBox) {
							(hoveredBox.material as THREE.MeshBasicMaterial).color.setHex(debugObject.boxColor);
						}
						hoveredBox = targetObject as THREE.Mesh;
						(hoveredBox.material as THREE.MeshBasicMaterial).color.setHex(debugObject.hoverColor);
					}
				} else if (hoveredBox) {
					(hoveredBox.material as THREE.MeshBasicMaterial).color.setHex(debugObject.boxColor);
					hoveredBox = null;
				}
			}

			boxGroup.userData.update();
			controls.update();
			composer.render();
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
	<h1 class="title">Wonder Makers</h1>
</div>

<style>
	.title {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: black;
		font-size: 3rem;
		font-weight: bold;
		opacity: 0;
		pointer-events: none;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		z-index: 1000;
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
		font-family: 'Arial', sans-serif;
	}

	canvas.webgl {
		pointer-events: auto;
	}
</style>
