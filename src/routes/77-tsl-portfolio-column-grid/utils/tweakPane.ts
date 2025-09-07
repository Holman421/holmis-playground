import * as THREE from 'three/webgpu';
import { Pane } from 'tweakpane';
import {
	setupCameraPane,
	setupLightPane
} from '$lib/utils/tweakpaneUtils/utils';
import type DisintegrateMesh from '$lib/utils/meshes/DisintegrateMesh';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface TweakPaneManagerOptions {
    pane: Pane;
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	lights: {
		pointLight: THREE.PointLight;
		pointLight2: THREE.PointLight;
		pointLight3: THREE.PointLight;
		pointLight4: THREE.PointLight;
		rectLight: THREE.RectAreaLight;
	};
	rectLightHelper?: THREE.Object3D;
	uniforms: {
		frequency: any;
		amplitude: any;
		zOffset: any;
		scale: any;
		atTargetRotX: any;
		atTargetRotY: any;
		atTargetRotZ: any;
	};
	disintegrate: DisintegrateMesh;
	// Animation callbacks
	onAnimationTimingChange: (duration: number, overlap: number) => void;
	onTargetPositionChange: (x: number, y: number, z: number) => void;
	onFXAAToggle: (enabled: boolean) => void;
	// Initial values
	animationDurationSec: number;
	overlapDurationSec: number;
	targetPosition: THREE.Vector3;
	disintegrateProgress: number;
	fxaaEnabled: boolean;
}

export default class TweakPaneManager {
	private pane!: Pane;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private controls: OrbitControls;
	private lights: TweakPaneManagerOptions['lights'];
	private uniforms: TweakPaneManagerOptions['uniforms'];
	private disintegrate: DisintegrateMesh;
	private rectLightHelper?: THREE.Object3D;
	private onAnimationTimingChange: TweakPaneManagerOptions['onAnimationTimingChange'];
	private onTargetPositionChange: TweakPaneManagerOptions['onTargetPositionChange'];
	private onFXAAToggle: TweakPaneManagerOptions['onFXAAToggle'];
	private isDisposed: boolean = false;
	
	// State tracking
	private animationDurationSec: number;
	private overlapDurationSec: number;
	private targetPosition: THREE.Vector3;
	private disintegrateProgress: number;
	private fxaaEnabled: boolean;

	constructor(options: TweakPaneManagerOptions) {
        this.pane = options.pane;
		this.scene = options.scene;
		this.camera = options.camera;
		this.controls = options.controls;
		this.lights = options.lights;
		this.uniforms = options.uniforms;
		this.disintegrate = options.disintegrate;
		this.rectLightHelper = options.rectLightHelper;
		this.onAnimationTimingChange = options.onAnimationTimingChange;
		this.onTargetPositionChange = options.onTargetPositionChange;
		this.onFXAAToggle = options.onFXAAToggle;
		
		// Initialize state
		this.animationDurationSec = options.animationDurationSec;
		this.overlapDurationSec = options.overlapDurationSec;
		this.targetPosition = options.targetPosition.clone();
		this.disintegrateProgress = options.disintegrateProgress;
		this.fxaaEnabled = options.fxaaEnabled;
		this.setupAllSettings();
	}

	private setupAllSettings(): void {
		this.setupDebugHelpers();
		this.setupFXAAControls();
		this.setupDisintegrateControls();
		this.setupGridWaveControls();
		this.setupCameraControls();
		this.setupLightControls();
		this.setupAnimationTimingControls();
		this.setupTargetPositionControls();
		this.setupAtTargetRotationControls();
	}

	private setupDebugHelpers(): void {
		const xyz = new THREE.AxesHelper(50);
		this.scene.add(xyz);
		xyz.visible = false;
	}

