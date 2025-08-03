import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/Tweakpane/utils';
import { abs, Discard, float, Fn, If, length, positionWorld, smoothstep, uniform, uv, vec2, vec3, attribute } from 'three/tsl';
import { gsap } from 'gsap';
import { createRecordingControls, RecordingControls } from '$lib/utils/recordingControls';

interface SketchOptions {
	dom: HTMLElement;
}

export default class Sketch {
	scene: THREE.Scene;
	container: HTMLElement;
	width: number;
	height: number;
	renderer: THREE.WebGPURenderer;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	isPlaying: boolean;
	resizeListener: boolean = false;
	autoRotate: boolean = false;
	autoRotateSpeed: number = 1.0;
	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	instancedMesh!: THREE.InstancedMesh;
	originalPositions: THREE.Vector3[] = [];
	originalRotations: THREE.Euler[] = [];
	instanceCount: number = 0;
	shaderEnabledArray: Float32Array | null = null;
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	recordingControls!: RecordingControls;
	pointLight2!: THREE.PointLight;
	uniforms: {
		circleSize: any;
	} = {
			circleSize: null,
		};

	// Animation timing constants
	animationSettings = {
		layerDelay: 0.9,        // Delay between layers
		instanceDelay: 0.85,    // Random delay within each layer
		duration: 4.0,          // Animation duration
		useLayeredAnimation: true // Toggle layered vs simultaneous animation
	};

	// Grid settings
	gridSettings = {
		gridSize: 12,     // X and Z dimensions (horizontal) - doubled from 6 to 12
		verticalLayers: 24 // Y dimension (vertical layers) - doubled from 12 to 24
	};

