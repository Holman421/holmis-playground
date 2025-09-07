import * as THREE from 'three/webgpu';
import { RectangleState } from './animationSystem';
import type AnimationSystem from './animationSystem';

interface AutoSelectionManagerOptions {
	animationSystem: AnimationSystem;
	interactionAttributes: {
		state: THREE.InstancedBufferAttribute;
	};
	onInstanceSelected?: (instanceId: number) => void;
	maxQueueSize?: number;
	maxSelectionAttempts?: number;
	instanceTextData?: Array<{ name: string; isImportant: boolean }>;
	debug?: boolean;
}

export default class AutoSelectionManager {
	private animationSystem: AnimationSystem;
	private interactionAttributes: AutoSelectionManagerOptions['interactionAttributes'];
	private onInstanceSelected?: (instanceId: number) => void;
	private maxQueueSize: number;
	private maxSelectionAttempts: number;
	private autoSelectTimer: number | null = null;
	private isDisposed: boolean = false;
	private instanceTextData?: Array<{ name: string; isImportant: boolean }>;
	private debug: boolean;

	constructor(options: AutoSelectionManagerOptions) {
		this.animationSystem = options.animationSystem;
		this.interactionAttributes = options.interactionAttributes;
		this.onInstanceSelected = options.onInstanceSelected;
		this.maxQueueSize = options.maxQueueSize || 2;
		this.maxSelectionAttempts = options.maxSelectionAttempts || 6;
		this.instanceTextData = options.instanceTextData;
		this.debug = options.debug || false;
	}

	startAutoSelection() {
		if (this.autoSelectTimer !== null) return; // Already running
		if (!this.animationSystem || this.isDisposed) return; // Safety check

		const intervalMs = Math.max(
			100,
			(this.animationSystem.animationDuration - this.animationSystem.overlapDuration) * 1000
		);

		// Trigger the first selection immediately
		this.triggerSelection();

		this.autoSelectTimer = window.setInterval(() => {
			this.triggerSelection();
		}, intervalMs);
	}

	// Extract the selection logic into a separate method
	private triggerSelection() {
		// Pause if too many queued animations
		if (this.animationSystem.queueLength > this.maxQueueSize) return;

		// Try a few times to avoid selecting the same/invalid rectangle
		for (let attempt = 0; attempt < this.maxSelectionAttempts; attempt++) {
			const candidate = this.pickRandomEligibleInstance();
			if (candidate === null) return; // nothing to pick

			if (this.isInstanceEligibleNow(candidate)) {
				// Notify callback about the selection
				if (this.onInstanceSelected) {
					this.onInstanceSelected(candidate);
				}
				break;
			}
		}
	}

	stopAutoSelection() {
		if (this.autoSelectTimer !== null) {
			clearInterval(this.autoSelectTimer);
			this.autoSelectTimer = null;
		}
	}

	restartAutoSelection() {
		this.stopAutoSelection();
		this.startAutoSelection();
	}

	updateTimingSettings() {
		// Restart with new timing if auto-selection is active
		if (this.autoSelectTimer !== null) {
			this.restartAutoSelection();
		}
	}

	// Returns a random IDLE/HOVERED instance id, prioritizing important ones, or null if none
	private pickRandomEligibleInstance(): number | null {
		const stateAttr = this.interactionAttributes.state;
		const eligibleImportant: number[] = [];
		const eligibleNormal: number[] = [];
		
		for (let i = 0; i < stateAttr.array.length; i++) {
			const s = stateAttr.array[i];
			if (s === RectangleState.IDLE || s === RectangleState.HOVERED) {
				// Check if this instance has important text data
				if (this.instanceTextData && i < this.instanceTextData.length) {
					const instanceData = this.instanceTextData[i];
					if (instanceData && instanceData.isImportant) {
						eligibleImportant.push(i);
					} else {
						eligibleNormal.push(i);
					}
				} else {
					// If no text data available, treat as normal
					eligibleNormal.push(i);
				}
			}
		}
		
		let selectedInstance: number | null = null;
		
		// Prioritize important instances first
		if (eligibleImportant.length > 0) {
			const idx = Math.floor(Math.random() * eligibleImportant.length);
			selectedInstance = eligibleImportant[idx];
			
			if (this.debug) {
				const instanceData = this.instanceTextData?.[selectedInstance];
				console.log(`[AutoSelection] Selected IMPORTANT instance ${selectedInstance}: "${instanceData?.name}" (${eligibleImportant.length} important available, ${eligibleNormal.length} normal available)`);
			}
		} else if (eligibleNormal.length > 0) {
			// If no important instances available, pick from normal ones
			const idx = Math.floor(Math.random() * eligibleNormal.length);
			selectedInstance = eligibleNormal[idx];
			
			if (this.debug) {
				const instanceData = this.instanceTextData?.[selectedInstance];
				console.log(`[AutoSelection] Selected normal instance ${selectedInstance}: "${instanceData?.name}" (${eligibleNormal.length} normal available, 0 important available)`);
			}
		}
		
		return selectedInstance;
	}

	// Strict re-check before queueing: must still be selectable and not already in queue
	private isInstanceEligibleNow(instanceId: number): boolean {
		const state = this.interactionAttributes.state.array[instanceId];
		if (state !== RectangleState.IDLE && state !== RectangleState.HOVERED) {
			return false;
		}
		if (this.animationSystem.isInQueue(instanceId)) return false;
		return true;
	}

	get isRunning(): boolean {
		return this.autoSelectTimer !== null;
	}

	get currentQueueSize(): number {
		return this.animationSystem.queueLength;
	}

	setMaxQueueSize(size: number) {
		this.maxQueueSize = size;
	}

	setMaxSelectionAttempts(attempts: number) {
		this.maxSelectionAttempts = attempts;
	}

	updateInstanceTextData(instanceTextData: Array<{ name: string; isImportant: boolean }>) {
		this.instanceTextData = instanceTextData;
	}

	dispose() {
		if (this.isDisposed) return;
		this.isDisposed = true;
		
		this.stopAutoSelection();
		
		// Clear references
		this.animationSystem = undefined as any;
		this.interactionAttributes = undefined as any;
		this.onInstanceSelected = undefined;
	}
}