	private setupFXAAControls(): void {
		const renderingFolder = this.pane.addFolder({
			title: 'Rendering',
			expanded: true
		});

		const fxaaState = { 
			enabled: this.fxaaEnabled 
		};

		renderingFolder
			.addBinding(fxaaState, 'enabled', {
				label: 'FXAA Anti-aliasing'
			})
			.on('change', (ev) => {
				this.fxaaEnabled = ev.value;
				this.onFXAAToggle(ev.value);
			});
	}

	private setupDisintegrateControls(): void {
		const disintegrateFolder = this.pane.addFolder({
			title: 'Disintegrate Animation',
			expanded: false
		});

		const progressState = { 
			progress: this.disintegrateProgress 
		};

		disintegrateFolder
			.addBinding(progressState, 'progress', {
				min: 0,
				max: 1,
				step: 0.01,
				label: 'Progress'
			})
			.on('change', (ev) => {
				this.disintegrateProgress = ev.value as number;
				this.disintegrate.updateProgress(ev.value as number);
			});

		// Add position and rotation controls if showHelpers is enabled
		if (this.disintegrate.showHelpers) {
			// Position controls
			const positionState = {
				x: this.disintegrate.position.x,
				y: this.disintegrate.position.y,
				z: this.disintegrate.position.z
			};

			const positionFolder = disintegrateFolder.addFolder({
				title: 'Position',
				expanded: false
			});

			positionFolder
				.addBinding(positionState, 'x', {
					min: -100,
					max: 100,
					step: 0.1,
					label: 'X'
				})
				.on('change', (ev) => {
					const newPosition = new THREE.Vector3(
						ev.value as number,
						positionState.y,
						positionState.z
					);
					this.disintegrate.updatePosition(newPosition);
				});

			positionFolder
				.addBinding(positionState, 'y', {
					min: -100,
					max: 100,
					step: 0.1,
					label: 'Y'
				})
				.on('change', (ev) => {
					const newPosition = new THREE.Vector3(
						positionState.x,
						ev.value as number,
						positionState.z
					);
					this.disintegrate.updatePosition(newPosition);
				});

			positionFolder
				.addBinding(positionState, 'z', {
					min: -100,
					max: 100,
					step: 0.1,
					label: 'Z'
				})
				.on('change', (ev) => {
					const newPosition = new THREE.Vector3(
						positionState.x,
						positionState.y,
						ev.value as number
					);
					this.disintegrate.updatePosition(newPosition);
				});

			// Rotation controls (in degrees for easier editing)
			const rad2deg = (r: number) => (r * 180) / Math.PI;
			const deg2rad = (d: number) => (d * Math.PI) / 180;

			const rotationState = {
				x: rad2deg(this.disintegrate.rotation.x),
				y: rad2deg(this.disintegrate.rotation.y),
				z: rad2deg(this.disintegrate.rotation.z)
			};

			const rotationFolder = disintegrateFolder.addFolder({
				title: 'Rotation (degrees)',
				expanded: false
			});

			rotationFolder
				.addBinding(rotationState, 'x', {
					min: -180,
					max: 180,
					step: 1,
					label: 'X'
				})
				.on('change', (ev) => {
					const newRotation = {
						x: deg2rad(ev.value as number),
						y: deg2rad(rotationState.y),
						z: deg2rad(rotationState.z)
					};
					this.disintegrate.updateRotation(newRotation);
				});

			rotationFolder
				.addBinding(rotationState, 'y', {
					min: -180,
					max: 180,
					step: 1,
					label: 'Y'
				})
				.on('change', (ev) => {
					const newRotation = {
						x: deg2rad(rotationState.x),
						y: deg2rad(ev.value as number),
						z: deg2rad(rotationState.z)
					};
					this.disintegrate.updateRotation(newRotation);
				});

			rotationFolder
				.addBinding(rotationState, 'z', {
					min: -180,
					max: 180,
					step: 1,
					label: 'Z'
				})
				.on('change', (ev) => {
					const newRotation = {
						x: deg2rad(rotationState.x),
						y: deg2rad(rotationState.y),
						z: deg2rad(ev.value as number)
					};
					this.disintegrate.updateRotation(newRotation);
				});
		}
	}

