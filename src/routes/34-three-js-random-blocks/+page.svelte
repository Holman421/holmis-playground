<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { gsap } from 'gsap';
	import { EffectComposer, RenderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
	import getLayer from './getLayer';
	import { onDestroy } from 'svelte';

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
		groupRotationSpeed: number; // Add this
		boxesRotationSpeed: number; // Add this
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
				zoomStartThreshold: 0.85, // Adjusted from 0.99 to start later
				lerpFactor: 0.05
			},
			title: {
				opacity: 0,
				lerpFactor: 0.05
			},
			isHoverEnabled: true, // Add this flag
			groupRotationSpeed: 0.002, // Add this
			boxesRotationSpeed: 0.0035 // Add this
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

		// Add this helper function after getSpherePoint
		function getNearestRightAngle(angle: number): number {
			// Convert to positive angle in range [0, 2π]
			angle = angle % (Math.PI * 2);
			if (angle < 0) angle += Math.PI * 2;

			// Find the nearest multiple of π/2 (90 degrees)
			const quarterTurns = Math.round(angle / (Math.PI / 2));

			// Return the nearest right angle
			return quarterTurns * (Math.PI / 2);
		}

		// Add this new function after getNearestRightAngle
		function getNearestRightAnglePlus180(angle: number): number {
			// Convert to positive angle in range [0, 2π]
			angle = angle % (Math.PI * 2);
			if (angle < 0) angle += Math.PI * 2;

			// Find the nearest multiple of π/2 (90 degrees)
			const quarterTurns = Math.round(angle / (Math.PI / 2));
			const nearestRightAngle = quarterTurns * (Math.PI / 2);

			// Add 180 degrees (π)
			return nearestRightAngle + Math.PI;
		}

		// Replace the old getGroupTargetRotation function with this improved version
		function getGroupTargetRotation(currentRotation: number): number {
			// Normalize angle to 0-2π range
			currentRotation = currentRotation % (Math.PI * 2);
			if (currentRotation < 0) currentRotation += Math.PI * 2;

			// Find the smallest rotation to reach the next 90-degree angle
			const quarterTurns = Math.round(currentRotation / (Math.PI / 2));
			const targetAngle = quarterTurns * (Math.PI / 2);

			// Calculate both clockwise and counterclockwise distances
			const clockwiseDist = (targetAngle - currentRotation + Math.PI * 2) % (Math.PI * 2);
			const counterclockwiseDist = (currentRotation - targetAngle + Math.PI * 2) % (Math.PI * 2);

			// Choose the shortest path
			return (
				currentRotation +
				(clockwiseDist < counterclockwiseDist ? clockwiseDist : -counterclockwiseDist)
			);
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
			isStillRotating: boolean; // Add this flag
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
				// Remove targetRotation from initial setup as it needs to be calculated at straightening time
				straightenDelay: Math.random() * debugObject.maxDelay,
				originalPosition: cube.position.clone(),
				originalRotation: initialRotation,
				centeringDelay: Math.random() * debugObject.maxDelay,
				update() {
					if (!debugObject.isAnimating && !debugObject.isResetting) return;

					if (debugObject.isResetting) {
						cube.position.lerp(this.originalPosition, debugObject.centeringLerpFactor);
						// Calculate nearest 90-degree angle for reset
						const targetAngle = getNearestRightAngle(cube.rotation[this.originalAxis]);
						cube.rotation[this.originalAxis] = THREE.MathUtils.lerp(
							cube.rotation[this.originalAxis],
							targetAngle,
							debugObject.lerpFactor
						);
					} else if (debugObject.isStraightening) {
						if (debugObject.elapsedStraightenTime > this.straightenDelay) {
							// Calculate target rotations with additional 180 degrees
							const targetX = getNearestRightAnglePlus180(cube.rotation.x);
							const targetY = getNearestRightAnglePlus180(cube.rotation.y);
							const targetZ = getNearestRightAnglePlus180(cube.rotation.z);

							// Smoothly interpolate to nearest 90-degree angles + 180
							cube.rotation.x = THREE.MathUtils.lerp(
								cube.rotation.x,
								targetX,
								debugObject.lerpFactor
							);
							cube.rotation.y = THREE.MathUtils.lerp(
								cube.rotation.y,
								targetY,
								debugObject.lerpFactor
							);
							cube.rotation.z = THREE.MathUtils.lerp(
								cube.rotation.z,
								targetZ,
								debugObject.lerpFactor
							);
						} else {
							cube.rotation[this.originalAxis] +=
								this.originalRate * (debugObject.boxesRotationSpeed / 0.002);
						}
					} else if (debugObject.isCentering) {
						if (debugObject.elapsedCenteringTime > this.centeringDelay) {
							cube.position.lerp(debugObject.centerPosition, debugObject.centeringLerpFactor);
						}
					} else {
						cube.rotation[this.originalAxis] +=
							this.originalRate * (debugObject.boxesRotationSpeed / 0.002);
					}
				},
				isStillRotating: true // Initialize the flag
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
		boxFolder.add(debugObject, 'groupRotationSpeed', 0, 0.01, 0.0001).name('Group Rotation');
		boxFolder.add(debugObject, 'boxesRotationSpeed', 0, 0.05, 0.0001).name('Boxes Rotation');
		boxFolder
			.add(
				{
					straightenBoxes: () => {
						debugObject.isHoverEnabled = false;
						if (hoveredBox) {
							(hoveredBox.material as THREE.MeshBasicMaterial).color.setHex(debugObject.boxColor);
							hoveredBox = null;
						}

						const timeline = gsap.timeline();

						// First straighten all boxes
						const straightenDuration = 1.5;
						boxGroup.children.forEach((box) => {
							// Calculate nearest right angles based on current rotation
							const targetX = getNearestRightAnglePlus180(box.rotation.x);
							const targetY = getNearestRightAnglePlus180(box.rotation.y);
							const targetZ = getNearestRightAnglePlus180(box.rotation.z);

							const straightenDelay = Math.random() * debugObject.maxDelay;
							const centeringDelay = Math.random() * debugObject.maxDelay;

							// Straighten phase
							timeline.to(
								box.rotation,
								{
									x: targetX,
									y: targetY,
									z: targetZ,
									duration: straightenDuration,
									delay: straightenDelay,
									ease: 'power2.inOut',
									onComplete: () => {
										box.userData.isStillRotating = false;
									}
								},
								0
							);

							box.userData.isStillRotating = true;
						});

						// Fade in central cube during straightening phase
						timeline.to(
							[centralCubeMaterial, centralCubeLines.material],
							{
								opacity: 1,
								duration: straightenDuration,
								ease: 'power2.inOut'
							},
							0
						);

						// After straightening, center everything
						timeline.call(
							() => {
								debugObject.isAnimating = false;
							},
							`>${straightenDuration + debugObject.maxDelay}`
						);

						// Start centering phase - all at same position marker but with individual delays
						const centeringLabel = 'centering';
						timeline.addLabel(centeringLabel, '>');

						// Center all boxes with individual delays
						boxGroup.children.forEach((box) => {
							const centeringDelay = Math.random() * debugObject.maxDelay;
							timeline.to(
								box.position,
								{
									x: 0,
									y: 0,
									z: 0,
									duration: 1.5,
									delay: centeringDelay,
									ease: 'power2.inOut'
								},
								centeringLabel // All boxes start from same position in timeline
							);
						});

						// Group rotation centering
						timeline.to(
							boxGroup.rotation,
							{
								y: getGroupTargetRotation(boxGroup.userData.totalRotation),
								duration: 1.5,
								ease: 'power2.inOut'
							},
							centeringLabel // Align with box movements
						);

						// Camera zoom
						timeline.to(
							camera.position,
							{
								z: debugObject.camera.targetZ,
								duration: 2,
								ease: 'power2.inOut'
							},
							`${centeringLabel}+=0.5`
						);

						// Show title
						timeline.to(
							'.title',
							{
								opacity: 1,
								duration: 1,
								ease: 'power2.inOut'
							},
							`${centeringLabel}+=2`
						);
					}
				},
				'straightenBoxes'
			)
			.name('Straighten & Center');
		boxFolder
			.add(
				{
					resetScene: () => {
						debugObject.isHoverEnabled = true;

						const timeline = gsap.timeline();

						// Reset title
						timeline.to(
							'.title',
							{
								opacity: 0,
								duration: 0.5,
								ease: 'power2.inOut'
							},
							0
						);

						// Reset camera
						timeline.to(
							camera.position,
							{
								z: debugObject.camera.initialZ,
								duration: 1.5,
								ease: 'power2.inOut'
							},
							0
						);

						// Reset group rotation
						timeline.to(
							boxGroup.rotation,
							{
								y: 0,
								duration: 1,
								ease: 'power2.inOut',
								onComplete: () => {
									boxGroup.userData.totalRotation = 0;
								}
							},
							0
						);

						// Reset central cube
						timeline.to(
							[centralCubeMaterial, centralCubeLines.material],
							{
								opacity: 0,
								duration: 1,
								ease: 'power2.inOut'
							},
							0
						);

						// Reset all boxes
						boxGroup.children.forEach((box) => {
							const userData = box.userData;
							timeline.to(
								box.position,
								{
									x: userData.originalPosition.x,
									y: userData.originalPosition.y,
									z: userData.originalPosition.z,
									duration: 1.5,
									ease: 'power2.inOut'
								},
								0
							);

							const resetRotation = {
								[userData.originalAxis]: userData.originalRotation
							};
							timeline.to(
								box.rotation,
								{
									...resetRotation,
									duration: 1.5,
									ease: 'power2.inOut'
								},
								0
							);
						});

						// Re-enable animations when complete
						timeline.call(() => {
							debugObject.isAnimating = true;
						});
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
		boxGroup.userData = {
			totalRotation: 0,
			update: () => {
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
					boxGroup.rotation.y += debugObject.groupRotationSpeed;
					boxGroup.userData.totalRotation += debugObject.groupRotationSpeed;
				}
				boxGroup.children.forEach((box) => {
					box.userData.update();
				});
			}
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

		let animationFrameId: number;
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

			if (debugObject.isAnimating) {
				boxGroup.rotation.y += debugObject.groupRotationSpeed;
				boxGroup.userData.totalRotation += debugObject.groupRotationSpeed;
				boxGroup.children.forEach((box) => {
					const userData = box.userData;
					if (userData.isStillRotating) {
						box.rotation[userData.originalAxis] +=
							userData.originalRate * (debugObject.boxesRotationSpeed / 0.002);
					}
				});
			}

			controls.update();
			composer.render();
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		onDestroy(() => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		});
	});
</script>

<div>
	<canvas class="webgl"></canvas>
	<h1 class="title">Ales Holman</h1>
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
