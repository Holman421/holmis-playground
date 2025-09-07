import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightTexturesLib } from 'three/examples/jsm/lights/RectAreaLightTexturesLib.js';
import { Pane } from 'tweakpane';
import { titles } from './names';
import DisintegrateMesh from '$lib/utils/meshes/DisintegrateMesh';
import CameraWobble from '$lib/utils/cameraWobble';
import TextHandler from './utils/handleText';
import TweakPaneManager from './utils/tweakPane';
import AnimationSystem, { RectangleState } from './utils/animationSystem';
import InteractionSystem from './utils/interactionSystem';
import InstancedMeshManager from './utils/instancedMeshManager';
import AutoSelectionManager from './utils/autoSelectionManager';
import DisintegrateAnimation from './utils/dissentagrateAnimation';

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
	mainColumn!: {
		mainColumnMaterial: THREE.MeshStandardNodeMaterial;
		mainColumnGeometry: THREE.BoxGeometry;
		mainColumnMesh: THREE.Mesh;
	};
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	pointLight2!: THREE.PointLight;
	pointLight3!: THREE.PointLight;
	pointLight4!: THREE.PointLight;
	rectLight!: THREE.RectAreaLight;
	rectLightHelper!: THREE.Object3D;
	instancedMesh!: THREE.InstancedMesh;
	textHandler!: TextHandler;
	tweakPaneManager!: TweakPaneManager;
	animationSystem!: AnimationSystem;
	interactionSystem!: InteractionSystem;
	instancedMeshManager!: InstancedMeshManager;
	autoSelectionManager!: AutoSelectionManager;
	mouseWobbleTarget!: THREE.Vector2;
	mouseWobbleSmoothed!: THREE.Vector2;
	wobblePosStrength: number = 0.3;
	wobbleLerp: number = 0.015;
	disintegrate!: DisintegrateMesh;
	disintegrateProgress: number = 1;
	disintegrateAnimation!: DisintegrateAnimation;
	instanceIdToGrid!: Map<number, { row: number; col: number }>;
	gridToInstanceId!: Map<string, number>;
	cameraWobble!: CameraWobble;
	fxaaEnabled: boolean = true;

	uniforms: {
		frequency: any;
		amplitude: any;
		zOffset: any;
		scale: any;
		currentTime: any;
		atTargetRotX: any;
		atTargetRotY: any;
		atTargetRotZ: any;
		mousePos: any;
		wobbleStrength: any;
	} = {
		frequency: null,
		amplitude: null,
		zOffset: null,
		scale: null,
		currentTime: null,
		atTargetRotX: null,
		atTargetRotY: null,
		atTargetRotZ: null,
		mousePos: null,
		wobbleStrength: null
	};

	private targetPosition: THREE.Vector3 = new THREE.Vector3(-21.7, 1.9, 58.75); // Where rectangles animate to

	// Update all instance target positions after changing targetPosition
	private updateAllTargetPositions() {
		if (this.instancedMeshManager) {
			this.instancedMeshManager.updateAllTargetPositions();
		}
	}

	private instanceTextData: Array<{ name: string; isImportant: boolean }> = [];
	private numCols: number = 15;
	private numRows: number = 40;

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
		
		// Improve lighting quality and reduce harsh edges
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.52;
		
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(
			70,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(-29.45, 0.68, 70.69);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.target.set(20.66, -0.82, 31.89);
		this.mouseWobbleTarget = new THREE.Vector2(0, 0);
		this.mouseWobbleSmoothed = new THREE.Vector2(0, 0);

		this.isPlaying = true;
		this.initializeInstanceData();
		this.setupLights();
		this.setupTweakPane();
		this.createColumn();
		this.setupInstancedMeshManager();
		this.setupTextHandler();

		this.createInstanceIdMapping();

		this.setupDisintegrate();
		this.setupDisintegrateAnimation();
		this.setupCameraWobble();
		this.setupAnimationSystem();
		this.setupInteractionSystem();
		this.setupAutoSelectionManager();
		// this.setupTweakPaneManager();

		// this.scene.fog = new THREE.FogExp2(0x000000, 0.01);

		this.resize();
		this.init();
	}

	async init() {
		// Initialize RectAreaLight textures for WebGPU renderer (must be done before renderer.init())
		THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());
		
		await this.renderer.init();
		this.render();
	}

	toggleFXAA(enabled: boolean) {
		this.fxaaEnabled = enabled;
		
		// Update DisintegrateMesh FXAA setting
		if (this.disintegrate) {
			this.disintegrate.setFXAAEnabled(enabled);
		}
	}

	setupLights() {
		// Increase ambient light to fill shadows and reduce harsh contrasts
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
		this.scene.add(this.ambientLight);

		// Point Light 1
		this.pointLight = new THREE.PointLight(0xffffff, 50);
		this.pointLight.position.set(-1, 5.0, 20.5);
		this.scene.add(this.pointLight);

		// Point Light 2
		this.pointLight2 = new THREE.PointLight(0xffffff, 75);
		this.pointLight2.position.set(-14.1, 26.2, 15.2);
		this.scene.add(this.pointLight2);

		// Point Light 3
		this.pointLight3 = new THREE.PointLight(0xffffff, 75);
		this.pointLight3.position.set(-16.1, 3.3, 0.0);
		// this.scene.add(this.pointLight3);

		// Point Light 4
		this.pointLight4 = new THREE.PointLight(0xffffff, 75);
		this.pointLight4.position.set(-13, -20.7, 16.3);
		this.scene.add(this.pointLight4);

		// Rect area light - now properly configured for WebGPU
		// Using larger area with lower intensity for smoother lighting
		const width = 38;
		const height = 20;
		const intensity = 3.7;
		this.rectLight = new THREE.RectAreaLight(
			0xffffff,
			intensity,
			width,
			height
		);
		this.rectLight.position.set(-37.0, 5, 43.5);
		this.rectLight.lookAt(6.5, 0, 28.3);
		this.scene.add(this.rectLight);

		this.rectLightHelper = new RectAreaLightHelper(this.rectLight);
		// this.scene.add(this.rectLightHelper);
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

		// Refresh base camera frame on resize
		this.cameraWobble.updateBaseCameraFrame();
	}

	setupAnimationSystem() {
		this.animationSystem = new AnimationSystem({
			animationDurationSec: 6,
			overlapDurationSec: 3.75,
			interactionAttributes: this.interactionAttributes,
			onInstanceReachedTarget: (instanceId: number) => {
				const stateAttr = this.interactionAttributes.state;
				stateAttr.array[instanceId] = RectangleState.AT_TARGET;
				stateAttr.needsUpdate = true;

				// Call the text swapping logic
				this.onInstanceReachedTarget(instanceId);
			}
		});
	}

	setupInteractionSystem() {
		this.interactionSystem = new InteractionSystem({
			container: this.container,
			camera: this.camera,
			instancedMesh: this.instancedMesh,
			interactionAttributes: this.interactionAttributes,
			instanceIdToGrid: this.instanceIdToGrid,
			gridToInstanceId: this.gridToInstanceId,
			mouseWobbleTarget: this.mouseWobbleTarget,
			onHoverChange: (oldId: number, newId: number) => {
				// Handle hover change if needed
				const instanceData = this.instanceTextData[newId];
				if (instanceData && newId !== -1) {
					// Could update text or other UI here
				}
			},
			onInstanceClick: (instanceId: number) => {
				this.addToQueue(instanceId);
			},
			onMouseLeave: () => {
				// Handle mouse leave if needed
			}
		});
	}

	setupDisintegrateAnimation() {
		this.disintegrateAnimation = new DisintegrateAnimation(this.disintegrate, {
			duration: 1.25
		});
	}

	setupAutoSelectionManager() {
		this.autoSelectionManager = new AutoSelectionManager({
			animationSystem: this.animationSystem,
			interactionAttributes: this.interactionAttributes,
			onInstanceSelected: (instanceId: number) => {
				this.addToQueue(instanceId);
			},
			maxQueueSize: 1,
			maxSelectionAttempts: 6,
			instanceTextData: this.instanceTextData,
			debug: true // Enable debug logging to see prioritization in action
		});

		// Start auto-selection
		this.autoSelectionManager.startAutoSelection();
	}

	setupCameraWobble() {
		const cameraWobble = new CameraWobble({
			mouseWobbleTarget: this.mouseWobbleTarget,
			mouseWobbleSmoothed: this.mouseWobbleSmoothed,
			wobblePosStrength: this.wobblePosStrength,
			wobbleLerp: this.wobbleLerp,
			camera: this.camera,
			scene: this.scene,
			controls: this.controls,
			isEnabled: true,
			addTweakpane: false,
			pane: this.pane
		});

		this.cameraWobble = cameraWobble;
	}

	initializeInstanceData() {
		const numCols = this.numCols;
		const numRows = this.numRows;
		const totalInstances = numCols * numRows;

		// Separate important and non-important titles
		const importantTitles = titles.filter(title => title.isImportant);
		const nonImportantTitles = titles.filter(title => !title.isImportant);

		// Initialize array with non-important titles (they can repeat)
		this.instanceTextData = new Array(totalInstances);
		
		// Fill all positions with non-important titles first
		for (let i = 0; i < totalInstances; i++) {
			const dataIndex = i % nonImportantTitles.length;
			this.instanceTextData[i] = nonImportantTitles[dataIndex];
		}

		// Generate random positions for important titles (ensure each appears only once)
		const randomPositions = new Set<number>();
		while (randomPositions.size < Math.min(importantTitles.length, totalInstances)) {
			const randomPos = Math.floor(Math.random() * totalInstances);
			randomPositions.add(randomPos);
		}

		// Place important titles at random positions
		const positionsArray = Array.from(randomPositions);
		importantTitles.forEach((title, index) => {
			if (index < positionsArray.length) {
				this.instanceTextData[positionsArray[index]] = title;
			}
		});
	}

	setupDisintegrate() {
		const disintegratePosition = new THREE.Vector3(-21.7, 1.9, 67.3);
		const disintegrateBoxSize = { x: 1, y: 1, z: 5 };
		const disintegrateRotation = {
			x: 0,
			y: Math.PI * (30 / 180),
			z: 0
		};

		this.disintegrate = new DisintegrateMesh({
			scene: this.scene,
			camera: this.camera,
			renderer: this.renderer,
			progress: this.disintegrateProgress,
			position: disintegratePosition,
			boxSize: disintegrateBoxSize,
			rotation: disintegrateRotation,
			showHelpers: true, // Enable helpers for tweakpane controls
			fxaaEnabled: this.fxaaEnabled
		});
	}

	setupTextHandler() {
		this.textHandler = new TextHandler({
			scene: this.scene,
			pane: this.pane,
			enableTweakpane: false, // Set to true if you want tweakpane controls
			fontAtlasPath: '/fonts/Audiowide-msdf.png',
			fontDataPath: '/fonts/Audiowide-msdf.json',
			material: {
				color: '#ffffffff',
				opacity: 1.0
			},
			mainTextConfig: {
				text: 'ALES HOLMAN',
				position: new THREE.Vector3(-25.6, 1.4, 67.4),
				scale: new THREE.Vector3(0.01, 0.01, 0.01),
				rotation: new THREE.Euler(0, Math.PI * (125 / 180), Math.PI * 1.0)
			},
			staticTextConfig: {
				text: 'Hi, I am',
				position: new THREE.Vector3(-25.6, 4.5, 67.4),
				scale: new THREE.Vector3(0.01, 0.01, 0.01),
				rotation: new THREE.Euler(0, Math.PI * (125 / 180), Math.PI * 1.0)
			}
		});

		// Initialize the text handler asynchronously
		this.textHandler
			.initialize()
			.then(() => {
				// After initialization, center the text within the disintegrate rectangle
				this.centerTextInDisintegrateBox();
			})
			.catch((error) => {
				console.error('Failed to initialize text handler:', error);
			});
	}

	private centerTextInDisintegrateBox() {
		if (this.textHandler && this.disintegrate) {
			// Get disintegrate box properties
			const disintegratePosition = new THREE.Vector3(-21.7, 1.9, 67.3);
			const disintegrateBoxSize = { x: 1, y: 1, z: 5 };
			const disintegrateRotation = {
				x: 0,
				y: Math.PI * (30 / 180),
				z: 0
			};

			// Center the text with a static offset from the left (0.3 means 30% from left edge)
			// Use the existing text rotation (which is correct) instead of the box rotation
			this.textHandler.centerTextInDisintegrateBox(
				disintegratePosition,
				disintegrateBoxSize,
				disintegrateRotation,
				0.3, // 30% from the left edge of the box
				true // Use existing text rotation
			);
		}
	}

	updateFontText(text: string) {
		if (this.textHandler) {
			this.textHandler.updateMainText(text);

			// Re-center the text after updating
			setTimeout(() => {
				this.centerTextInDisintegrateBox();
			}, 50); // Small delay to ensure geometry is updated
		}
	}

	createInstanceIdMapping() {
		this.instanceIdToGrid = new Map();
		this.gridToInstanceId = new Map();

		let instanceIndex = 0;
		for (let row = 0; row < this.numRows; row++) {
			for (let col = 0; col < this.numCols; col++) {
				this.instanceIdToGrid.set(instanceIndex, { row, col });
				this.gridToInstanceId.set(`${row},${col}`, instanceIndex);
				instanceIndex++;
			}
		}
	}

	onInstanceReachedTarget(instanceId: number) {
		const instanceData = this.instanceTextData[instanceId];
		if (instanceData) {
			this.updateFontText(instanceData.name);
			if (this.disintegrateAnimation) {
				this.disintegrateAnimation.playAnimation();
			}
		}
	}

	instanceIdToGridPosition(instanceId: number): { row: number; col: number } {
		if (instanceId === -1) return { row: -1, col: -1 };
		return this.instanceIdToGrid.get(instanceId) || { row: -1, col: -1 };
	}

	addToQueue(instanceId: number) {
		this.animationSystem.addToQueue(instanceId);
		// Keep auto-selection running; it internally no-ops when queue is large
		// No need to restart - AutoSelectionManager handles this automatically
	}

	isAnyInstanceAnimating(): boolean {
		return this.animationSystem.isAnyInstanceAnimating();
	}

	processQueue() {
		this.animationSystem.processQueue();
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

	// NOTE: updateQueuePositions is now handled internally by AnimationSystem

	// NEW: Start immediate animation for clicked rectangle
	startInstanceAnimation(instanceId: number) {
		this.animationSystem.startInstanceAnimation(instanceId);
	}

	updateAnimations() {
		this.animationSystem.updateAnimations();
	}

	addToAnimationQueue(instanceId: number) {
		// Use the improved addToQueue method instead
		this.animationSystem.addToQueue(instanceId);
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

	createColumn() {
		const columnWidth = 23;
		const columnHeight = 150;

		const geometry = new THREE.BoxGeometry(
			columnWidth,
			columnHeight,
			columnWidth
		);
		const material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});
		const mesh = new THREE.Mesh(geometry, material);

		this.mainColumn = {
			mainColumnGeometry: geometry,
			mainColumnMaterial: material,
			mainColumnMesh: mesh
		};

		this.scene.add(this.mainColumn.mainColumnMesh);
	}

	setupInstancedMeshManager() {
		this.instancedMeshManager = new InstancedMeshManager({
			scene: this.scene,
			targetPosition: this.targetPosition,
			numCols: this.numCols,
			numRows: this.numRows,
			onUniformsCreated: (uniforms) => {
				// Store uniforms for external access
				this.uniforms = uniforms;
			},
			onInteractionAttributesCreated: (attributes) => {
				// Store interaction attributes for external access
				this.interactionAttributes = attributes;
			}
		});

		// Create the instanced mesh
		this.instancedMesh = this.instancedMeshManager.createInstancedMesh();
	}

	private setupTweakPane(): void {
		this.pane = new Pane();
		const tpElem = document.querySelector('.tp-dfwv') as HTMLElement | null;
		if (tpElem) tpElem.style.zIndex = '1000';
	}

	setupTweakPaneManager() {
		this.tweakPaneManager = new TweakPaneManager({
			pane: this.pane,
			scene: this.scene,
			camera: this.camera,
			controls: this.controls,
			lights: {
				pointLight: this.pointLight,
				pointLight2: this.pointLight2,
				pointLight3: this.pointLight3,
				pointLight4: this.pointLight4,
				rectLight: this.rectLight
			},
			rectLightHelper: this.rectLightHelper,
			uniforms: this.uniforms,
			disintegrate: this.disintegrate,
			onAnimationTimingChange: (duration: number, overlap: number) => {
				this.animationSystem.updateTiming(duration, overlap);
				// Restart auto-selection timer to apply new cadence
				this.autoSelectionManager.updateTimingSettings();
			},
			onTargetPositionChange: (x: number, y: number, z: number) => {
				this.targetPosition.set(x, y, z);
				this.updateAllTargetPositions();
			},
			onFXAAToggle: (enabled: boolean) => {
				this.toggleFXAA(enabled);
			},
			animationDurationSec: this.animationSystem.animationDuration,
			overlapDurationSec: this.animationSystem.overlapDuration,
			targetPosition: this.targetPosition,
			disintegrateProgress: this.disintegrateProgress,
			fxaaEnabled: this.fxaaEnabled
		});

		// Store reference to the pane for other systems that need it
		this.pane = this.tweakPaneManager.getPane();
	}

	async render() {
		if (!this.isPlaying) return;

		// Update time uniform
		if (this.uniforms.currentTime) {
			this.uniforms.currentTime.value = performance.now() * 0.001;
		}

		// Centralized handling for camera wobble vs OrbitControls
		this.cameraWobble.render();

		// NEW: Update animations every frame
		this.updateAnimations();

		// Watchdog: ensure auto selection keeps running even if something cleared it
		if (!this.autoSelectionManager.isRunning) {
			this.autoSelectionManager.startAutoSelection();
		}

		// Use the disintegrate mesh postprocessing which includes bloom and FXAA
		if (this.disintegrate) {
			this.disintegrate.render();
		} else {
			await this.renderer.renderAsync(this.scene, this.camera);
		}
		requestAnimationFrame(() => this.render());
	}
	stop() {
		if (!this.isPlaying) return; // Already stopped or disposed

		this.isPlaying = false;

		// Stop auto selection
		if (this.autoSelectionManager) {
			this.autoSelectionManager.dispose();
			this.autoSelectionManager = undefined as any;
		}

		// Stop disintegrate animation
		if (this.disintegrateAnimation) {
			this.disintegrateAnimation.stop();
		}

		// Remove event listeners
		window.removeEventListener('resize', this.resize.bind(this));

		// Dispose managers in reverse order of creation
		if (this.instancedMeshManager) {
			this.instancedMeshManager.dispose();
			this.instancedMeshManager = undefined as any;
		}

		if (this.textHandler) {
			this.textHandler.dispose();
			this.textHandler = undefined as any;
		}

		if (this.tweakPaneManager) {
			this.tweakPaneManager.dispose();
			this.tweakPaneManager = undefined as any;
		}

		// Dispose renderer last
		if (this.renderer) {
			this.renderer.dispose();
		}
	}
}