	private setupGridWaveControls(): void {
		const gridFolder = this.pane.addFolder({
			title: 'Grid Wave Settings',
			expanded: false
		});

		gridFolder.addBinding(this.uniforms.frequency, 'value', {
			min: 0,
			max: 2,
			step: 0.1,
			label: 'Frequency'
		});

		gridFolder.addBinding(this.uniforms.amplitude, 'value', {
			min: 0,
			max: 5,
			step: 0.1,
			label: 'Amplitude'
		});

		gridFolder.addBinding(this.uniforms.zOffset, 'value', {
			min: -10,
			max: 10,
			step: 0.1,
			label: 'Z Offset'
		});

		gridFolder.addBinding(this.uniforms.scale, 'value', {
			min: 0.01,
			max: 0.5,
			step: 0.01,
			label: 'Noise Scale'
		});
	}

	private setupCameraControls(): void {
		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
			helperSize: 1.5,
			isActive: false
		});
	}

	private setupLightControls(): void {
		const lightConfigs = [
			{
				light: this.lights.pointLight,
				name: 'Point Light',
				positionRange: { min: -15, max: 15 },
				targetRange: { min: -15, max: 15 }
			},
			{
				light: this.lights.pointLight2,
				name: 'Point Light 2',
				positionRange: { min: -50, max: 50 },
				targetRange: { min: -50, max: 50 }
			},
			{
				light: this.lights.pointLight3,
				name: 'Point Light 3',
				positionRange: { min: -50, max: 50 },
				targetRange: { min: -50, max: 50 }
			},
			{
				light: this.lights.pointLight4,
				name: 'Point Light 4',
				positionRange: { min: -50, max: 50 },
				targetRange: { min: -50, max: 50 }
			}
		];

		lightConfigs.forEach(config => {
			setupLightPane({
				pane: this.pane,
				light: config.light,
				name: config.name,
				scene: this.scene,
				positionRange: config.positionRange,
				targetRange: config.targetRange,
				showHelper: true,
				isActive: false
			});
		});

		// Setup Rect Area Light controls
		this.setupRectAreaLightControls();
	}

	private setupRectAreaLightControls(): void {
		const rectLightFolder = this.pane.addFolder({
			title: 'Rect Area Light',
			expanded: false
		});

		// Light properties
		const lightProps = {
			intensity: this.lights.rectLight.intensity,
			width: this.lights.rectLight.width,
			height: this.lights.rectLight.height,
			color: `#${this.lights.rectLight.color.getHexString()}`
		};

		// Position properties
		const positionProps = {
			x: this.lights.rectLight.position.x,
			y: this.lights.rectLight.position.y,
			z: this.lights.rectLight.position.z
		};

		// LookAt target properties
		const targetProps = {
			x: 0,
			y: 0,
			z: 0
		};

		// Intensity control
		rectLightFolder
			.addBinding(lightProps, 'intensity', {
				label: 'Intensity',
				min: 0,
				max: 10,
				step: 0.1
			})
			.on('change', (ev) => {
				this.lights.rectLight.intensity = ev.value;
			});

		// Width control
		rectLightFolder
			.addBinding(lightProps, 'width', {
				label: 'Width',
				min: 1,
				max: 200,
				step: 1
			})
			.on('change', (ev) => {
				this.lights.rectLight.width = ev.value;
			});

		// Height control
		rectLightFolder
			.addBinding(lightProps, 'height', {
				label: 'Height',
				min: 1,
				max: 200,
				step: 1
			})
			.on('change', (ev) => {
				this.lights.rectLight.height = ev.value;
			});

		// Color control
		rectLightFolder
			.addBinding(lightProps, 'color', {
				label: 'Color'
			})
			.on('change', (ev) => {
				this.lights.rectLight.color.setHex(parseInt(ev.value.replace('#', ''), 16));
			});

		// Position controls
		const positionFolder = rectLightFolder.addFolder({
			title: 'Position',
			expanded: false
		});

		positionFolder
			.addBinding(positionProps, 'x', {
				label: 'X',
				min: -100,
				max: 100,
				step: 0.1
			})
			.on('change', (ev) => {
				this.lights.rectLight.position.x = ev.value;
			});

		positionFolder
			.addBinding(positionProps, 'y', {
				label: 'Y',
				min: -100,
				max: 100,
				step: 0.1
			})
			.on('change', (ev) => {
				this.lights.rectLight.position.y = ev.value;
			});

		positionFolder
			.addBinding(positionProps, 'z', {
				label: 'Z',
				min: -100,
				max: 100,
				step: 0.1
			})
			.on('change', (ev) => {
				this.lights.rectLight.position.z = ev.value;
			});

		// LookAt controls
		const lookAtFolder = rectLightFolder.addFolder({
			title: 'Look At Target',
			expanded: false
		});

		lookAtFolder
			.addBinding(targetProps, 'x', {
				label: 'Target X',
				min: -100,
				max: 100,
				step: 0.1
			})
			.on('change', () => {
				this.lights.rectLight.lookAt(targetProps.x, targetProps.y, targetProps.z);
			});

		lookAtFolder
			.addBinding(targetProps, 'y', {
				label: 'Target Y',
				min: -100,
				max: 100,
				step: 0.1
			})
			.on('change', () => {
				this.lights.rectLight.lookAt(targetProps.x, targetProps.y, targetProps.z);
			});

		lookAtFolder
			.addBinding(targetProps, 'z', {
				label: 'Target Z',
				min: -100,
				max: 100,
				step: 0.1
			})
			.on('change', () => {
				this.lights.rectLight.lookAt(targetProps.x, targetProps.y, targetProps.z);
			});

		// Helper visibility toggle
		if (this.rectLightHelper) {
			const helperProps = {
				showHelper: this.rectLightHelper.visible
			};

			rectLightFolder
				.addBinding(helperProps, 'showHelper', {
					label: 'Show Helper'
				})
				.on('change', (ev) => {
					if (this.rectLightHelper) {
						this.rectLightHelper.visible = ev.value;
					}
				});
		}
	}

	private setupAnimationTimingControls(): void {
		const animFolder = this.pane.addFolder({
			title: 'Animation Timing',
			expanded: false
		});

		const timing = {
			animationDurationSec: this.animationDurationSec,
			overlapDurationSec: this.overlapDurationSec
		};

		let bOverlap: any;

		const bDuration = animFolder
			.addBinding(timing, 'animationDurationSec', {
				label: 'Per-item Duration (s)',
				min: 0.1,
				max: 10,
				step: 0.1
			})
			.on('change', (ev) => {
				const dur = ev.value as number;
				this.animationDurationSec = dur;
				
				// Ensure overlap does not exceed duration
				if (timing.overlapDurationSec > dur) {
					timing.overlapDurationSec = dur;
					this.overlapDurationSec = dur;
					if (bOverlap && typeof bOverlap.refresh === 'function') {
						bOverlap.refresh();
					}
				}
				
				// Notify the main app of timing changes
				this.onAnimationTimingChange(this.animationDurationSec, this.overlapDurationSec);
			});

		bOverlap = animFolder
			.addBinding(timing, 'overlapDurationSec', {
				label: 'Overlap (s)',
				min: 0,
				max: 10,
				step: 0.1
			})
			.on('change', (ev) => {
				// Clamp to [0, duration]
				let v = ev.value as number;
				v = Math.max(0, Math.min(v, this.animationDurationSec));
				timing.overlapDurationSec = v;
				this.overlapDurationSec = v;
				
				if (bOverlap && typeof bOverlap.refresh === 'function') {
					bOverlap.refresh();
				}
				
				// Notify the main app of timing changes
				this.onAnimationTimingChange(this.animationDurationSec, this.overlapDurationSec);
			});
	}

	private setupTargetPositionControls(): void {
		const targetFolder = this.pane.addFolder({
			title: 'Target Position',
			expanded: false
		});

		const target = {
			x: this.targetPosition.x,
			y: this.targetPosition.y,
			z: this.targetPosition.z
		};

		targetFolder
			.addBinding(target, 'x', { 
				min: -200, 
				max: 200, 
				step: 0.1, 
				label: 'X' 
			})
			.on('change', (ev) => {
				this.targetPosition.x = ev.value as number;
				this.onTargetPositionChange(
					this.targetPosition.x, 
					this.targetPosition.y, 
					this.targetPosition.z
				);
			});

		targetFolder
			.addBinding(target, 'y', { 
				min: -200, 
				max: 200, 
				step: 0.1, 
				label: 'Y' 
			})
			.on('change', (ev) => {
				this.targetPosition.y = ev.value as number;
				this.onTargetPositionChange(
					this.targetPosition.x, 
					this.targetPosition.y, 
					this.targetPosition.z
				);
			});

		targetFolder
			.addBinding(target, 'z', { 
				min: -200, 
				max: 200, 
				step: 0.1, 
				label: 'Z' 
			})
			.on('change', (ev) => {
				this.targetPosition.z = ev.value as number;
				this.onTargetPositionChange(
					this.targetPosition.x, 
					this.targetPosition.y, 
					this.targetPosition.z
				);
			});
	}

	private setupAtTargetRotationControls(): void {
		const atTargetRotFolder = this.pane.addFolder({
			title: 'At Target Rotation',
			expanded: false
		});

		const atTargetRot = {
			x: 0,
			y: 0,
			z: 0
		};

		const deg2rad = (d: number) => (d * Math.PI) / 180;

		atTargetRotFolder
			.addBinding(atTargetRot, 'x', {
				min: -180,
				max: 180,
				step: 1,
				label: 'Rot X (deg)'
			})
			.on('change', (ev) => {
				if (this.uniforms.atTargetRotX) {
					this.uniforms.atTargetRotX.value = deg2rad(ev.value as number);
				}
			});

		atTargetRotFolder
			.addBinding(atTargetRot, 'y', {
				min: -180,
				max: 180,
				step: 1,
				label: 'Rot Y (deg)'
			})
			.on('change', (ev) => {
				if (this.uniforms.atTargetRotY) {
					this.uniforms.atTargetRotY.value = deg2rad(ev.value as number);
				}
			});

		atTargetRotFolder
			.addBinding(atTargetRot, 'z', {
				min: -180,
				max: 180,
				step: 1,
				label: 'Rot Z (deg)'
			})
			.on('change', (ev) => {
				if (this.uniforms.atTargetRotZ) {
					this.uniforms.atTargetRotZ.value = deg2rad(ev.value as number);
				}
			});
	}

	// Public methods for updating state from external sources
	public updateAnimationTiming(duration: number, overlap: number): void {
		this.animationDurationSec = duration;
		this.overlapDurationSec = overlap;
	}

	public updateTargetPosition(position: THREE.Vector3): void {
		this.targetPosition.copy(position);
	}

	public updateDisintegrateProgress(progress: number): void {
		this.disintegrateProgress = progress;
	}

	// Getter for the pane instance
	public getPane(): Pane {
		return this.pane;
	}

	// Cleanup method
	public dispose(): void {
		if (this.isDisposed) return; // Already disposed
		this.isDisposed = true;
		
		if (this.pane) {
			try {
				this.pane.dispose();
			} catch (error) {
				console.warn('Error disposing tweakpane:', error);
			}
			this.pane = undefined as any;
		}
	}
}
