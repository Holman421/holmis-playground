import * as THREE from 'three/webgpu';
import { RectangleState } from './animationSystem';

interface InteractionAttributes {
	state: THREE.InstancedBufferAttribute;
	hover: THREE.InstancedBufferAttribute;
	animationProgress: THREE.InstancedBufferAttribute;
	queuePosition: THREE.InstancedBufferAttribute;
	animStartTime: THREE.InstancedBufferAttribute;
	timestamp: THREE.InstancedBufferAttribute;
	targetPosition: THREE.InstancedBufferAttribute;
}

interface DebugInfo {
	mouseScreen: { x: number; y: number };
	mouseNDC: { x: number; y: number };
	mouseWorld: THREE.Vector3 | null;
	intersectionPoint: THREE.Vector3 | null;
	instanceId: number;
	gridPosition: { row: number; col: number };
}

interface InteractionSystemOptions {
	container: HTMLElement;
	camera: THREE.Camera;
	instancedMesh: THREE.InstancedMesh;
	interactionAttributes: InteractionAttributes;
	instanceIdToGrid: Map<number, { row: number; col: number }>;
	gridToInstanceId: Map<string, number>;
	mouseWobbleTarget: THREE.Vector2;
	onHoverChange?: (oldId: number, newId: number) => void;
	onInstanceClick?: (instanceId: number) => void;
	onMouseLeave?: () => void;
}

export default class InteractionSystem {
	private container: HTMLElement;
	private camera: THREE.Camera;
	private instancedMesh: THREE.InstancedMesh;
	private interactionAttributes: InteractionAttributes;
	private instanceIdToGrid: Map<number, { row: number; col: number }>;
	private gridToInstanceId: Map<string, number>;
	private mouseWobbleTarget: THREE.Vector2;

	// Mouse and raycasting
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	private hoveredInstanceId: number = -1;

	// Debug info
	private debugInfo: DebugInfo;

	// Callbacks
	private onHoverChangeCallback?: (oldId: number, newId: number) => void;
	private onInstanceClickCallback?: (instanceId: number) => void;
	private onMouseLeaveCallback?: () => void;

	// Event handlers (bound for cleanup)
	private mouseMoveHandler: (event: MouseEvent) => void;
	private mouseLeaveHandler: () => void;
	private mouseClickHandler: () => void;
	private contextMenuHandler: (event: MouseEvent) => void;

	constructor(options: InteractionSystemOptions) {
		this.container = options.container;
		this.camera = options.camera;
		this.instancedMesh = options.instancedMesh;
		this.interactionAttributes = options.interactionAttributes;
		this.instanceIdToGrid = options.instanceIdToGrid;
		this.gridToInstanceId = options.gridToInstanceId;
		this.mouseWobbleTarget = options.mouseWobbleTarget;

		this.onHoverChangeCallback = options.onHoverChange;
		this.onInstanceClickCallback = options.onInstanceClick;
		this.onMouseLeaveCallback = options.onMouseLeave;

		// Initialize Three.js objects
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		// Initialize debug info
		this.debugInfo = {
			mouseScreen: { x: 0, y: 0 },
			mouseNDC: { x: 0, y: 0 },
			mouseWorld: null,
			intersectionPoint: null,
			instanceId: -1,
			gridPosition: { row: -1, col: -1 }
		};

		// Bind event handlers for proper cleanup
		this.mouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
		this.mouseLeaveHandler = () => this.onMouseLeave();
		this.mouseClickHandler = () => this.onMouseClick();
		this.contextMenuHandler = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
		};

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		this.container.addEventListener('mousemove', this.mouseMoveHandler);
		this.container.addEventListener('mouseleave', this.mouseLeaveHandler);
		this.container.addEventListener('click', this.mouseClickHandler);
		
