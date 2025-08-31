import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import {
	setupCameraPane,
	setupLightPane
} from '$lib/utils/tweakpaneUtils/utils';
import {
	attribute,
	float,
	Fn,
	mix,
	positionLocal,
	time,
	uniform,
	varying,
	vec2,
	vec3,
	vec4
} from 'three/tsl';
import { snoise } from '$lib/utils/webGPU/simplexNoise2d';
import { portfolioColors } from '$lib/utils/colors/portfolioColors';

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
	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	mesh!: THREE.Mesh;
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	pointLight2!: THREE.PointLight;
	pointLight3!: THREE.PointLight;
	pointLight4!: THREE.PointLight;
	instancedMesh!: THREE.InstancedMesh;
	raycaster!: THREE.Raycaster;
	mouse!: THREE.Vector2;
	hoveredInstanceId!: number;
	debugInfo!: {
		mouseScreen: { x: number; y: number };
		mouseNDC: { x: number; y: number };
		mouseWorld: THREE.Vector3 | null;
		intersectionPoint: THREE.Vector3 | null;
		instanceId: number;
		gridPosition: { row: number; col: number };
	};

	instanceIdToGrid!: Map<number, { row: number; col: number }>;
	gridToInstanceId!: Map<string, number>;

	interactionAttributes!: {
		hover: THREE.InstancedBufferAttribute;
		timestamp: THREE.InstancedBufferAttribute;
	};

	uniforms: {
		frequency: any;
		amplitude: any;
		zOffset: any;
		scale: any;
		currentTime: any;
	} = {
		frequency: null,
		amplitude: null,
		zOffset: null,
		scale: null,
		currentTime: null
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
		this.camera.position.set(10, 0, 40);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.isPlaying = true;
		this.setupLights();
		this.createColumn();
		this.createInstancedMesh();
		this.setupSettings();

		this.createInstanceIdMapping();
		this.setupInteractivity();

		this.resize();
		this.init();
	}

	async init() {
		await this.renderer.init();
		this.render();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		// Point Light 1
		this.pointLight = new THREE.PointLight(0xffffff, 500);
		this.pointLight.position.set(-1, 5.0, 20.5);
		this.scene.add(this.pointLight);

		// Point Light 2
		this.pointLight2 = new THREE.PointLight(0xffffff, 75);
		this.pointLight2.position.set(-14.1, 26.2, 15.2);
		this.scene.add(this.pointLight2);

		// Point Light 3
		this.pointLight3 = new THREE.PointLight(0xffffff, 75);
		this.pointLight3.position.set(-16.1, 3.3, 0.0);
		this.scene.add(this.pointLight3);

		// Point Light 4
		this.pointLight4 = new THREE.PointLight(0xffffff, 75);
		this.pointLight4.position.set(-13, -20.7, 16.3);
		this.scene.add(this.pointLight4);
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

	setupInteractivity() {
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.hoveredInstanceId = -1;

		this.debugInfo = {
			mouseScreen: { x: 0, y: 0 },
			mouseNDC: { x: 0, y: 0 },
			mouseWorld: null,
			intersectionPoint: null,
			instanceId: -1,
			gridPosition: { row: -1, col: -1 }
		};

		const mouseMoveHandler = (event: MouseEvent) => {
			this.onMouseMove(event);
		};

		this.container.addEventListener('mousemove', mouseMoveHandler);
		this.container.addEventListener('mouseleave', this.onMouseLeave.bind(this));
		this.container.addEventListener('click', this.onMouseClick.bind(this));
	}

	onMouseMove(event: MouseEvent) {
		const rect = this.container.getBoundingClientRect();
		const screenX = event.clientX - rect.left;
		const screenY = event.clientY - rect.top;

		this.mouse.x = (screenX / this.width) * 2 - 1;
		this.mouse.y = -((screenY / this.height) * 2 - 1);

		this.debugInfo.mouseScreen.x = screenX;
		this.debugInfo.mouseScreen.y = screenY;
		this.debugInfo.mouseNDC.x = this.mouse.x;
		this.debugInfo.mouseNDC.y = this.mouse.y;

		this.performIntersectionTest();

		this.logDebugInfo();
	}

	logDebugInfo() {
		// Only log when there's an intersection for cleaner output
		if (this.debugInfo.instanceId !== -1) {
			console.clear(); // Keep console clean
			console.log('🎯 INTERSECTION DEBUG INFO:');
			console.log('┌─ Mouse Position ─────────────────');
			console.log(
				`│ Screen: (${this.debugInfo.mouseScreen.x.toFixed(1)}, ${this.debugInfo.mouseScreen.y.toFixed(1)})`
			);
			console.log(
				`│ NDC: (${this.debugInfo.mouseNDC.x.toFixed(3)}, ${this.debugInfo.mouseNDC.y.toFixed(3)})`
			);
			if (this.debugInfo.mouseWorld) {
				console.log(
					`│ World: (${this.debugInfo.mouseWorld.x.toFixed(2)}, ${this.debugInfo.mouseWorld.y.toFixed(2)}, ${this.debugInfo.mouseWorld.z.toFixed(2)})`
				);
			} else {
				console.log('│ World: (null)');
			}
			console.log('├─ Intersection ───────────────────');
			console.log(`│ Instance ID: ${this.debugInfo.instanceId}`);
			console.log(
				`│ Grid Position: Row ${this.debugInfo.gridPosition.row}, Col ${this.debugInfo.gridPosition.col}`
			);
			if (this.debugInfo.intersectionPoint) {
				console.log(
					`│ 3D Hit Point: (${this.debugInfo.intersectionPoint.x.toFixed(2)}, ${this.debugInfo.intersectionPoint.y.toFixed(2)}, ${this.debugInfo.intersectionPoint.z.toFixed(2)})`
				);
			} else {
				console.log('│ 3D Hit Point: (null)');
			}
			console.log('└─────────────────────────────────');
		}
	}

	performIntersectionTest() {
		this.raycaster.setFromCamera(this.mouse, this.camera);

		const rayDirection = this.raycaster.ray.direction.clone();
		const rayOrigin = this.raycaster.ray.origin.clone();
		this.debugInfo.mouseWorld = rayOrigin
			.clone()
			.add(rayDirection.multiplyScalar(40));

		const intersections = this.raycaster.intersectObject(this.instancedMesh);

		if (intersections.length > 0) {
			const intersection = intersections[0];
			const newInstanceId = intersection.instanceId ?? -1;

			this.debugInfo.intersectionPoint = intersection.point.clone();
			this.debugInfo.instanceId = newInstanceId;
			this.debugInfo.gridPosition =
				this.instanceIdToGridPosition(newInstanceId);

			if (newInstanceId !== this.hoveredInstanceId) {
				// FIXED: Actually call the hover change method
				this.onHoverChange(this.hoveredInstanceId, newInstanceId);
				this.hoveredInstanceId = newInstanceId;
			}
		} else {
			this.debugInfo.intersectionPoint = null;
			this.debugInfo.instanceId = -1;
			this.debugInfo.gridPosition = { row: -1, col: -1 };

			if (this.hoveredInstanceId !== -1) {
				// FIXED: Actually call the hover change method
				this.onHoverChange(this.hoveredInstanceId, -1);
				this.hoveredInstanceId = -1;
			}
		}
	}

	createInstanceIdMapping() {
		this.instanceIdToGrid = new Map();
		this.gridToInstanceId = new Map();

		// Since you now have a simple numRows x numCols grid
		const numCols = 15;
		const numRows = 40;

		let instanceIndex = 0;
		for (let row = 0; row < numRows; row++) {
			for (let col = 0; col < numCols; col++) {
				this.instanceIdToGrid.set(instanceIndex, { row, col });
				this.gridToInstanceId.set(`${row},${col}`, instanceIndex);
				instanceIndex++;
			}
		}

		console.log(
			`Created mapping for ${instanceIndex} instances (${numRows}x${numCols} grid)`
		);
	}

	instanceIdToGridPosition(instanceId: number): { row: number; col: number } {
		if (instanceId === -1) return { row: -1, col: -1 };
		return this.instanceIdToGrid.get(instanceId) || { row: -1, col: -1 };
	}

	onHoverChange(oldInstanceId: number, newInstanceId: number) {
		if (oldInstanceId !== -1) {
			const oldGrid = this.instanceIdToGridPosition(oldInstanceId);
			console.log(
				`🚫 Left instance ${oldInstanceId} at grid (${oldGrid.row}, ${oldGrid.col})`
			);
			// UPDATE: Set hover state to false
			this.setInstanceHover(oldInstanceId, false);
		}

		if (newInstanceId !== -1) {
			const newGrid = this.instanceIdToGridPosition(newInstanceId);
			console.log(
				`✨ Entered instance ${newInstanceId} at grid (${newGrid.row}, ${newGrid.col})`
			);
			// UPDATE: Set hover state to true
			this.setInstanceHover(newInstanceId, true);
		}
	}

	// NEW: Method to update instance hover state
	setInstanceHover(instanceId: number, isHovered: boolean) {
		if (!this.interactionAttributes) return;

		const hoverAttr = this.interactionAttributes.hover;
		const timestampAttr = this.interactionAttributes.timestamp;
		const currentTime = performance.now() * 0.001; // Convert to seconds

		// Update the attribute arrays
		hoverAttr.array[instanceId] = isHovered ? 1.0 : 0.0;
		timestampAttr.array[instanceId] = currentTime;

		// Mark for GPU update
		hoverAttr.needsUpdate = true;
		timestampAttr.needsUpdate = true;

		console.log(`🎨 Set instance ${instanceId} hover: ${isHovered}`);
	}

	onMouseClick(event: MouseEvent) {
		if (this.hoveredInstanceId !== -1) {
			const gridPos = this.instanceIdToGridPosition(this.hoveredInstanceId);
			console.log(
				`🎯 Clicked instance ${this.hoveredInstanceId} at grid (${gridPos.row}, ${gridPos.col})`
			);
		}
	}

	onMouseLeave() {
		if (this.hoveredInstanceId !== -1) {
			console.log(
				`👋 Mouse left canvas, clearing hover from instance ${this.hoveredInstanceId}`
			);
			this.onHoverChange(this.hoveredInstanceId, -1);
			this.hoveredInstanceId = -1;
		}
	}

	createColumn() {
		const columnWidth = 23;
		const columnHeight = 150;
		this.geometry = new THREE.BoxGeometry(
			columnWidth,
			columnHeight,
			columnWidth
		);
		this.material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	}

	createInstancedMesh() {
		const numCols = 15;
		const numRows = 40;
		const count = numCols * numRows;
		const geometry = new THREE.BoxGeometry(1, 1, 5);

		const instanceColRow = new Float32Array(count * 2);
		const instanceHoverState = new Float32Array(count); // 0 = normal, 1 = hovered
		const instanceTimestamp = new Float32Array(count); // For smooth transitions

		const material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});

		const spacing = 1.5;
		const gridWidth = (numCols - 1) * spacing;
		const gridHeight = (numRows - 1) * spacing;
		const centeringOffsetX = -gridWidth / 2;
		const centeringOffsetY = -gridHeight / 2;

		const frequencyUniform = uniform(0.5);
		const amplitudeUniform = uniform(3.0);
		const zOffsetUniform = uniform(-0.2);
		const scaleUniform = uniform(0.075);
		const secondaryColorUniform = uniform(new THREE.Color(0.02, 0.02, 0.02));
		const mainColorUniform = uniform(portfolioColors.primaryVec3);

		const hoverColorUniform = uniform(new THREE.Color(1.0, 0.0, 0.0)); // Orange
		const transitionSpeedUniform = uniform(8.0); // Speed of hover transitions
		const currentTimeUniform = uniform(0.0); // Current time for smooth transitions

		this.uniforms.frequency = frequencyUniform;
		this.uniforms.amplitude = amplitudeUniform;
		this.uniforms.zOffset = zOffsetUniform;
		this.uniforms.scale = scaleUniform;
		this.uniforms.currentTime = currentTimeUniform;

		this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);

		const vWaveHeight = varying(float());
		const vHoverState = varying(float());

		const colRowAttr = attribute('instanceColRow', 'vec2');
		const hoverStateAttr = attribute('instanceHoverState', 'float'); // NEW
		const timestampAttr = attribute('instanceTimestamp', 'float'); // NEW

		const centeringOffsetXUniform = uniform(centeringOffsetX);
		const centeringOffsetYUniform = uniform(centeringOffsetY);
		const numColsUniform = uniform(numCols);
		const numRowsUniform = uniform(numRows);

		const animateZ = Fn(() => {
			const position = positionLocal;
			const col = colRowAttr.x;
			const row = colRowAttr.y;
			const hoverState = hoverStateAttr;
			const timestamp = timestampAttr;

			// Existing wave animation logic
			const instanceWorldX = col.mul(spacing).add(centeringOffsetXUniform);
			const instanceWorldY = float(numRows - 1)
				.sub(row)
				.mul(spacing)
				.add(centeringOffsetYUniform);
			const normX = instanceWorldX.div(gridWidth * 0.95);
			const normY = instanceWorldY.div(gridHeight * 0.5);
			const distanceFromCenter = normX.mul(normX).add(normY.mul(normY)).sqrt();
			const maxDistance = float(1.0);
			const radialMultiplier = maxDistance
				.sub(distanceFromCenter)
				.div(maxDistance)
				.max(0.0);

			const noiseInput = vec2(
				instanceWorldX.mul(scaleUniform),
				instanceWorldY.mul(scaleUniform).add(time.mul(frequencyUniform))
			);
			const noiseValue = snoise(noiseInput);
			const normalizedNoise = noiseValue.add(1.0).mul(0.5);
			const baseZOffset = normalizedNoise
				.mul(amplitudeUniform)
				.mul(radialMultiplier)
				.add(zOffsetUniform);

			// FIXED: Bidirectional smooth hover transition
			const timeSinceChange = currentTimeUniform.sub(timestamp);
			const transitionProgress = float(1.0)
				.sub(float(-1.0).mul(timeSinceChange.mul(transitionSpeedUniform)).exp())
				.clamp(0.0, 1.0);

			// Simple bidirectional transition:
			// - When hoverState = 1 (hovering): animate from 0 to 1
			// - When hoverState = 0 (not hovering): animate from 1 to 0
			const finalHoverValue = hoverState
				.equal(1.0)
				.select(transitionProgress, float(1.0).sub(transitionProgress));

			// Hover effect - slight elevation
			const hoverOffset = finalHoverValue.mul(1.5);
			const finalZOffset = baseZOffset.add(hoverOffset);

			vWaveHeight.assign(finalZOffset);
			vHoverState.assign(finalHoverValue); // Pass the smooth value to fragment shader

			return vec3(position.x, position.y, position.z.add(finalZOffset));
		});

		const animateColor = Fn(() => {
			const waveHeight = vWaveHeight;
			const hoverState = vHoverState;

			// Base color mixing (your existing logic)
			const maxZOffset = 3.0;
			const colorMixFactor = waveHeight.div(maxZOffset).clamp(0.0, 1.0);
			const baseColor = mix(
				secondaryColorUniform,
				mainColorUniform,
				colorMixFactor
			);

			// NEW: Hover color blending
			const finalColor = mix(
				baseColor,
				hoverColorUniform,
				hoverState.mul(0.95)
			);

			return vec4(finalColor, 1.0);
		});

		material.positionNode = animateZ();
		material.colorNode = animateColor();

		const dummy = new THREE.Object3D();
		let instanceIndex = 0;
		const centeringOffsetZ = 9.05;
		for (let row = 0; row < numRows; row++) {
			for (let col = 0; col < numCols; col++) {
				dummy.position.x = col * spacing + centeringOffsetX;
				dummy.position.y = (numRows - 1 - row) * spacing + centeringOffsetY;
				dummy.position.z = 0 + centeringOffsetZ;
				dummy.updateMatrix();
				this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
				// Set instance attributes
				instanceColRow[instanceIndex * 2] = col;
				instanceColRow[instanceIndex * 2 + 1] = row;
				instanceHoverState[instanceIndex] = 0; // Initially not hovered
				instanceTimestamp[instanceIndex] = 0; // Initial timestamp
				instanceIndex++;
			}
		}
		this.instancedMesh.geometry.setAttribute(
			'instanceColRow',
			new THREE.InstancedBufferAttribute(instanceColRow, 2)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceHoverState',
			new THREE.InstancedBufferAttribute(instanceHoverState, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceTimestamp',
			new THREE.InstancedBufferAttribute(instanceTimestamp, 1)
		);

		// Store references for interaction methods
		this.interactionAttributes = {
			hover: this.instancedMesh.geometry.attributes
				.instanceHoverState as THREE.InstancedBufferAttribute,
			timestamp: this.instancedMesh.geometry.attributes
				.instanceTimestamp as THREE.InstancedBufferAttribute
		};

		this.instancedMesh.instanceMatrix.needsUpdate = true;
		this.scene.add(this.instancedMesh);
	}

	setupSettings() {
		this.pane = new Pane();
		const tpElem = document.querySelector('.tp-dfwv') as HTMLElement | null;
		if (tpElem) tpElem.style.zIndex = '1000';

		const xyz = new THREE.AxesHelper(50);
		this.scene.add(xyz);
		xyz.visible = false;

		// Add frequency, amplitude, zOffset, and scale controls
		// this.pane.addBinding(this.uniforms.frequency, 'value', {
		//  min: 0,
		//  max: 2,
		//  step: 0.1,
		//  label: 'Frequency'
		// });
		// this.pane.addBinding(this.uniforms.amplitude, 'value', {
		//  min: 0,
		//  max: 5,
		//  step: 0.1,
		//  label: 'Amplitude'
		// });
		this.pane.addBinding(this.uniforms.zOffset, 'value', {
			min: -10,
			max: 10,
			step: 0.1,
			label: 'Z Offset'
		});
		// this.pane.addBinding(this.uniforms.scale, 'value', {
		//  min: 0.01,
		//  max: 0.5,
		//  step: 0.01,
		//  label: 'Noise Scale'
		// });

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
			helperSize: 1.5,
			isActive: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight,
			name: 'Point Light',
			scene: this.scene,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 },
			showHelper: true,
			isActive: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight2,
			name: 'Point Light 2',
			scene: this.scene,
			positionRange: { min: -50, max: 50 },
			targetRange: { min: -50, max: 50 },
			showHelper: true,
			isActive: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight3,
			name: 'Point Light 3',
			scene: this.scene,
			positionRange: { min: -50, max: 50 },
			targetRange: { min: -50, max: 50 },
			showHelper: true,
			isActive: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight4,
			name: 'Point Light 4',
			scene: this.scene,
			positionRange: { min: -50, max: 50 },
			targetRange: { min: -50, max: 50 },
			showHelper: true,
			isActive: false
		});
	}

	async render() {
		if (!this.isPlaying) return;

		// UPDATE: Keep time uniform current for smooth transitions
		if (this.uniforms.currentTime) {
			this.uniforms.currentTime.value = performance.now() * 0.001;
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
