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
	If,
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

enum RectangleState {
	IDLE = 0,
	HOVERED = 1,
	SELECTED = 2, // Remove this if not needed
	QUEUED = 3, // NEW: In queue, waiting to animate
	ANIMATING = 4, // Currently moving to target
	AT_TARGET = 5 // Reached destination and static
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

	private animationQueue: number[] = [];
	private currentlyAnimating: number | null = null;
	private targetPosition: THREE.Vector3 = new THREE.Vector3(-37, 5, 55); // Where rectangles animate to
	private autoSelectTimer: number | null = null;

	// Animation timing configuration
	private animationDurationSec: number = 7.0; // total per-item duration
	private overlapDurationSec: number = 5.0; // start next this many seconds before finish

	private get overlapStartProgress(): number {
		// e.g. 6s duration, 2s overlap => start next at 4s => progress >= 0.6667
		return 1 - this.overlapDurationSec / this.animationDurationSec;
	}

	interactionAttributes!: {
		hover: THREE.InstancedBufferAttribute;
		timestamp: THREE.InstancedBufferAttribute;
		state: THREE.InstancedBufferAttribute; // NEW: Current state
		animationProgress: THREE.InstancedBufferAttribute; // NEW: 0-1 animation progress
		targetPosition: THREE.InstancedBufferAttribute; // NEW: Target XYZ coords
		queuePosition: THREE.InstancedBufferAttribute; // NEW: Position in queue
		animStartTime: THREE.InstancedBufferAttribute; // NEW: Precise animation start time
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
		this.startAutoSelection();

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

		// Prevent native context menu from pausing or interfering with timers/interaction
		this.container.addEventListener(
			'contextmenu',
			(event) => {
				event.preventDefault();
				event.stopPropagation();
			},
			{ passive: false }
		);
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

			// Check if this rectangle can be interacted with
			const currentState =
				this.interactionAttributes.state.array[newInstanceId];
			const canInteract =
				currentState === RectangleState.IDLE ||
				currentState === RectangleState.HOVERED ||
				currentState === RectangleState.QUEUED;

			// Set cursor based on interactability
			document.body.style.cursor = canInteract ? 'pointer' : 'auto';

			this.debugInfo.intersectionPoint = intersection.point.clone();
			this.debugInfo.instanceId = newInstanceId;
			this.debugInfo.gridPosition =
				this.instanceIdToGridPosition(newInstanceId);

			// Only trigger hover change if the rectangle can be interacted with
			if (canInteract && newInstanceId !== this.hoveredInstanceId) {
				this.onHoverChange(this.hoveredInstanceId, newInstanceId);
				this.hoveredInstanceId = newInstanceId;
			} else if (!canInteract && this.hoveredInstanceId !== -1) {
				// Clear hover if we move from interactive to non-interactive rectangle
				this.onHoverChange(this.hoveredInstanceId, -1);
				this.hoveredInstanceId = -1;
			}
		} else {
			document.body.style.cursor = 'auto';
			this.debugInfo.intersectionPoint = null;
			this.debugInfo.instanceId = -1;
			this.debugInfo.gridPosition = { row: -1, col: -1 };

			if (this.hoveredInstanceId !== -1) {
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
	}

	instanceIdToGridPosition(instanceId: number): { row: number; col: number } {
		if (instanceId === -1) return { row: -1, col: -1 };
		return this.instanceIdToGrid.get(instanceId) || { row: -1, col: -1 };
	}

	onHoverChange(oldInstanceId: number, newInstanceId: number) {
		if (oldInstanceId !== -1) {
			const oldGrid = this.instanceIdToGridPosition(oldInstanceId);
			// UPDATE: Set hover state to false
			this.setInstanceHover(oldInstanceId, false);
		}

		if (newInstanceId !== -1) {
			// CHECK: Only allow hover if rectangle is in valid state
			const currentState =
				this.interactionAttributes.state.array[newInstanceId];
			const canHover =
				currentState === RectangleState.IDLE ||
				currentState === RectangleState.HOVERED ||
				currentState === RectangleState.QUEUED;

			if (canHover) {
				const newGrid = this.instanceIdToGridPosition(newInstanceId);
				this.setInstanceHover(newInstanceId, true);
			} else {
				// Set cursor back to default since this rectangle can't be hovered
				document.body.style.cursor = 'auto';
			}
		}
	}

	// NEW: Method to update instance hover state
	setInstanceHover(instanceId: number, isHovered: boolean) {
		if (!this.interactionAttributes) return;

		const currentState = this.interactionAttributes.state.array[instanceId];

		// UPDATED: Block hover for ANIMATING and AT_TARGET states
		if (
			currentState === RectangleState.ANIMATING ||
			currentState === RectangleState.AT_TARGET ||
			currentState === RectangleState.QUEUED
		) {
			return;
		}

		// Allow hover for IDLE, HOVERED, and QUEUED states only
		if (
			currentState !== RectangleState.IDLE &&
			currentState !== RectangleState.HOVERED &&
			currentState !== RectangleState.QUEUED
		) {
			return;
		}

		// Update hover state attribute
		const hoverAttr = this.interactionAttributes.hover;
		const timestampAttr = this.interactionAttributes.timestamp;
		const currentTime = performance.now() * 0.001;

		hoverAttr.array[instanceId] = isHovered ? 1.0 : 0.0;
		timestampAttr.array[instanceId] = currentTime;

		hoverAttr.needsUpdate = true;
		timestampAttr.needsUpdate = true;
	}

	startAutoSelection() {
		if (this.autoSelectTimer !== null) return; // Already running

		const intervalMs = Math.max(
			100,
			(this.animationDurationSec - this.overlapDurationSec) * 1000
		);
		this.autoSelectTimer = window.setInterval(() => {
			// Pause if too many queued animations
			if (this.animationQueue.length > 2) return;

			// Try a few times to avoid selecting the same/invalid rectangle
			const maxAttempts = 6;
			for (let attempt = 0; attempt < maxAttempts; attempt++) {
				const candidate = this.pickRandomEligibleInstance();
				if (candidate === null) return; // nothing to pick

				if (this.isInstanceEligibleNow(candidate)) {
					this.addToQueue(candidate);
					break;
				}
			}
		}, intervalMs);
	}

	// Returns a random IDLE/HOVERED instance id, or null if none
	private pickRandomEligibleInstance(): number | null {
		const stateAttr = this.interactionAttributes.state;
		const eligible: number[] = [];
		for (let i = 0; i < stateAttr.array.length; i++) {
			const s = stateAttr.array[i];
			if (s === RectangleState.IDLE || s === RectangleState.HOVERED) {
				eligible.push(i);
			}
		}
		if (eligible.length === 0) return null;
		const idx = Math.floor(Math.random() * eligible.length);
		return eligible[idx];
	}

	// Strict re-check before queueing: must still be selectable and not already in queue
	private isInstanceEligibleNow(instanceId: number): boolean {
		const state = this.interactionAttributes.state.array[instanceId];
		if (state !== RectangleState.IDLE && state !== RectangleState.HOVERED) {
			return false;
		}
		if (this.animationQueue.includes(instanceId)) return false;
		return true;
	}

	// Stop automatic selection
	stopAutoSelection() {
		if (this.autoSelectTimer !== null) {
			clearInterval(this.autoSelectTimer);
			this.autoSelectTimer = null;
		}
	}

	onMouseClick(event: MouseEvent) {
		if (this.hoveredInstanceId !== -1) {
			const currentState =
				this.interactionAttributes.state.array[this.hoveredInstanceId];

			// UPDATED: Block clicks for ANIMATING and AT_TARGET states
			const canClick =
				currentState === RectangleState.IDLE ||
				currentState === RectangleState.HOVERED ||
				currentState === RectangleState.QUEUED;

			if (canClick) {
				this.addToQueue(this.hoveredInstanceId);
			} else {
			}
		}
	}

	addToQueue(instanceId: number) {
		const currentState = this.interactionAttributes.state.array[instanceId];

		// UPDATED: Only allow queueing from valid states (blocks ANIMATING and AT_TARGET)
		if (
			currentState === RectangleState.IDLE ||
			currentState === RectangleState.HOVERED ||
			currentState === RectangleState.QUEUED // Allow re-clicking queued items (no-op)
		) {
			// Prevent duplicate queueing
			if (currentState === RectangleState.QUEUED) {
				return;
			}

			// Check if something is currently animating
			const isAnyAnimating = this.isAnyInstanceAnimating();

			if (!isAnyAnimating && this.animationQueue.length === 0) {
				// No queue, start animation immediately
				this.startInstanceAnimation(instanceId);
			} else {
				// Add to queue
				if (!this.animationQueue.includes(instanceId)) {
					this.animationQueue.push(instanceId);
					this.setInstanceState(instanceId, RectangleState.QUEUED);

					// Update queue position
					const queueAttr = this.interactionAttributes.queuePosition;
					queueAttr.array[instanceId] = this.animationQueue.length - 1;
					queueAttr.needsUpdate = true;
				}
			}
		} else {
		}

		// Keep auto-selection running; it internally no-ops when queue is large
		this.startAutoSelection();
	}

	isAnyInstanceAnimating(): boolean {
		if (!this.interactionAttributes) return false;

		const stateAttr = this.interactionAttributes.state;
		for (let i = 0; i < stateAttr.array.length; i++) {
			if (stateAttr.array[i] === RectangleState.ANIMATING) {
				return true;
			}
		}
		return false;
	}

	processQueue() {
		if (!this.interactionAttributes) return;

		// Recover last animating if unknown
		if (this.currentlyAnimating === null) {
			const recovered = this.getLastStartedAnimatingId();
			if (recovered !== null) this.currentlyAnimating = recovered;
		}

		// If nothing is animating, start next immediately
		if (!this.isAnyInstanceAnimating() && this.animationQueue.length > 0) {
			const nextInstanceId = this.animationQueue.shift()!;
			this.startInstanceAnimation(nextInstanceId);
			this.updateQueuePositions();
			return;
		}

		// Overlap start: when last-started reaches threshold, start next
		if (this.currentlyAnimating !== null && this.animationQueue.length > 0) {
			const progressAttr = this.interactionAttributes.animationProgress;
			const lastProgress = progressAttr.array[this.currentlyAnimating] ?? 0;
			if (lastProgress >= this.overlapStartProgress) {
				const nextInstanceId = this.animationQueue.shift()!;
				this.startInstanceAnimation(nextInstanceId);
				this.updateQueuePositions();
			}
		}
	}

	private getLastStartedAnimatingId(): number | null {
		if (!this.interactionAttributes) return null;
		const stateAttr = this.interactionAttributes.state;
		const timestampAttr = this.interactionAttributes.timestamp;
		let bestId: number | null = null;
		let bestTs = -Infinity;
		for (let i = 0; i < stateAttr.array.length; i++) {
			if (stateAttr.array[i] === RectangleState.ANIMATING) {
				const ts = timestampAttr.array[i];
				if (ts > bestTs) {
					bestTs = ts;
					bestId = i;
				}
			}
		}
		return bestId;
	}

	updateQueuePositions() {
		const queueAttr = this.interactionAttributes.queuePosition;

		// Update positions for all queued items
		this.animationQueue.forEach((instanceId, index) => {
			queueAttr.array[instanceId] = index;
		});

		queueAttr.needsUpdate = true;
	}

	// NEW: Start immediate animation for clicked rectangle
	startInstanceAnimation(instanceId: number) {
		const currentState = this.interactionAttributes.state.array[instanceId];

		// Allow animation from IDLE, HOVERED, or QUEUED state
		if (
			currentState === RectangleState.IDLE ||
			currentState === RectangleState.HOVERED ||
			currentState === RectangleState.QUEUED
		) {
			// Set to animating state
			this.setInstanceState(instanceId, RectangleState.ANIMATING);

			// Reset animation progress to 0
			const progressAttr = this.interactionAttributes.animationProgress;
			progressAttr.array[instanceId] = 0.0;
			progressAttr.needsUpdate = true;

			// Clear queue position
			const queueAttr = this.interactionAttributes.queuePosition;
			queueAttr.array[instanceId] = -1;
			queueAttr.needsUpdate = true;

			// Record precise animation start time
			const animStartAttr = this.interactionAttributes.animStartTime;
			if (animStartAttr) {
				animStartAttr.array[instanceId] = performance.now() * 0.001;
				animStartAttr.needsUpdate = true;
			}

			// Track most recently started animation for overlap logic
			this.currentlyAnimating = instanceId;
		}
	}

	updateAnimations() {
		if (!this.interactionAttributes) return;

		const stateAttr = this.interactionAttributes.state;
		const progressAttr = this.interactionAttributes.animationProgress;
		const timestampAttr = this.interactionAttributes.timestamp;
		const animStartAttr = this.interactionAttributes.animStartTime;
		const currentTime = performance.now() * 0.001;

		let needsUpdate = false;

		// Update all animating instances
		for (let i = 0; i < stateAttr.array.length; i++) {
			if (stateAttr.array[i] === RectangleState.ANIMATING) {
				const startTime = animStartAttr
					? animStartAttr.array[i] || timestampAttr.array[i]
					: timestampAttr.array[i];
				const animationDuration = this.animationDurationSec; // configurable duration
				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / animationDuration, 1.0);

				progressAttr.array[i] = progress;
				needsUpdate = true;

				// Check if animation is complete
				if (progress >= 1.0) {
					stateAttr.array[i] = RectangleState.AT_TARGET;
				}
			}
		}

		if (needsUpdate) {
			progressAttr.needsUpdate = true;
			stateAttr.needsUpdate = true;
		}

		// Process queue after updating animations
		this.processQueue();
	}

