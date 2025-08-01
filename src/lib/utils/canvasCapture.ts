/**
 * Canvas Screenshot Capture Utility
 * Provides functionality to capture and download canvas screenshots as JPG images
 */

export interface ScreenshotOptions {
	quality?: number; // JPEG quality (0.0 to 1.0)
	filename?: string;
	format?: 'jpeg' | 'png' | 'webp';
}

export class CanvasCapture {
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	/**
	 * Capture a screenshot of the canvas and download it
	 */
	captureScreenshot(options: ScreenshotOptions = {}): void {
		const {
			quality = 0.9,
			filename = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
			format = 'jpeg'
		} = options;

		try {
			// Get the canvas data as a data URL
			const mimeType = `image/${format}`;
			const dataUrl = this.canvas.toDataURL(mimeType, quality);

			// Create a download link
			const link = document.createElement('a');
			link.download = `${filename}.${format === 'jpeg' ? 'jpg' : format}`;
			link.href = dataUrl;

			// Trigger download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			console.log(`Screenshot captured: ${link.download}`);
		} catch (error) {
			console.error('Failed to capture screenshot:', error);
			throw new Error('Screenshot capture failed');
		}
	}

	/**
	 * Get canvas data as blob for custom handling
	 */
	async getCanvasBlob(options: ScreenshotOptions = {}): Promise<Blob> {
		const {
			quality = 0.9,
			format = 'jpeg'
		} = options;

		return new Promise((resolve, reject) => {
			const mimeType = `image/${format}`;
			this.canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error('Failed to create blob from canvas'));
					}
				},
				mimeType,
				quality
			);
		});
	}

	/**
	 * Get canvas data URL for preview or custom handling
	 */
	getCanvasDataUrl(options: ScreenshotOptions = {}): string {
		const {
			quality = 0.9,
			format = 'jpeg'
		} = options;

		const mimeType = `image/${format}`;
		return this.canvas.toDataURL(mimeType, quality);
	}
}

/**
 * Utility function to create a screenshot capture instance
 */
export function createCanvasCapture(canvas: HTMLCanvasElement): CanvasCapture {
	return new CanvasCapture(canvas);
}