	constructor(options: SketchOptions) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(new THREE.Color(0x000000), 1);
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(
			70,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(8.75, 3.85, 12.45);


		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.isPlaying = true;
		this.setupLights();

		const circleSizeUniform = uniform(0.0);

		this.uniforms = {
			circleSize: circleSizeUniform,
		}

		// Create a configurable grid of cubes using instanced mesh
		const gridSize = this.gridSettings.gridSize;
		const verticalLayers = this.gridSettings.verticalLayers;
		const spacing = 0.5; // Halved from 1.0 to 0.5
		const horizontalOffset = ((gridSize - 1) * spacing) / 2;
		// Keep top position fixed - calculate vertical offset from top
		const topY = ((gridSize - 1) * spacing) / 2; // Original top position for 6x6x6

		// Calculate total instance count - create instances for ALL positions
		this.instanceCount = gridSize * verticalLayers * gridSize;

		// Initialize shader enabled array - determine which cubes should have shader applied
		this.shaderEnabledArray = new Float32Array(this.instanceCount);
		this.calculateShaderEnabledInstances();

		this.createInstancedMesh(circleSizeUniform);

		// Set up positions for each instance
		let instanceIndex = 0;
		let movedAwayCount = 0; // Track how many cubes we move away
		let debugInfo = []; // Track coordinate ranges for debugging

		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j < verticalLayers; j++) {
				for (let k = 0; k < gridSize; k++) {
					const x = i * spacing - horizontalOffset;
					const y = topY - (j * spacing); // Start from top and go down
					const z = k * spacing - horizontalOffset;

					// Debug: collect coordinate info for first few iterations
					if (debugInfo.length < 5) {
						debugInfo.push({ i, j, k, x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2) });
					}

					// Skip cubes that would interfere with middleBox
					// middleBox is at (0, -3, 0) with dimensions 1x12x1
					// Check if this cube is at the center line (x≈0, z≈0) and within middleBox Y range
					const isCenterLine = Math.abs(x) < 0.3; // Slightly larger tolerance
					const isCenterLineZ = Math.abs(z) < 0.3; // Check Z separately
					const isInMiddleBoxRange = y >= -9 && y <= 3; // middleBox Y range

					const matrix = new THREE.Matrix4();

					if (isCenterLine && isCenterLineZ && isInMiddleBoxRange) {
						// Move these cubes far away instead of skipping them
						matrix.setPosition(1000, 1000, 1000); // Position them far away
						this.originalPositions.push(new THREE.Vector3(1000, 1000, 1000));
						movedAwayCount++;
					} else {
						matrix.setPosition(x, y, z);
						this.originalPositions.push(new THREE.Vector3(x, y, z));
					}

					this.instancedMesh.setMatrixAt(instanceIndex, matrix);
					this.originalRotations.push(new THREE.Euler(0, 0, 0));
					instanceIndex++;
				}
			}
		}

		console.log(`Grid coordinates range:`, debugInfo);
		console.log(`horizontalOffset: ${horizontalOffset}, topY: ${topY}`);
		console.log(`Moved ${movedAwayCount} cubes away from middleBox interference zone`);

		this.instancedMesh.instanceMatrix.needsUpdate = true;
		this.addDebugPlane();
		this.resize();
		this.setUpSettings();
		this.init();
	}

	async init() {
		await this.renderer.init();

		// Initialize recording controls after renderer is ready
		// this.recordingControls = createRecordingControls({
		// 	canvas: this.renderer.domElement,
		// 	container: this.container,
		// 	position: 'top-left'
		// });

		this.render();
	}

	calculateShaderEnabledInstances() {
		const gridSize = this.gridSettings.gridSize;

		// First pass: Calculate the original pyramid pattern without randomness
		const originalPattern: boolean[][][] = [];
		for (let i = 0; i < gridSize; i++) {
			originalPattern[i] = [];
			for (let j = 0; j < this.gridSettings.verticalLayers; j++) {
				originalPattern[i][j] = [];
				for (let k = 0; k < gridSize; k++) {
					const spacing = 0.5;
					const horizontalOffset = ((gridSize - 1) * spacing) / 2;
					const topY = ((gridSize - 1) * spacing) / 2;

					const x = i * spacing - horizontalOffset;
					const y = topY - (j * spacing);
					const z = k * spacing - horizontalOffset;

					// Check if this cube is in the skipped (moved far away) area
					const isCenterLine = Math.abs(x) < 0.3;
					const isCenterLineZ = Math.abs(z) < 0.3;
					const isInMiddleBoxRange = y >= -9 && y <= 3;

					if (isCenterLine && isCenterLineZ && isInMiddleBoxRange) {
						originalPattern[i][j][k] = false;
					} else {
						// Calculate which Y layer this cube is in (0 = top layer)
						const yLayer = Math.round((topY - y) / 0.5);

						// Use distance from edge rather than center to create rectangular rings
						const edgeDistanceX = Math.min(Math.abs(x - (-horizontalOffset)), Math.abs(x - horizontalOffset));
						const edgeDistanceZ = Math.min(Math.abs(z - (-horizontalOffset)), Math.abs(z - horizontalOffset));
						const edgeDistance = Math.min(edgeDistanceX, edgeDistanceZ);
						const horizontalLayer = Math.floor(edgeDistance / 0.5);

						// Use inverted pyramid logic: each Y layer down includes one more horizontal layer
						const maxAffectedHorizontalLayer = yLayer;
						originalPattern[i][j][k] = horizontalLayer <= maxAffectedHorizontalLayer;
					}
				}
			}
		}

		// Helper function to check if a cube has an affected neighbor in the original pattern
		const hasAffectedNeighbor = (i: number, j: number, k: number): boolean => {
			const neighbors = [
				[i - 1, j, k], [i + 1, j, k],  // X neighbors
				[i, j - 1, k], [i, j + 1, k],  // Y neighbors
				[i, j, k - 1], [i, j, k + 1]   // Z neighbors
			];

			for (const [ni, nj, nk] of neighbors) {
				if (ni >= 0 && ni < gridSize &&
					nj >= 0 && nj < this.gridSettings.verticalLayers &&
					nk >= 0 && nk < gridSize) {
					if (originalPattern[ni][nj][nk]) {
						return true;
					}
				}
			}
			return false;
		};

		// Helper function to check if a cube has an unaffected neighbor in the original pattern
		const hasUnaffectedNeighbor = (i: number, j: number, k: number): boolean => {
			const neighbors = [
				[i - 1, j, k], [i + 1, j, k],  // X neighbors
				[i, j - 1, k], [i, j + 1, k],  // Y neighbors
				[i, j, k - 1], [i, j, k + 1]   // Z neighbors
			];

			for (const [ni, nj, nk] of neighbors) {
				if (ni >= 0 && ni < gridSize &&
					nj >= 0 && nj < this.gridSettings.verticalLayers &&
					nk >= 0 && nk < gridSize) {
					if (!originalPattern[ni][nj][nk]) {
						return true;
					}
				}
			}
			return false;
		};

		// Second pass: Apply neighborhood-based randomness
		const neighborhoodRandomness = 0.5; // Increased to 50% chance for neighborhood cubes to flip
		let instanceIndex = 0;

		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j < this.gridSettings.verticalLayers; j++) {
				for (let k = 0; k < gridSize; k++) {
					let shouldApplyShader = originalPattern[i][j][k];

					// Skip randomness for cubes that are in the center area (moved far away)
					const spacing = 0.5;
					const horizontalOffset = ((gridSize - 1) * spacing) / 2;
					const topY = ((gridSize - 1) * spacing) / 2;
					const x = i * spacing - horizontalOffset;
					const y = topY - (j * spacing);
					const z = k * spacing - horizontalOffset;

					const isCenterLine = Math.abs(x) < 0.3;
					const isCenterLineZ = Math.abs(z) < 0.3;
					const isInMiddleBoxRange = y >= -9 && y <= 3;

					// Skip randomness for center area cubes
					if (isCenterLine && isCenterLineZ && isInMiddleBoxRange) {
						this.shaderEnabledArray![instanceIndex] = shouldApplyShader ? 1.0 : 0.0;
						instanceIndex++;
						continue;
					}

					// Only apply randomness to cubes that are part of or close to the pyramid
					// The pyramid only exists in the upper part, so limit Y range
					const yLayer = Math.round((topY - y) / 0.5);
					const maxPyramidLayer = Math.floor(gridSize / 2); // Pyramid doesn't extend to bottom

					// Skip randomness for cubes that are too far below the pyramid
					if (yLayer > maxPyramidLayer + 2) { // +2 for some tolerance
						this.shaderEnabledArray![instanceIndex] = shouldApplyShader ? 1.0 : 0.0;
						instanceIndex++;
						continue;
					}

					// Apply randomness only to cubes that are neighbors to the opposite state
					// and are within the pyramid influence area
					const randomValue = Math.random();

					if (!shouldApplyShader && hasAffectedNeighbor(i, j, k) && randomValue < neighborhoodRandomness) {
						// Unaffected cube with affected neighbors - chance to become affected
						shouldApplyShader = true;
					} else if (shouldApplyShader && hasUnaffectedNeighbor(i, j, k) && randomValue < neighborhoodRandomness) {
						// Affected cube with unaffected neighbors - chance to become unaffected
						shouldApplyShader = false;
					}

					this.shaderEnabledArray![instanceIndex] = shouldApplyShader ? 1.0 : 0.0;
					instanceIndex++;
				}
			}
		}
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 40.0);
		this.scene.add(this.ambientLight);

		this.pointLight = new THREE.PointLight(0xffffff, 100);
		this.pointLight.position.set(4.6, -0.0, 6.4);
		this.scene.add(this.pointLight);

		this.pointLight2 = new THREE.PointLight(0xffffff, 100);
		this.pointLight2.position.set(-5.6, 1.0, -5.2);
		this.scene.add(this.pointLight2);
	}

	resize() {
		if (!this.resizeListener) {
			window.addEventListener('resize', this.resize.bind(this));
			this.resizeListener = true;
		}
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	createInstancedMesh(circleSizeUniform: any) {
		this.geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5); // Halved from 1,1,1 to 0.5,0.5,0.5
		this.material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide,
		});

		const shaderFunction = Fn(() => {
			// Get instance-specific shader enabled value
			const shaderEnabled = attribute('shaderEnabled', 'float');

			// 3D Sphere SDF Part
			const worldPos = positionWorld;
			const sphereCenter = vec3(0.0, 0.0, 0.0);
			const sphereRadius = circleSizeUniform;
			const sphereSdf = length(worldPos.sub(sphereCenter)).sub(sphereRadius);
			const sphereFinal = smoothstep(-5.0, 0.0, sphereSdf).oneMinus();

			// Local position in object space
			const localUv = uv();
			const centeredLocalUv = localUv.sub(vec2(0.5, 0.5));
			const linesWidth = 0.05;
			const verticalLines = smoothstep(float(0.5).sub(linesWidth), 0.5, abs(centeredLocalUv.x));
			const horizontalLines = smoothstep(float(0.5).sub(linesWidth), 0.5, abs(centeredLocalUv.y));
			const verticalLinesSdf = verticalLines.add(horizontalLines)

			// light blue
			const lineColor = vec3(0.16, 0.77, 1.0);
			const finalSdf = verticalLinesSdf.mul(lineColor).mul(sphereFinal);

			// Base color for non-shader cubes (pure black)
			const baseColor = vec3(0.0, 0.0, 0.0);

			// Use shaderEnabled to mix between black and shader effect
			// When shaderEnabled = 1: show shader effect
			// When shaderEnabled = 0: show pure black
			return finalSdf.mul(shaderEnabled).add(baseColor.mul(shaderEnabled.oneMinus()));
		});

		this.material.colorNode = shaderFunction();

		this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, this.instanceCount);

		// Add instance attribute for shader enabled/disabled
		const shaderEnabledAttribute = new THREE.InstancedBufferAttribute(this.shaderEnabledArray!, 1);
		this.instancedMesh.geometry.setAttribute('shaderEnabled', shaderEnabledAttribute);

		this.scene.add(this.instancedMesh);
	}

	addDebugPlane() {
		const debugPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(5, 5),
			new THREE.MeshBasicMaterial({
				color: '#ffffff',
				side: THREE.DoubleSide,
				// transparent: true,
				// opacity: 0.5,
			})
		);

		const upperBox = new THREE.Mesh(
			new THREE.BoxGeometry(6, 6, 6),
			new THREE.MeshStandardNodeMaterial({
				color: '#000000',
				side: THREE.DoubleSide,
				// transparent: true,
				// opacity: 0.5,
			})
		);

		const middleBox = new THREE.Mesh(
			new THREE.BoxGeometry(1, 12, 1),
			new THREE.MeshStandardNodeMaterial({
				color: '#000000',
				side: THREE.DoubleSide,
				// transparent: true,
				// opacity: 0.5,	
			})
		);

		// const shaderFunction = Fn(() => {
		// 	const finalColor = vec3(0.0, 0.0, 0.0);

		// 	return finalColor;
		// })

		// upperBox.material.colorNode = shaderFunction();

		upperBox.position.set(0, 6, 0);
		middleBox.position.set(0, -3, 0);
		this.scene.add(middleBox);
		this.scene.add(upperBox);

		// this.scene.add(debugPlane);
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

		const circleSDFMaxValue = 10; // Maximum value for circle size

		// const circleBinding = this.pane.addBinding(this.uniforms.circleSize, 'value', {
		// 	min: 0.0,
		// 	max: circleSDFMaxValue,
		// 	step: 0.01,
		// 	label: 'Circle Size',
		// });

		let isAtMax = false;

		const btn = this.pane.addButton({
			title: 'Animate grid color',
		});

		btn.on('click', () => {
			const targetValue = isAtMax ? 0.0 : circleSDFMaxValue;
			const animationObject = { value: this.uniforms.circleSize.value };

			gsap.to(animationObject, {
				duration: 4,
				value: targetValue,
				ease: 'linear',
				onUpdate: () => {
					this.uniforms.circleSize.value = animationObject.value;
					// circleBinding.refresh();
				},
				onComplete: () => {
					isAtMax = !isAtMax;
				},
			});
		});

		const randomMoveBtn = this.pane.addButton({
			title: 'Animate cubes positions',
		});

		randomMoveBtn.on('click', () => {
			const gridSize = this.gridSettings.gridSize; // Use gridSize from settings

			for (let i = 0; i < this.instanceCount; i++) {
				const originalPos = this.originalPositions[i];

				// Skip cubes that are moved far away (middleBox interference area)
				if (originalPos.x > 999) {
					// This cube was moved far away, skip it in animation
					continue;
				}

				// Calculate which Y layer this cube is in (0 = top layer)
				const topY = ((gridSize - 1) * 0.5) / 2; // Updated to use 0.5 spacing
				const yLayer = Math.round((topY - originalPos.y) / 0.5); // Updated to use 0.5 spacing

				// Calculate which layer this cube belongs to based on distance from center (X,Z plane)
				const centerX = 0;
				const centerZ = 0;
				const distanceFromCenter = Math.sqrt(
					Math.pow(originalPos.x - centerX, 2) +
					Math.pow(originalPos.z - centerZ, 2)
				);

				// Determine horizontal layer based on distance from edge (creating rectangular rings)
				const maxDistance = Math.sqrt(2 * Math.pow((gridSize - 1) * 0.5, 2));
				const normalizedDistance = distanceFromCenter / maxDistance;
				// Use distance from edge to create rectangular rings like LEGO pyramid
				const horizontalOffset = ((gridSize - 1) * 0.5) / 2;
				const edgeDistanceX = Math.min(Math.abs(originalPos.x - (-horizontalOffset)), Math.abs(originalPos.x - horizontalOffset));
				const edgeDistanceZ = Math.min(Math.abs(originalPos.z - (-horizontalOffset)), Math.abs(originalPos.z - horizontalOffset));
				const edgeDistance = Math.min(edgeDistanceX, edgeDistanceZ);
				const horizontalLayer = Math.floor(edgeDistance / 0.5); // Each ring is 0.5 units wide

				// Check if this cube has shader enabled (was affected by randomization)
				const shaderEnabled = this.shaderEnabledArray![i];
				const shouldAnimate = shaderEnabled === 1.0;

				// Skip animation if this cube shouldn't be affected
				if (!shouldAnimate) {
					continue;
				}

				// Calculate delays for animated cubes
				const layerDelay = this.animationSettings.useLayeredAnimation ?
					horizontalLayer * this.animationSettings.layerDelay : 0;
				const instanceRandomDelay = Math.random() * this.animationSettings.instanceDelay;
				const totalDelay = layerDelay + instanceRandomDelay;

				// Calculate direction away from the vertical line (x:0, z:0)
				const directionFromLine = new THREE.Vector2(originalPos.x, originalPos.z);
				const distanceFromLine = directionFromLine.length();

				// Normalize direction (handle case where cube is exactly on the line)
				if (distanceFromLine > 0.001) {
					directionFromLine.normalize();
				} else {
					// If exactly on line, choose random horizontal direction
					directionFromLine.set(Math.random() - 0.5, Math.random() - 0.5).normalize();
				}

				// Movement away from line
				const moveAwayDistance = 40.0; // How far to move away from the line
				const targetX = originalPos.x + directionFromLine.x * moveAwayDistance;
				const targetZ = originalPos.z + directionFromLine.y * moveAwayDistance;

				// Add random components
				const randomAmplitude = 0.5;
				const finalX = targetX + (Math.random() - 0.5) * randomAmplitude;
				const finalY = originalPos.y + (Math.random() - 0.5) * randomAmplitude;
				const finalZ = targetZ + (Math.random() - 0.5) * randomAmplitude;

				// Generate random rotations
				const rotationAmplitude = 0.2;
				const randomRotX = Math.random() * Math.PI * rotationAmplitude;
				const randomRotY = Math.random() * Math.PI * rotationAmplitude;
				const randomRotZ = Math.random() * Math.PI * rotationAmplitude;

				// Create animation object for this instance
				const animationData = {
					position: { x: originalPos.x, y: originalPos.y, z: originalPos.z },
					rotation: { x: 0, y: 0, z: 0 }
				};

				gsap.to(animationData.position, {
					x: finalX,
					y: finalY,
					z: finalZ,
					duration: this.animationSettings.duration,
					delay: totalDelay,
					ease: "power1.out",
					onUpdate: () => {
						const tempMatrix = new THREE.Matrix4();
						tempMatrix.makeRotationFromEuler(new THREE.Euler(
							animationData.rotation.x,
							animationData.rotation.y,
							animationData.rotation.z
						));
						tempMatrix.setPosition(
							animationData.position.x,
							animationData.position.y,
							animationData.position.z
						);
						this.instancedMesh.setMatrixAt(i, tempMatrix);
						this.instancedMesh.instanceMatrix.needsUpdate = true;
					}
				});

				gsap.to(animationData.rotation, {
					x: randomRotX,
					y: randomRotY,
					z: randomRotZ,
					duration: this.animationSettings.duration,
					delay: totalDelay,
					ease: "power1.out",
				});
			}
		});

		const resetPositionBtn = this.pane.addButton({
			title: 'Reset Position',
		});

		resetPositionBtn.on('click', () => {
			for (let i = 0; i < this.instanceCount; i++) {
				const originalPos = this.originalPositions[i];
				const originalRot = this.originalRotations[i];

				// Skip cubes that are supposed to stay far away (middleBox interference area)
				if (originalPos.x > 999) {
					// This cube should stay far away, don't reset it
					continue;
				}

				// Create animation object for this instance
				const animationData = {
					position: { x: 0, y: 0, z: 0 },
					rotation: { x: 0, y: 0, z: 0 }
				};

				// Get current matrix to extract current position and rotation
				const currentMatrix = new THREE.Matrix4();
				this.instancedMesh.getMatrixAt(i, currentMatrix);
				const currentPosition = new THREE.Vector3();
				const currentQuaternion = new THREE.Quaternion();
				const currentScale = new THREE.Vector3();
				currentMatrix.decompose(currentPosition, currentQuaternion, currentScale);
				const currentEuler = new THREE.Euler().setFromQuaternion(currentQuaternion);

				animationData.position.x = currentPosition.x;
				animationData.position.y = currentPosition.y;
				animationData.position.z = currentPosition.z;
				animationData.rotation.x = currentEuler.x;
				animationData.rotation.y = currentEuler.y;
				animationData.rotation.z = currentEuler.z;

				gsap.to(animationData.position, {
					x: originalPos.x,
					y: originalPos.y,
					z: originalPos.z,
					duration: 2,
					ease: 'power2.inOut',
					onUpdate: () => {
						const tempMatrix = new THREE.Matrix4();
						tempMatrix.makeRotationFromEuler(new THREE.Euler(
							animationData.rotation.x,
							animationData.rotation.y,
							animationData.rotation.z
						));
						tempMatrix.setPosition(
							animationData.position.x,
							animationData.position.y,
							animationData.position.z
						);
						this.instancedMesh.setMatrixAt(i, tempMatrix);
						this.instancedMesh.instanceMatrix.needsUpdate = true;
					}
				});

				gsap.to(animationData.rotation, {
					x: originalRot.x,
					y: originalRot.y,
					z: originalRot.z,
					duration: 2,
					ease: 'power2.inOut',
				});
			}
		});

		// Animation Settings Folder
		const animationFolder = this.pane.addFolder({
			title: 'Animation Settings',
			expanded: false,
		});

		animationFolder.addBinding(this.animationSettings, 'layerDelay', {
			min: 0.0,
			max: 1.0,
			step: 0.01,
			label: 'Layer Delay',
		});

		animationFolder.addBinding(this.animationSettings, 'instanceDelay', {
			min: 0.0,
			max: 1.0,
			step: 0.01,
			label: 'Instance Delay',
		});

		animationFolder.addBinding(this.animationSettings, 'duration', {
			min: 0.5,
			max: 5.0,
			step: 0.1,
			label: 'Duration',
		});

		animationFolder.addBinding(this.animationSettings, 'useLayeredAnimation', {
			label: 'Layered Animation',
		});

		// Camera Controls Folder
		const cameraFolder = this.pane.addFolder({
			title: 'Camera Controls',
			expanded: false,
		});

		cameraFolder.addBinding(this, 'autoRotate', {
			label: 'Auto Rotate',
		});

		cameraFolder.addBinding(this, 'autoRotateSpeed', {
			min: 0.1,
			max: 10.0,
			step: 0.1,
			label: 'Rotation Speed',
		});

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
			isActive: false,
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight,
			name: 'Point Light',
			scene: this.scene,
			isActive: false,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 },
			showHelper: false,
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight2,
			name: 'Point Light 2',
			scene: this.scene,
			isActive: false,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 },
			showHelper: false,
		});

	}

	async render() {
		if (!this.isPlaying) return;

		// Handle autorotation
		if (this.autoRotate) {
			// Get the current target (look-at point)
			const target = this.controls.target.clone();

			// Calculate the rotation around Y axis
			const rotationSpeed = this.autoRotateSpeed * 0.01; // Convert to reasonable rotation speed

			// Get current camera position relative to target
			const cameraPosition = this.camera.position.clone().sub(target);

			// Create rotation matrix for Y axis
			const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationSpeed);

			// Apply rotation to camera position
			cameraPosition.applyMatrix4(rotationMatrix);

			// Set new camera position relative to target
			this.camera.position.copy(target.add(cameraPosition));

			// Make camera look at the target
			this.camera.lookAt(this.controls.target);
		}

		this.controls.update();
		await this.renderer.renderAsync(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
	}
}