	addToAnimationQueue(instanceId: number) {
		const currentState = this.interactionAttributes.state.array[instanceId];

		// Only allow selection if in IDLE or HOVERED state
		if (
			currentState === RectangleState.IDLE ||
			currentState === RectangleState.HOVERED
		) {
			if (!this.animationQueue.includes(instanceId)) {
				this.animationQueue.push(instanceId);
				this.setInstanceState(instanceId, RectangleState.SELECTED);

				// Update queue position
				const queueAttr = this.interactionAttributes.queuePosition;
				queueAttr.array[instanceId] = this.animationQueue.length - 1;
				queueAttr.needsUpdate = true;
			}
		}
	}

	setInstanceState(instanceId: number, newState: RectangleState) {
		if (!this.interactionAttributes) return;

		const stateAttr = this.interactionAttributes.state;
		const timestampAttr = this.interactionAttributes.timestamp;
		const currentTime = performance.now() * 0.001;

		const prevState = stateAttr.array[instanceId];
		stateAttr.array[instanceId] = newState;

		// Preserve timestamp when transitioning QUEUED -> ANIMATING to prevent visual snap
		if (
			!(
				prevState === RectangleState.QUEUED &&
				newState === RectangleState.ANIMATING
			)
		) {
			timestampAttr.array[instanceId] = currentTime;
		}

		stateAttr.needsUpdate = true;
		timestampAttr.needsUpdate = true;
	}

