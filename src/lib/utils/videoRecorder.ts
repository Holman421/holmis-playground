/**
 * Canvas Video Recording Utility
 * Provides functionality to record canvas animations as video files
 * Uses modern MediaRecorder API for efficient video capture
 */

export interface VideoRecordingOptions {
	filename?: string;
	mimeType?: string;
	videoBitsPerSecond?: number;
	frameRate?: number;
	quality?: 'low' | 'medium' | 'high';
}

export interface RecordingState {
	isRecording: boolean;
	isPaused: boolean;
	duration: number;
	startTime: number | null;
}

export class VideoRecorder {
	private canvas: HTMLCanvasElement;
	private mediaRecorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;
	private recordedChunks: Blob[] = [];
	private startTime: number = 0;
	private animationFrame: number | null = null;
	
	// State
	private _isRecording: boolean = false;
	private _isPaused: boolean = false;
	private _duration: number = 0;

	// Event callbacks
	public onStateChange?: (state: RecordingState) => void;
	public onError?: (error: Error) => void;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	/**
	 * Start recording the canvas
	 */
	async startRecording(options: VideoRecordingOptions = {}): Promise<void> {
		if (this._isRecording) {
			console.warn('Recording is already in progress');
			return;
		}

		const {
			mimeType = this.getBestMimeType(),
			videoBitsPerSecond = this.getBitrate(options.quality || 'high'),
			frameRate = 60
		} = options;

		try {
			// Create media stream from canvas
			this.stream = this.canvas.captureStream(frameRate);
			
			if (!this.stream) {
				throw new Error('Failed to capture stream from canvas');
			}

			// Create MediaRecorder
			const mediaRecorderOptions: MediaRecorderOptions = {
				mimeType,
				videoBitsPerSecond
			};

			this.mediaRecorder = new MediaRecorder(this.stream, mediaRecorderOptions);
			this.recordedChunks = [];

			// Set up event handlers
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.recordedChunks.push(event.data);
				}
			};

			this.mediaRecorder.onstop = () => {
				this.handleRecordingStop(options);
			};

			this.mediaRecorder.onerror = (event) => {
				const error = new Error(`MediaRecorder error: ${event}`);
				console.error('MediaRecorder error:', error);
				this.onError?.(error);
			};

			// Start recording
			this.mediaRecorder.start(100); // Collect data every 100ms
			this.startTime = Date.now();
			this._isRecording = true;
			this._duration = 0;

			// Start duration tracking
			this.updateDuration();

			this.notifyStateChange();
			console.log('Video recording started');

		} catch (error) {
			const recordingError = error instanceof Error ? error : new Error('Failed to start recording');
			console.error('Failed to start video recording:', recordingError);
			this.onError?.(recordingError);
			throw recordingError;
		}
	}

	/**
	 * Stop recording and download the video
	 */
	stopRecording(): void {
		if (!this._isRecording || !this.mediaRecorder) {
			console.warn('No recording in progress');
			return;
		}

		this.mediaRecorder.stop();
		this._isRecording = false;
		this._isPaused = false;

		// Stop duration tracking
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}

		// Stop all tracks in the stream
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
		}

		this.notifyStateChange();
		console.log('Video recording stopped');
	}

	/**
	 * Pause recording (if supported by browser)
	 */
	pauseRecording(): void {
		if (!this._isRecording || !this.mediaRecorder) {
			console.warn('No recording in progress');
			return;
		}

		if (this.mediaRecorder.state === 'recording') {
			this.mediaRecorder.pause();
			this._isPaused = true;
			this.notifyStateChange();
			console.log('Video recording paused');
		}
	}

	/**
	 * Resume recording (if supported by browser)
	 */
	resumeRecording(): void {
		if (!this._isRecording || !this.mediaRecorder) {
			console.warn('No recording in progress');
			return;
		}

		if (this.mediaRecorder.state === 'paused') {
			this.mediaRecorder.resume();
			this._isPaused = false;
			this.notifyStateChange();
			console.log('Video recording resumed');
		}
	}

	/**
	 * Get current recording state
	 */
	getState(): RecordingState {
		return {
			isRecording: this._isRecording,
			isPaused: this._isPaused,
			duration: this._duration,
			startTime: this.startTime
		};
	}

	/**
	 * Check if recording is supported
	 */
	static isSupported(): boolean {
		return !!(
			navigator.mediaDevices &&
			MediaRecorder &&
			HTMLCanvasElement.prototype.captureStream
		);
	}

	/**
	 * Get supported MIME types
	 */
	static getSupportedMimeTypes(): string[] {
		const types = [
			'video/mp4;codecs=h264',
			'video/mp4;codecs=avc1.42E01E',
			'video/mp4;codecs=avc1.640028',
			'video/mp4',
			'video/webm;codecs=vp9',
			'video/webm;codecs=vp8',
			'video/webm'
		];

		return types.filter(type => MediaRecorder.isTypeSupported(type));
	}

	/**
	 * Private methods
	 */
	private getBestMimeType(): string {
		const supportedTypes = VideoRecorder.getSupportedMimeTypes();
		return supportedTypes[0] || 'video/webm';
	}

	private getBitrate(quality: 'low' | 'medium' | 'high'): number {
		const bitrates = {
			low: 2500000,    // 2.5 Mbps
			medium: 8000000, // 8 Mbps
			high: 20000000   // 20 Mbps
		};
		return bitrates[quality];
	}

	private updateDuration(): void {
		if (!this._isRecording) return;

		this._duration = Date.now() - this.startTime;
		this.notifyStateChange();

		this.animationFrame = requestAnimationFrame(() => this.updateDuration());
	}

	private handleRecordingStop(options: VideoRecordingOptions): void {
		if (this.recordedChunks.length === 0) {
			console.warn('No recorded data available');
			return;
		}

		try {
			// Create blob from recorded chunks
			const blob = new Blob(this.recordedChunks, {
				type: this.getBestMimeType()
			});

			// Generate filename
			const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
			const filename = options.filename || `recording-${timestamp}`;
			const extension = this.getFileExtension(this.getBestMimeType());

			// Create download link
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${filename}.${extension}`;

			// Trigger download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Clean up
			URL.revokeObjectURL(url);

			console.log(`Video downloaded: ${link.download}`);
		} catch (error) {
			const downloadError = error instanceof Error ? error : new Error('Failed to download video');
			console.error('Failed to download video:', downloadError);
			this.onError?.(downloadError);
		}
	}

	private getFileExtension(mimeType: string): string {
		if (mimeType.includes('mp4')) return 'mp4';
		if (mimeType.includes('webm')) return 'webm';
		return 'mp4'; // fallback to mp4
	}

	private notifyStateChange(): void {
		this.onStateChange?.(this.getState());
	}
}

/**
 * Utility function to create a video recorder instance
 */
export function createVideoRecorder(canvas: HTMLCanvasElement): VideoRecorder {
	return new VideoRecorder(canvas);
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
	}
	return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}
