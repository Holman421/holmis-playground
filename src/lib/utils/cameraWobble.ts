import type { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as THREE from 'three/webgpu';

type Props = {
	mouseWobbleTarget: THREE.Vector2;
	mouseWobbleSmoothed: THREE.Vector2;
	wobblePosStrength: number;
	wobbleLerp: number;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	controls: OrbitControls;
	isEnabled: boolean;
	addTweakpane?: boolean;
	pane?: any;
	wobbleXCompensation?: number;
};

export default class CameraWobble {
	mouseWobbleTarget: THREE.Vector2;
	mouseWobbleSmoothed: THREE.Vector2;
	wobblePosStrength: number;
	wobbleLerp: number;
	isEnabled: boolean;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	controls: OrbitControls;
	baseCameraPos: THREE.Vector3 = new THREE.Vector3();
	baseTarget: THREE.Vector3 = new THREE.Vector3();
	baseForward: THREE.Vector3 = new THREE.Vector3();
	baseRight: THREE.Vector3 = new THREE.Vector3();
	baseUp: THREE.Vector3 = new THREE.Vector3();
	addTweakpane?: boolean;
	pane?: any;
	wobbleXCompensation: number = 1.0; // Asymmetric X-axis compensation

	get controlsEnabled(): boolean {
		return this.isEnabled;
	}

	set controlsEnabled(value: boolean) {
		this.setControlsEnabled(value);
	}

	constructor(props: Props) {
		this.mouseWobbleTarget = props.mouseWobbleTarget;
		this.mouseWobbleSmoothed = props.mouseWobbleSmoothed;
		this.wobblePosStrength = props.wobblePosStrength;
		this.wobbleLerp = props.wobbleLerp;
		this.isEnabled = props.isEnabled;
		this.camera = props.camera;
		this.scene = props.scene;
		this.controls = props.controls;
		this.addTweakpane = props.addTweakpane;
		this.pane = props.pane;
		this.wobbleXCompensation = props.wobbleXCompensation ?? 1.0;

		if (this.addTweakpane && this.pane) {
			this.setupTweakpane();
		}
	}

	 updateBaseCameraFrame() {
		this.baseCameraPos = this.camera.position.clone();
		this.baseTarget = this.controls.target.clone();
		this.baseForward = this.baseCameraPos
			.clone()
			.sub(this.baseTarget)
			.normalize();
		const worldUp = new THREE.Vector3(0, 1, 0);
		this.baseRight = this.baseForward.clone().cross(worldUp).normalize();
		this.baseUp = this.baseRight.clone().cross(this.baseForward).normalize();
	}

	// Public toggle for wobble controls; also refreshes wobble base so transitions feel natural
	setControlsEnabled(enabled: boolean) {
		this.isEnabled = enabled;
		this.controls.enabled = !enabled; // Disable OrbitControls when wobble is enabled
		// When switching modes, capture the current camera/target as the new wobble base
		this.updateBaseCameraFrame();
	}

	private updateCameraAndControls() {
		// Smooth mouse wobble towards target (keep updated regardless of mode)
		const wobbleLerp = Math.max(0.001, Math.min(1, this.wobbleLerp));
		this.mouseWobbleSmoothed.lerp(this.mouseWobbleTarget, wobbleLerp);
		const clampedX = Math.max(-1, Math.min(1, this.mouseWobbleSmoothed.x));
		const clampedY = Math.max(-1, Math.min(1, this.mouseWobbleSmoothed.y));

		if (!this.isEnabled) {
			// Hand over to OrbitControls when wobble is disabled
			this.controls.update();
			return;
		}

		// Apply wobble to camera when wobble controls are enabled
		const wobblePosStrength = this.wobblePosStrength;
		const forward = this.baseForward;
		const right = this.baseRight;
		const up = this.baseUp;
		
		// Apply asymmetric compensation: boost left side (negative X) to match right side
		const compensatedX = clampedX < 0 
			? clampedX * this.wobbleXCompensation 
			: clampedX;
		
		const offset = new THREE.Vector3()
			.addScaledVector(right, compensatedX * wobblePosStrength)
			.addScaledVector(up, clampedY * wobblePosStrength);
		this.camera.position.copy(this.baseCameraPos).add(offset);
		// Keep looking at same target
		this.camera.lookAt(this.baseTarget);
	}

	setupTweakpane() {
        this.pane!
            .addBinding(this as { controlsEnabled: boolean }, 'controlsEnabled', { label: 'Wobble Controls' })
            .on('change', (ev: { value: boolean }) => this.setControlsEnabled(ev.value as boolean));
		
		this.pane!.addBinding(this, 'wobbleXCompensation', {
			label: 'X Compensation',
			min: 0.5,
			max: 2.0,
			step: 0.05
		});
	}

	render() {
		this.updateCameraAndControls();
	}
}