	onMouseLeave() {
		if (this.hoveredInstanceId !== -1) {
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

		// All instance attributes
		const instanceColRow = new Float32Array(count * 2);
		const instanceHoverState = new Float32Array(count);
		const instanceTimestamp = new Float32Array(count);
		const instanceState = new Float32Array(count);
		const instanceAnimationProgress = new Float32Array(count);
		const instanceAnimStartTime = new Float32Array(count);
		const instanceTargetPosition = new Float32Array(count * 3);
		const instanceQueuePosition = new Float32Array(count);

		const material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});

		const spacing = 1.5;
		const gridWidth = (numCols - 1) * spacing;
		const gridHeight = (numRows - 1) * spacing;
		const centeringOffsetX = -gridWidth / 2;
		const centeringOffsetY = -gridHeight / 2;

		// Uniforms
		const frequencyUniform = uniform(0.5);
		const amplitudeUniform = uniform(3.0);
		const zOffsetUniform = uniform(-0.2);
		const scaleUniform = uniform(0.075);
		const transitionSpeedUniform = uniform(8.0);
		const currentTimeUniform = uniform(0.0);

		// Color uniforms for different states
		const idleColorUniform = uniform(new THREE.Color(0.02, 0.02, 0.02)); // Dark gray
		const mainColorUniform = uniform(portfolioColors.primaryVec3); // Blue wave peaks
		const hoverColorUniform = uniform(new THREE.Color(1.0, 0.5, 0.1)); // Orange hover
		const selectedColorUniform = uniform(new THREE.Color(0.4, 0.7, 0.2)); // Green selected
		const targetColorUniform = uniform(new THREE.Color(1.0, 0.2, 0.2)); // Red at target

