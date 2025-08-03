/**
 * Recording Controls Component
 * Provides UI controls for canvas screenshot and video recording
 */

import { CanvasCapture } from './canvasCapture';
import { VideoRecorder, formatDuration, type RecordingState } from './videoRecorder';

export interface RecordingControlsOptions {
	canvas: HTMLCanvasElement;
	container: HTMLElement;
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	className?: string;
}

export class RecordingControls {
	private canvas: HTMLCanvasElement;
	private container: HTMLElement;
	private controlsElement!: HTMLElement;
	private canvasCapture: CanvasCapture;
	private videoRecorder: VideoRecorder;

	// UI Elements
	private screenshotButton!: HTMLButtonElement;
	private videoButton!: HTMLButtonElement;
	private durationDisplay!: HTMLElement;

	// State
	private isRecording: boolean = false;

	constructor(options: RecordingControlsOptions) {
		this.canvas = options.canvas;
		this.container = options.container;

		// Initialize capture utilities
		this.canvasCapture = new CanvasCapture(this.canvas);
		this.videoRecorder = new VideoRecorder(this.canvas);

		// Set up video recorder callbacks
		this.videoRecorder.onStateChange = this.handleVideoStateChange.bind(this);
		this.videoRecorder.onError = this.handleVideoError.bind(this);

		// Create UI
		this.createControls(options);
	}

	private createControls(options: RecordingControlsOptions): void {
		// Create main controls container
		this.controlsElement = document.createElement('div');
		this.controlsElement.className = this.getContainerClasses(options);

		// Screenshot button
		this.screenshotButton = this.createButton('📷', 'Take Screenshot', () => {
			this.takeScreenshot();
		});

		// Video recording button
		this.videoButton = this.createButton('🔴', 'Start Recording', () => {
			this.toggleVideoRecording();
		});

		// Duration display
		this.durationDisplay = document.createElement('div');
		this.durationDisplay.className = 'text-xs text-gray-400 mt-1 font-mono';
		this.durationDisplay.textContent = '00:00';
		this.durationDisplay.style.display = 'none';

		// Add elements to container
		this.controlsElement.appendChild(this.screenshotButton);
		this.controlsElement.appendChild(this.videoButton);
		this.controlsElement.appendChild(this.durationDisplay);

		// Add to parent container
		this.container.appendChild(this.controlsElement);

		// Check if video recording is supported
		if (!VideoRecorder.isSupported()) {
			this.videoButton.disabled = true;
			this.videoButton.title = 'Video recording not supported in this browser';
			this.videoButton.style.opacity = '0.5';
		}
	}

	private createButton(
		text: string,
		title: string,
		onClick: () => void
	): HTMLButtonElement {
		const button = document.createElement('button');
		button.textContent = text;
		button.title = title;
		button.className = this.getButtonClasses();
		button.addEventListener('click', onClick);
		return button;
	}

	private getContainerClasses(options: RecordingControlsOptions): string {
		const position = options.position || 'top-left';
		const customClass = options.className || '';

		const baseClasses = 'fixed z-50 flex flex-col gap-2 p-3';

		const positionClasses = {
			'top-left': 'top-4 left-4',
			'top-right': 'top-4 right-4',
			'bottom-left': 'bottom-4 left-4',
			'bottom-right': 'bottom-4 right-4'
		};

		return `${baseClasses} ${positionClasses[position]} ${customClass}`;
	}

	private getButtonClasses(): string {
		return [
			'w-10 h-10',
			'bg-gray-800 hover:bg-gray-700',
			'text-white',
			'border border-gray-600',
			'rounded-lg',
			'cursor-pointer',
			'transition-colors duration-200',
			'flex items-center justify-center',
			'text-lg',
			'shadow-lg',
			'backdrop-blur-sm',
			'disabled:opacity-50 disabled:cursor-not-allowed'
		].join(' ');
	}

	private async takeScreenshot(): Promise<void> {
		try {
			this.screenshotButton.disabled = true;
			this.screenshotButton.textContent = '⏳';

			await this.canvasCapture.captureScreenshot({
				quality: 0.9,
				format: 'jpeg'
			});

			// Visual feedback
			this.screenshotButton.textContent = '✅';
			setTimeout(() => {
				this.screenshotButton.textContent = '📷';
				this.screenshotButton.disabled = false;
			}, 1000);

		} catch (error) {
			console.error('Screenshot failed:', error);
			this.screenshotButton.textContent = '❌';
			setTimeout(() => {
				this.screenshotButton.textContent = '📷';
				this.screenshotButton.disabled = false;
			}, 1000);
		}
	}

	private async toggleVideoRecording(): Promise<void> {
		if (this.isRecording) {
			this.stopVideoRecording();
		} else {
			await this.startVideoRecording();
		}
	}

	private async startVideoRecording(): Promise<void> {
		try {
			await this.videoRecorder.startRecording({
				quality: 'high',
				frameRate: 60
			});
		} catch (error) {
			console.error('Failed to start recording:', error);
			this.handleVideoError(error instanceof Error ? error : new Error('Recording failed'));
		}
	}

	private stopVideoRecording(): void {
		this.videoRecorder.stopRecording();
	}

	private handleVideoStateChange(state: RecordingState): void {
		this.isRecording = state.isRecording;

		if (state.isRecording) {
			this.videoButton.textContent = '⏹️';
			this.videoButton.title = 'Stop Recording';
			this.durationDisplay.style.display = 'block';
			this.durationDisplay.textContent = formatDuration(state.duration);
		} else {
			this.videoButton.textContent = '🔴';
			this.videoButton.title = 'Start Recording';
			this.durationDisplay.style.display = 'none';
		}
	}

	private handleVideoError(error: Error): void {
		console.error('Video recording error:', error);

		// Reset UI state
		this.isRecording = false;
		this.videoButton.textContent = '❌';
		this.videoButton.title = `Recording error: ${error.message}`;
		this.durationDisplay.style.display = 'none';

		// Reset button after delay
		setTimeout(() => {
			this.videoButton.textContent = '🔴';
			this.videoButton.title = 'Start Recording';
		}, 2000);
	}

	/**
	 * Clean up resources
	 */
	destroy(): void {
		if (this.isRecording) {
			this.videoRecorder.stopRecording();
		}

		if (this.controlsElement && this.controlsElement.parentNode) {
			this.controlsElement.parentNode.removeChild(this.controlsElement);
		}
	}

	/**
	 * Get current recording state
	 */
	getRecordingState(): RecordingState {
		return this.videoRecorder.getState();
	}

	/**
	 * Update position of controls
	 */
	updatePosition(position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): void {
		const positionClasses = {
			'top-left': 'top-4 left-4',
			'top-right': 'top-4 right-4',
			'bottom-left': 'bottom-4 left-4',
			'bottom-right': 'bottom-4 right-4'
		};

		// Remove all position classes
		Object.values(positionClasses).forEach(cls => {
			this.controlsElement.classList.remove(...cls.split(' '));
		});

		// Add new position classes
		this.controlsElement.classList.add(...positionClasses[position].split(' '));
	}
}

/**
 * Utility function to create recording controls
 */
export function createRecordingControls(options: RecordingControlsOptions): RecordingControls {
	return new RecordingControls(options);
}