		// Prevent native context menu from pausing or interfering with timers/interaction
		this.container.addEventListener('contextmenu', this.contextMenuHandler, { passive: false });
	}

	private onMouseMove(event: MouseEvent): void {
		const rect = this.container.getBoundingClientRect();
		const screenX = event.clientX - rect.left;
		const screenY = event.clientY - rect.top;

		const width = rect.width;
		const height = rect.height;

		this.mouse.x = (screenX / width) * 2 - 1;
		this.mouse.y = -((screenY / height) * 2 - 1);

		this.debugInfo.mouseScreen.x = screenX;
		this.debugInfo.mouseScreen.y = screenY;
		this.debugInfo.mouseNDC.x = this.mouse.x;
		this.debugInfo.mouseNDC.y = this.mouse.y;

		this.performIntersectionTest();

		// Update wobble target in normalized screen space [-1,1]
		this.mouseWobbleTarget.set(this.mouse.x, this.mouse.y);
	}

	private performIntersectionTest(): void {
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
			const currentState = this.interactionAttributes.state.array[newInstanceId];
			const canInteract =
				currentState === RectangleState.IDLE ||
				currentState === RectangleState.HOVERED ||
				currentState === RectangleState.QUEUED;

			// Set cursor based on interactability
			document.body.style.cursor = canInteract ? 'pointer' : 'auto';

			this.debugInfo.intersectionPoint = intersection.point.clone();
			this.debugInfo.instanceId = newInstanceId;
			this.debugInfo.gridPosition = this.instanceIdToGridPosition(newInstanceId);

			// Only trigger hover change if the rectangle can be interacted with
			if (canInteract && newInstanceId !== this.hoveredInstanceId) {
				this.triggerHoverChange(this.hoveredInstanceId, newInstanceId);
				this.hoveredInstanceId = newInstanceId;
			} else if (!canInteract && this.hoveredInstanceId !== -1) {
				// Clear hover if we move from interactive to non-interactive rectangle
				this.triggerHoverChange(this.hoveredInstanceId, -1);
				this.hoveredInstanceId = -1;
			}
		} else {
			document.body.style.cursor = 'auto';
			this.debugInfo.intersectionPoint = null;
			this.debugInfo.instanceId = -1;
			this.debugInfo.gridPosition = { row: -1, col: -1 };

			if (this.hoveredInstanceId !== -1) {
				this.triggerHoverChange(this.hoveredInstanceId, -1);
				this.hoveredInstanceId = -1;
			}
		}
	}

	private triggerHoverChange(oldInstanceId: number, newInstanceId: number): void {
		if (oldInstanceId !== -1) {
			// Set hover state to false
			this.setInstanceHover(oldInstanceId, false);
		}

		if (newInstanceId !== -1) {
			// Check if rectangle is in valid state for hover
			const currentState = this.interactionAttributes.state.array[newInstanceId];
			const canHover =
				currentState === RectangleState.IDLE ||
				currentState === RectangleState.HOVERED ||
				currentState === RectangleState.QUEUED;

			if (canHover) {
				this.setInstanceHover(newInstanceId, true);
			} else {
				// Set cursor back to default since this rectangle can't be hovered
				document.body.style.cursor = 'auto';
			}
		}

		// Call external hover change handler
		if (this.onHoverChangeCallback) {
			this.onHoverChangeCallback(oldInstanceId, newInstanceId);
		}
	}

	private setInstanceHover(instanceId: number, isHovered: boolean): void {
		if (!this.interactionAttributes) return;

		const currentState = this.interactionAttributes.state.array[instanceId];

		// Block hover for ANIMATING and AT_TARGET states
		if (
			currentState === RectangleState.ANIMATING ||
			currentState === RectangleState.AT_TARGET
		) {
			return;
		}

		// Update hover attribute
		const hoverAttr = this.interactionAttributes.hover;
		hoverAttr.array[instanceId] = isHovered ? 1 : 0;
		hoverAttr.needsUpdate = true;

		// Update state appropriately
		const stateAttr = this.interactionAttributes.state;
		if (isHovered) {
			// Only set to HOVERED if currently IDLE
			if (currentState === RectangleState.IDLE) {
				stateAttr.array[instanceId] = RectangleState.HOVERED;
				stateAttr.needsUpdate = true;
			}
		} else {
			// Only revert to IDLE if currently HOVERED
			if (currentState === RectangleState.HOVERED) {
				stateAttr.array[instanceId] = RectangleState.IDLE;
				stateAttr.needsUpdate = true;
			}
		}

		// Update timestamp
		const timestampAttr = this.interactionAttributes.timestamp;
		timestampAttr.array[instanceId] = performance.now() * 0.001;
		timestampAttr.needsUpdate = true;
	}

	private onMouseClick(): void {
		if (this.hoveredInstanceId !== -1) {
			const currentState = this.interactionAttributes.state.array[this.hoveredInstanceId];

			// Block clicks for ANIMATING and AT_TARGET states
			const canClick =
				currentState === RectangleState.IDLE ||
				currentState === RectangleState.HOVERED ||
				currentState === RectangleState.QUEUED;

			if (canClick && this.onInstanceClickCallback) {
				this.onInstanceClickCallback(this.hoveredInstanceId);
			}
		}
	}

	private onMouseLeave(): void {
		if (this.hoveredInstanceId !== -1) {
			this.triggerHoverChange(this.hoveredInstanceId, -1);
			this.hoveredInstanceId = -1;
		}

		if (this.onMouseLeaveCallback) {
			this.onMouseLeaveCallback();
		}
	}

	private instanceIdToGridPosition(instanceId: number): { row: number; col: number } {
		if (instanceId === -1) return { row: -1, col: -1 };
		return this.instanceIdToGrid.get(instanceId) || { row: -1, col: -1 };
	}

	// Public API
	public getCurrentHoveredId(): number {
		return this.hoveredInstanceId;
	}

	public getDebugInfo(): DebugInfo {
		return { ...this.debugInfo };
	}

	public getMouseNDC(): THREE.Vector2 {
		return this.mouse.clone();
	}

	public getRaycaster(): THREE.Raycaster {
		return this.raycaster;
	}

	public updateCamera(camera: THREE.Camera): void {
		this.camera = camera;
	}

	public updateInstancedMesh(instancedMesh: THREE.InstancedMesh): void {
		this.instancedMesh = instancedMesh;
	}

	public forceIntersectionTest(): void {
		this.performIntersectionTest();
	}

	// Cleanup method
	public cleanup(): void {
		this.container.removeEventListener('mousemove', this.mouseMoveHandler);
		this.container.removeEventListener('mouseleave', this.mouseLeaveHandler);
		this.container.removeEventListener('click', this.mouseClickHandler);
		this.container.removeEventListener('contextmenu', this.contextMenuHandler);
	}
}