		this.uniforms.frequency = frequencyUniform;
		this.uniforms.amplitude = amplitudeUniform;
		this.uniforms.zOffset = zOffsetUniform;
		this.uniforms.scale = scaleUniform;
		this.uniforms.currentTime = currentTimeUniform;

		this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);

		// Varying variables for shader communication
		const vWaveHeight = varying(float());
		const vStateInfo = varying(vec4()); // x: state, y: hover transition, z: animation progress, w: unused
		const vFinalColor = varying(vec3()); // Final per-instance color computed in vertex

		// Attribute references
		const colRowAttr = attribute('instanceColRow', 'vec2');
		const hoverStateAttr = attribute('instanceHoverState', 'float');
		const timestampAttr = attribute('instanceTimestamp', 'float');
		const stateAttr = attribute('instanceState', 'float'); // NEW
		const animationProgressAttr = attribute(
			'instanceAnimationProgress',
			'float'
		); // NEW
		const targetPositionAttr = attribute('instanceTargetPosition', 'vec3'); // NEW

		// Uniform constants
		const centeringOffsetXUniform = uniform(centeringOffsetX);
		const centeringOffsetYUniform = uniform(centeringOffsetY);

		const animateZ = Fn(() => {
			const position = positionLocal;
			const col = colRowAttr.x;
			const row = colRowAttr.y;
			const hoverState = hoverStateAttr;
			const timestamp = timestampAttr;
			const currentState = stateAttr;
			const animProgress = animationProgressAttr;
			const targetPos = targetPositionAttr;
			const staticBaseZ = float(0.0); // No wave movement for selected states

			// Calculate base grid position (this should match your for loop positioning)
			const baseGridX = col.mul(spacing).add(centeringOffsetXUniform);
			const baseGridY = float(numRows - 1)
				.sub(row)
				.mul(spacing)
				.add(centeringOffsetYUniform);

			// Calculate wave effect for Z position
			const normX = baseGridX.div(gridWidth * 0.95);
			const normY = baseGridY.div(gridHeight * 0.5);
			const distanceFromCenter = normX.mul(normX).add(normY.mul(normY)).sqrt();
			const maxDistance = float(1.0);
			const radialMultiplier = maxDistance
				.sub(distanceFromCenter)
				.div(maxDistance)
				.max(0.0);

			const noiseInput = vec2(
				baseGridX.mul(scaleUniform),
				baseGridY.mul(scaleUniform).add(time.mul(frequencyUniform))
			);
			const noiseValue = snoise(noiseInput);
			const normalizedNoise = noiseValue.add(1.0).mul(0.5);
			const baseWaveZ = normalizedNoise
				.mul(amplitudeUniform)
				.mul(radialMultiplier)
				.add(zOffsetUniform);

			// Smooth hover transition
			const timeSinceChange = currentTimeUniform.sub(timestamp);
			const transitionProgress = float(1.0)
				.sub(float(-1.0).mul(timeSinceChange.mul(transitionSpeedUniform)).exp())
				.clamp(0.0, 1.0);

			const hoverTransition = hoverState
				.equal(1.0)
				.select(transitionProgress, float(1.0).sub(transitionProgress));

			// Enhanced easing function for smoother animation
			// const easedProgress = animProgress
			// 	.mul(animProgress)
			// 	.mul(float(3.0).sub(animProgress.mul(2.0))); // Smooth step
			// Alternative easing options:
			// const easedProgress = float(1.0).sub(float(1.0).sub(animProgress).pow(3.0)); // Ease out cubic
			const easedProgress = animProgress.mul(animProgress).mul(animProgress); // Ease in cubic

			// Calculate movement direction and distance for rotation
			// Use a hover-independent origin to avoid target path mismatch and shifts
			const originalCenter = vec3(baseGridX, baseGridY, staticBaseZ.add(2.0));
			const movementVector = targetPos.sub(originalCenter);
			const movementDirection = movementVector.normalize();

			// Create a rotation curve that starts at 0, peaks in middle, returns to 0
			// Using sin wave: 0 -> 1 -> 0 over the animation progress
			const rotationCurve = float(3.14159).mul(easedProgress).sin(); // Sine wave from 0 to PI

			// Calculate rotation angles based on movement direction
			const maxRotation = float(1.5); // Maximum rotation in radians (about 85 degrees)

			// Rotate around X axis based on Y movement (up/down)
			// If moving down (negative Y), rotate forward (negative X rotation)
			// If moving up (positive Y), rotate backward (positive X rotation)
			const rotationX = movementDirection.y
				.mul(maxRotation)
				.mul(rotationCurve)
				.negate();

			// Reduce roll around Z to keep motion feeling horizontal
			const rotationZ = movementDirection.x
				.mul(maxRotation)
				.mul(0.15)
				.mul(rotationCurve);

			// Stronger horizontal yaw towards the travel direction (left/right)
			const rotationY = movementDirection.x
				.mul(maxRotation)
				.mul(0.8)
				.mul(rotationCurve);

			// Create rotation matrices
			const cosX = rotationX.cos();
			const sinX = rotationX.sin();
			const cosY = rotationY.cos();
			const sinY = rotationY.sin();
			const cosZ = rotationZ.cos();
			const sinZ = rotationZ.sin();

			// Apply rotations to the local position (step by step)
			// Only apply rotation during animation
			const shouldRotate = currentState.equal(float(RectangleState.ANIMATING));

			// Step 1: Rotation around X axis
			const rotatedPosX = vec3(
				position.x,
				position.y.mul(cosX).sub(position.z.mul(sinX)),
				position.y.mul(sinX).add(position.z.mul(cosX))
			);

			// Step 2: Rotation around Y axis
			const rotatedPosY = vec3(
				rotatedPosX.x.mul(cosY).add(rotatedPosX.z.mul(sinY)),
				rotatedPosX.y,
				rotatedPosX.x.mul(sinY.negate()).add(rotatedPosX.z.mul(cosY))
			);

			// Step 3: Rotation around Z axis
			const rotatedPosZ = vec3(
				rotatedPosY.x.mul(cosZ).sub(rotatedPosY.y.mul(sinZ)),
				rotatedPosY.x.mul(sinZ).add(rotatedPosY.y.mul(cosZ)),
				rotatedPosY.z
			);

			// Use rotated position only during animation, otherwise use original
			const finalRotatedPos = shouldRotate.select(rotatedPosZ, position);
			// Smaller selected Z offset
			const selectedZBase = float(1.5); // Reduced from 2.0

			// For animating: calculate offset from original position to target with easing
			const offsetToTarget = targetPos.sub(originalCenter);
			const queuedRestingPos = vec3(
				float(0.0),
				float(0.0),
				staticBaseZ.add(selectedZBase)
			);
			// Hover effects - only for interactive states
			const canHover = currentState
				.equal(float(RectangleState.IDLE))
				.or(currentState.equal(float(RectangleState.HOVERED)))
				.or(currentState.equal(float(RectangleState.QUEUED)));

			const staticHoverLift = hoverTransition.mul(1.5);
			const effectiveHoverOffset = canHover.select(staticHoverLift, float(0.0));

			const finalOffset = currentState
				.equal(float(RectangleState.IDLE))
				.or(currentState.equal(float(RectangleState.HOVERED)))
				.select(
					// IDLE/HOVERED → use waves
					vec3(float(0.0), float(0.0), baseWaveZ.add(effectiveHoverOffset)),
					currentState.equal(float(RectangleState.QUEUED)).select(
						// QUEUED → smoothly move from wave/hover to queued resting pos
						mix(
							vec3(float(0.0), float(0.0), baseWaveZ.add(effectiveHoverOffset)),
							queuedRestingPos,
							transitionProgress
						),
						currentState.equal(float(RectangleState.ANIMATING)).select(
							// ANIMATING → also blend the start, then add movement towards target
							mix(
								vec3(
									float(0.0),
									float(0.0),
									baseWaveZ.add(effectiveHoverOffset)
								),
								queuedRestingPos,
								transitionProgress
							).add(offsetToTarget.mul(easedProgress)),
							// Fallback (same as above)
							mix(
								vec3(
									float(0.0),
									float(0.0),
									baseWaveZ.add(effectiveHoverOffset)
								),
								queuedRestingPos,
								transitionProgress
							).add(offsetToTarget.mul(easedProgress))
						)
					)
				);

			// baseWaveZ
			// Apply offset to the rotated vertex position
			const finalPosition = finalRotatedPos.add(finalOffset);

			// Pass data to fragment shader
			vWaveHeight.assign(baseWaveZ);
			vStateInfo.assign(
				vec4(currentState, hoverTransition, easedProgress, transitionProgress)
			);

			// Compute final color in vertex to avoid per-fragment divergence
			const stateRounded = currentState.add(0.5).floor();
			const isQueued = stateRounded.equal(float(RectangleState.QUEUED));
			const isAnimating = stateRounded.equal(float(RectangleState.ANIMATING));
			const isAtTarget = stateRounded.equal(float(RectangleState.AT_TARGET));
			const isClicked = stateRounded.greaterThan(float(RectangleState.HOVERED));

			const maxZOffset = 3.0;
			const colorMixFactor = baseWaveZ.div(maxZOffset).clamp(0.0, 1.0);
			const baseWaveColor = mix(
				idleColorUniform,
				mainColorUniform,
				colorMixFactor
			);
			const hoveredColor = mix(
				baseWaveColor,
				hoverColorUniform,
				hoverTransition.mul(0.6)
			);

			const startColor = hoveredColor; // source before selection
			// Stage 1: move to selected color while queued (from startColor)
			const selectedStageMix = isQueued.select(transitionProgress, float(1.0));
			const preAnimColor = mix(
				startColor,
				selectedColorUniform,
				selectedStageMix
			);
			// Stage 2: during animation move from selected to target
			const duringAnimColor = mix(
				preAnimColor,
				targetColorUniform,
				animProgress
			);

			const finalVertexColor = isClicked
				.select(
					// clicked path
					isAtTarget.select(
						targetColorUniform,
						isAnimating.select(duringAnimColor, preAnimColor)
					),
					// not clicked: idle/hovered path
					hoveredColor
				)
				.toVar();

			vFinalColor.assign(finalVertexColor);

			return finalPosition;
		});

		// THIRD: Fix the color shader - replace animateColor function:
		const animateColor = Fn(() => {
			return vec4(vFinalColor, 1.0);
		});

		// Apply the enhanced shaders
		material.positionNode = animateZ();
		material.colorNode = animateColor();

		// Initialize instances (same as before but with new attributes)
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

				// Set all instance attributes
				instanceColRow[instanceIndex * 2] = col;
				instanceColRow[instanceIndex * 2 + 1] = row;
				instanceHoverState[instanceIndex] = 0;
				instanceTimestamp[instanceIndex] = 0;
				instanceState[instanceIndex] = RectangleState.IDLE;
				instanceAnimationProgress[instanceIndex] = 0.0;
				instanceTargetPosition[instanceIndex * 3] = this.targetPosition.x;
				instanceTargetPosition[instanceIndex * 3 + 1] = this.targetPosition.y;
				instanceTargetPosition[instanceIndex * 3 + 2] = this.targetPosition.z;
				instanceQueuePosition[instanceIndex] = -1;
				instanceAnimStartTime[instanceIndex] = 0.0;

				instanceIndex++;
			}
		}

		// Set all geometry attributes
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
		this.instancedMesh.geometry.setAttribute(
			'instanceState',
			new THREE.InstancedBufferAttribute(instanceState, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceAnimationProgress',
			new THREE.InstancedBufferAttribute(instanceAnimationProgress, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceTargetPosition',
			new THREE.InstancedBufferAttribute(instanceTargetPosition, 3)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceQueuePosition',
			new THREE.InstancedBufferAttribute(instanceQueuePosition, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceAnimStartTime',
			new THREE.InstancedBufferAttribute(instanceAnimStartTime, 1)
		);

		// Store enhanced references
		this.interactionAttributes = {
			hover: this.instancedMesh.geometry.attributes
				.instanceHoverState as THREE.InstancedBufferAttribute,
			timestamp: this.instancedMesh.geometry.attributes
				.instanceTimestamp as THREE.InstancedBufferAttribute,
			state: this.instancedMesh.geometry.attributes
				.instanceState as THREE.InstancedBufferAttribute,
			animationProgress: this.instancedMesh.geometry.attributes
				.instanceAnimationProgress as THREE.InstancedBufferAttribute,
			targetPosition: this.instancedMesh.geometry.attributes
				.instanceTargetPosition as THREE.InstancedBufferAttribute,
			queuePosition: this.instancedMesh.geometry.attributes
				.instanceQueuePosition as THREE.InstancedBufferAttribute,
			animStartTime: this.instancedMesh.geometry.attributes
				.instanceAnimStartTime as THREE.InstancedBufferAttribute
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

		// Update time uniform
		if (this.uniforms.currentTime) {
			this.uniforms.currentTime.value = performance.now() * 0.001;
		}

		// NEW: Update animations every frame
		this.updateAnimations();

		// Watchdog: ensure auto selection keeps running even if something cleared it
		if (this.autoSelectTimer === null) {
			this.startAutoSelection();
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
