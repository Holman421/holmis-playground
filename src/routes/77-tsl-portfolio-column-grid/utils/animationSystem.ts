import * as THREE from 'three/webgpu';

export enum RectangleState {
	IDLE = 0,
	HOVERED = 1,
	SELECTED = 2, // Remove this if not needed
	QUEUED = 3, // NEW: In queue, waiting to animate
	ANIMATING = 4, // Currently moving to target
	AT_TARGET = 5 // Reached destination and static
}

interface AnimationSystemOptions {
	interactionAttributes: {
		state: THREE.InstancedBufferAttribute;
		animationProgress: THREE.InstancedBufferAttribute;
		queuePosition: THREE.InstancedBufferAttribute;
		animStartTime: THREE.InstancedBufferAttribute;
		timestamp: THREE.InstancedBufferAttribute;
	};
	onInstanceReachedTarget: (instanceId: number) => void;
	animationDurationSec?: number;
	overlapDurationSec?: number;
}

export default class AnimationSystem {
	private interactionAttributes: AnimationSystemOptions['interactionAttributes'];
	private onInstanceReachedTarget: AnimationSystemOptions['onInstanceReachedTarget'];
	
	// Animation queue and state
	private animationQueue: number[] = [];
	private currentlyAnimating: number | null = null;
	
	// Animation timing configuration
	private animationDurationSec: number = 2.0; // total per-item duration
	private overlapDurationSec: number = 1.0; // start next this many seconds before finish

	constructor(options: AnimationSystemOptions) {
		this.interactionAttributes = options.interactionAttributes;
		this.onInstanceReachedTarget = options.onInstanceReachedTarget;
		
		if (options.animationDurationSec !== undefined) {
			this.animationDurationSec = options.animationDurationSec;
		}
		if (options.overlapDurationSec !== undefined) {
			this.overlapDurationSec = options.overlapDurationSec;
		}
	}

	// Getters for timing configuration
	public get animationDuration(): number {
		return this.animationDurationSec;
	}

	public get overlapDuration(): number {
		return this.overlapDurationSec;
	}

	public get overlapStartProgress(): number {
		// e.g. 6s duration, 2s overlap => start next at 4s => progress >= 0.6667
		return 1 - this.overlapDurationSec / this.animationDurationSec;
	}

	public get queueLength(): number {
		return this.animationQueue.length;
	}

	// Update timing configuration
	public updateTiming(animationDurationSec: number, overlapDurationSec: number): void {
		this.animationDurationSec = animationDurationSec;
		this.overlapDurationSec = overlapDurationSec;
	}

	// Check if an instance can be queued for animation
	public canQueueInstance(instanceId: number): boolean {
		const currentState = this.interactionAttributes.state.array[instanceId];
		return (
			currentState === RectangleState.IDLE ||
			currentState === RectangleState.HOVERED ||
			currentState === RectangleState.QUEUED
		);
	}

	// Check if an instance can be interacted with (hover/click)
	public canInteractWithInstance(instanceId: number): boolean {
		const currentState = this.interactionAttributes.state.array[instanceId];
		return (
			currentState === RectangleState.IDLE ||
			currentState === RectangleState.HOVERED ||
			currentState === RectangleState.QUEUED
		);
	}

	// Add an instance to the animation queue
	public addToQueue(instanceId: number): boolean {
		const currentState = this.interactionAttributes.state.array[instanceId];

		// Only allow queueing from valid states
		if (!this.canQueueInstance(instanceId)) {
			return false;
		}

		// Prevent duplicate queueing
		if (currentState === RectangleState.QUEUED) {
			return false;
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

		return true;
	}

	// Check if any instance is currently animating
	public isAnyInstanceAnimating(): boolean {
		const stateAttr = this.interactionAttributes.state;
		for (let i = 0; i < stateAttr.array.length; i++) {
			if (stateAttr.array[i] === RectangleState.ANIMATING) {
				return true;
			}
		}
		return false;
	}

	// Process the animation queue (called every frame)
	public processQueue(): void {
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

	// Start animation for a specific instance
	public startInstanceAnimation(instanceId: number): void {
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

	// Update all running animations (called every frame)
	public updateAnimations(): void {
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
				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / this.animationDurationSec, 1.0);

				progressAttr.array[i] = progress;
				needsUpdate = true;

				// Check if animation is complete
				if (progress >= 1.0) {
					stateAttr.array[i] = RectangleState.AT_TARGET;
					this.onInstanceReachedTarget(i);
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

	// Set the state of an instance
	public setInstanceState(instanceId: number, newState: RectangleState): void {
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

	// Get the current state of an instance
	public getInstanceState(instanceId: number): RectangleState {
		return this.interactionAttributes.state.array[instanceId];
	}

	// Private helper methods
	private getLastStartedAnimatingId(): number | null {
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

	private updateQueuePositions(): void {
		const queueAttr = this.interactionAttributes.queuePosition;

		// Update positions for all queued items
		this.animationQueue.forEach((instanceId, index) => {
			queueAttr.array[instanceId] = index;
		});

		queueAttr.needsUpdate = true;
	}

	// Public utility methods
	public clearQueue(): void {
		this.animationQueue.length = 0;
		this.currentlyAnimating = null;
	}

	public getQueuePosition(instanceId: number): number {
		return this.animationQueue.indexOf(instanceId);
	}

	public isInQueue(instanceId: number): boolean {
		return this.animationQueue.includes(instanceId);
	}

	// Get current queue state for debugging
	public getQueueState(): {
		queue: number[];
		currentlyAnimating: number | null;
		queueLength: number;
	} {
		return {
			queue: [...this.animationQueue],
			currentlyAnimating: this.currentlyAnimating,
			queueLength: this.animationQueue.length
		};
	}
}
