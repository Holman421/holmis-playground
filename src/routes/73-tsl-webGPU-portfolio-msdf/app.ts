import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/Tweakpane/utils';
import {
	uniform,
	texture,
	varying,
	max,
	min,
	dFdx,
	dFdy,
	smoothstep,
	vec2,
	vec3,
	vec4,
	positionLocal,
	uv,
	float,
	Fn,
	step,
	mix
} from 'three/tsl';

interface SketchOptions {
	dom: HTMLElement;
}

// Interfaces for MSDF font data
interface MsdfChar {
	id: number;
	x: number;
	y: number;
	width: number;
	height: number;
	xoffset: number;
	yoffset: number;
	xadvance: number;
}

interface MsdfInfo {
	atlas: {
		width: number;
		height: number;
	};
	metrics: {
		lineHeight: number;
	};
	common?: {
		scaleW: number;
		scaleH: number;
	};
	chars: MsdfChar[];
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
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	textMesh!: THREE.Mesh;

	// Text control uniforms
	textScale = uniform(0.0025);
	planePadding = uniform(2.0);
	lineSpacing = uniform(1.45);

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
		this.camera.position.set(0, 0, 3);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.isPlaying = true;
		this.setupLights();
		this.resize();
		this.setUpSettings();
		this.init();
	}

	async init() {
		await this.renderer.init();
		await this.createText();
		this.render();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		this.pointLight = new THREE.PointLight(0xffffff, 10);
		this.pointLight.position.set(1, 0.5, 7);
		this.scene.add(this.pointLight);
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

	async createText() {
		try {
			// Load font assets
			const [fontTexture, fontData] = await Promise.all([
				new THREE.TextureLoader().loadAsync('/fonts/font.png'),
				fetch('/fonts/font.json').then(res => res.json())
			]);

			// Configure texture
			Object.assign(fontTexture, {
				magFilter: THREE.LinearFilter,
				minFilter: THREE.LinearFilter,
				wrapS: THREE.ClampToEdgeWrapping,
				wrapT: THREE.ClampToEdgeWrapping
			});

			if (!fontData?.chars?.length) {
				throw new Error('Invalid font data');
			}

			const charMap = new Map(fontData.chars.map((char: MsdfChar) => [String.fromCharCode(char.id), char]));
			const atlasWidth = fontData.atlas?.width ?? fontData.common?.scaleW ?? 512;
			const atlasHeight = fontData.atlas?.height ?? fontData.common?.scaleH ?? 512;

			// Process text into character data - separate by lines
			const text = 'BORING WEBSITES\nI DONT LIKE';

			const scale = this.textScale.value;
			const lines = text.split('\n');
			console.log('Lines:', lines); // Debug: check line splitting
			console.log('Line lengths:', lines.map(line => line.length)); // Debug: check line lengths

			// Create separate character arrays for each line with proper positioning
			const line1Characters: Array<{
				char: string;
				uvX1: number; uvY1: number; uvX2: number; uvY2: number;
				xPosition: number; // Actual position of this character in the line
				width: number; // Actual width of this character
			}> = [];

			const line2Characters: Array<{
				char: string;
				uvX1: number; uvY1: number; uvX2: number; uvY2: number;
				xPosition: number; // Actual position of this character in the line
				width: number; // Actual width of this character
			}> = [];

			// Process each line separately and calculate actual widths
			let line1ActualWidth = 0;
			let line2ActualWidth = 0;

			// First pass: calculate line widths to determine centering offsets
			const lineWidths: number[] = [];
			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				let lineWidth = 0;

				for (const char of line) {
					if (char === ' ') {
						lineWidth += 20 * scale;
						continue;
					}

					const charInfo = charMap.get(char) as MsdfChar;
					if (!charInfo) continue;

					lineWidth += charInfo.xadvance * scale;
				}
				lineWidths.push(lineWidth);
			}

			const maxLineWidth = Math.max(...lineWidths);

			// Second pass: process characters with centering offsets
			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				const targetArray = lineIndex === 0 ? line1Characters : line2Characters;

				// Calculate centering offset for this line
				const lineWidth = lineWidths[lineIndex];
				const centeringOffset = (maxLineWidth - lineWidth) / 2;
				let currentLineWidth = centeringOffset;

				for (const char of line) {
					if (char === ' ') {
						const spaceWidth = 20 * scale;
						// Add a space character entry with empty UV coordinates
						targetArray.push({
							char: ' ',
							uvX1: 0,
							uvY1: 0,
							uvX2: 0,
							uvY2: 0,
							xPosition: currentLineWidth,
							width: spaceWidth
						});
						currentLineWidth += spaceWidth;
						continue;
					}

					const charInfo = charMap.get(char) as MsdfChar;
					if (!charInfo) continue;

					const { x, y, width, height, xadvance } = charInfo;
					// Use actual character width based on its pixel dimensions, not just xadvance
					const charWidth = width * scale;

					// Calculate UV coordinates (flip Y for WebGL)
					targetArray.push({
						char,
						uvX1: x / atlasWidth,
						uvY1: 1 - (y + height) / atlasHeight,
						uvX2: (x + width) / atlasWidth,
						uvY2: 1 - y / atlasHeight,
						xPosition: currentLineWidth,
						width: charWidth
					});

					currentLineWidth += xadvance * scale; // Use xadvance for spacing, but width for rendering
				}

				// Store the actual width for each line (including centering offset)
				if (lineIndex === 0) {
					line1ActualWidth = currentLineWidth;
				} else if (lineIndex === 1) {
					line2ActualWidth = currentLineWidth;
				}
			}

			// Use the maximum line width for consistent geometry
			const maxActualLineWidth = maxLineWidth;

			console.log('Line 1 characters:', line1Characters.map(c => c.char)); // Debug
			console.log('Line 2 characters:', line2Characters.map(c => c.char)); // Debug
			console.log('Line 1 actual width:', line1ActualWidth); // Debug
			console.log('Line 2 actual width:', line2ActualWidth); // Debug

			// Use actual font metrics for proper proportions
			const fontLineHeight = fontData.metrics?.lineHeight || fontData.common?.lineHeight || 64;
			const lineHeight = fontLineHeight * scale * this.lineSpacing.value;

			// Calculate geometry dimensions using actual text width and proper aspect ratio
			const textWidth = maxActualLineWidth;
			const totalTextHeight = lineHeight * lines.length;

			// Calculate proper aspect ratio based on font metrics
			const fontAspectRatio = fontLineHeight / (fontData.common?.scaleW || atlasWidth);

			// Create geometry and material using uniforms with proper padding
			const totalWidth = textWidth * this.planePadding.value;
			const totalHeight = totalTextHeight * this.planePadding.value;

			const geometry = new THREE.PlaneGeometry(totalWidth, totalHeight);
			const material = new THREE.NodeMaterial();
			Object.assign(material, {
				transparent: true,
				side: THREE.DoubleSide,
				depthWrite: false,
				positionNode: positionLocal
			});

			// Create shader with varyings
			const vUv = varying(uv());
			const vLocalPos = varying(positionLocal);

			// Simplified shader with clear line separation and proper padding
			material.colorNode = Fn(() => {
				const texCoord = vUv;
				const localPos = vLocalPos;

				// Account for padding - map UV coordinates to the inner text area
				const paddingFactor = float(1.0).div(this.planePadding);
				const paddedUV = texCoord.sub(0.5).mul(this.planePadding).add(0.5);

				// Only render within the padded area
				const isWithinPaddedArea = step(float(0.0), paddedUV.x).mul(step(paddedUV.x, float(1.0)))
					.mul(step(float(0.0), paddedUV.y)).mul(step(paddedUV.y, float(1.0)));

				// Calculate which line we're on (0 = top line, 1 = bottom line)
				const numLines = float(lines.length);

				// Simple approach: divide Y space into line sections with spacing
				const lineSection = paddedUV.y.mul(numLines);
				const currentLineIndex = lineSection.floor();

				// Calculate position within each line section
				const yInSection = lineSection.fract();

				// Use line spacing to create gaps - only render in the first part of each section
				const lineContentRatio = float(1.0).div(this.lineSpacing);
				const isWithinTextArea = step(yInSection, lineContentRatio);
				const yWithinLine = yInSection.div(lineContentRatio);

				// Line character counts and actual widths
				const line1Length = float(line1Characters.length);
				const line2Length = float(line2Characters.length);
				const line1Width = float(line1ActualWidth);
				const line2Width = float(line2ActualWidth);
				const maxActualWidth = float(maxActualLineWidth);

				// Determine which line we're on and get the correct line properties
				const isLine1 = step(currentLineIndex, float(0.5));
				const currentLineLength = mix(line2Length, line1Length, isLine1);
				const currentActualWidth = mix(line2Width, line1Width, isLine1);

				// Calculate the line width ratio based on actual pixel widths
				const lineWidthRatio = currentActualWidth.div(maxActualWidth);

				// Adjust UV coordinates so shorter lines don't stretch across full width
				// Map paddedUV.x to only the portion of width that this line should occupy
				const adjustedX = paddedUV.x.div(lineWidthRatio);

				// Only render if we're within the actual line width
				const isWithinLineWidth = step(adjustedX, float(1.0));

				// Character position within the current line (using adjusted coordinates)
				const currentPixelX = adjustedX.mul(currentActualWidth);

				// Hide characters beyond the actual line length and outside padded area
				const isValidChar = step(currentPixelX, currentActualWidth)
					.mul(isWithinLineWidth)
					.mul(isWithinPaddedArea)
					.mul(isWithinTextArea);

				// Build character selection for line 1 based on position
				const buildLine1UV = (index: number): { uvX1: any, uvY1: any, uvX2: any, uvY2: any, localU: any } => {
					if (index >= Math.min(line1Characters.length, 20)) {
						return {
							uvX1: float(0.0),
							uvY1: float(0.0),
							uvX2: float(0.0),
							uvY2: float(0.0),
							localU: float(0.0)
						};
					}

					const char = line1Characters[index];
					const charStartPos = float(char.xPosition);
					const charEndPos = charStartPos.add(float(char.width));

					// Use smoothstep for smoother character boundaries instead of hard step
					const charMask = step(charStartPos, currentPixelX).mul(step(currentPixelX, charEndPos));

					// Calculate local U position within this character (0.0 to 1.0)
					const charLocalU = currentPixelX.sub(charStartPos).div(float(char.width));
					const clampedLocalU = max(float(0.0), min(float(1.0), charLocalU));

					const nextUV = buildLine1UV(index + 1);

					return {
						uvX1: mix(nextUV.uvX1, float(char.uvX1), charMask),
						uvY1: mix(nextUV.uvY1, float(char.uvY1), charMask),
						uvX2: mix(nextUV.uvX2, float(char.uvX2), charMask),
						uvY2: mix(nextUV.uvY2, float(char.uvY2), charMask),
						localU: mix(nextUV.localU, clampedLocalU, charMask)
					};
				};

				// Build character selection for line 2 based on position
				const buildLine2UV = (index: number): { uvX1: any, uvY1: any, uvX2: any, uvY2: any, localU: any } => {
					if (index >= Math.min(line2Characters.length, 20)) {
						return {
							uvX1: float(0.0),
							uvY1: float(0.0),
							uvX2: float(0.0),
							uvY2: float(0.0),
							localU: float(0.0)
						};
					}

					const char = line2Characters[index];
					const charStartPos = float(char.xPosition);
					const charEndPos = charStartPos.add(float(char.width));

					// Use smoothstep for smoother character boundaries instead of hard step
					const charMask = step(charStartPos, currentPixelX).mul(step(currentPixelX, charEndPos));

					// Calculate local U position within this character (0.0 to 1.0)
					const charLocalU = currentPixelX.sub(charStartPos).div(float(char.width));
					const clampedLocalU = max(float(0.0), min(float(1.0), charLocalU));

					const nextUV = buildLine2UV(index + 1);

					return {
						uvX1: mix(nextUV.uvX1, float(char.uvX1), charMask),
						uvY1: mix(nextUV.uvY1, float(char.uvY1), charMask),
						uvX2: mix(nextUV.uvX2, float(char.uvX2), charMask),
						uvY2: mix(nextUV.uvY2, float(char.uvY2), charMask),
						localU: mix(nextUV.localU, clampedLocalU, charMask)
					};
				};

				// Select UV based on current line
				const line1UV = buildLine1UV(0);
				const line2UV = buildLine2UV(0);

				const uvX1 = mix(line2UV.uvX1, line1UV.uvX1, isLine1);
				const uvY1 = mix(line2UV.uvY1, line1UV.uvY1, isLine1);
				const uvX2 = mix(line2UV.uvX2, line1UV.uvX2, isLine1);
				const uvY2 = mix(line2UV.uvY2, line1UV.uvY2, isLine1);
				const localU = mix(line2UV.localU, line1UV.localU, isLine1);

				// Sample and render with proper character positioning
				const charUV = vec2(
					uvX1.add(localU.mul(uvX2.sub(uvX1))),
					uvY1.add(yWithinLine.mul(uvY2.sub(uvY1)))
				);

				// Only sample if we have valid UV coordinates (avoid sampling (0,0) which causes artifacts)
				const hasValidUV = step(float(0.001), uvX2.sub(uvX1)).mul(step(float(0.001), uvY2.sub(uvY1)));

				const fontSample = texture(fontTexture, charUV);
				const median = max(min(fontSample.r, fontSample.g), min(max(fontSample.r, fontSample.g), fontSample.b));
				const textAlpha = smoothstep(float(0.45), float(0.55), median).mul(isValidChar).mul(hasValidUV);

				// Background gradient
				const gradientFactor = localPos.x.add(1.0).mul(0.5);
				const bgColor = vec3(gradientFactor.mul(0.3), gradientFactor.oneMinus().mul(0.2), float(0.15));
				const textColor = vec3(1.0, 1.0, 1.0);

				return vec4(mix(bgColor, textColor, textAlpha), max(textAlpha, float(0.1)));
			})();

			// Create and add mesh
			this.textMesh = new THREE.Mesh(geometry, material);
			this.scene.add(this.textMesh);
		} catch (error) {
			console.error('Error creating text:', error);
		}
	}

	async updateTextGeometry() {
		// Remove existing text mesh
		if (this.textMesh) {
			this.scene.remove(this.textMesh);
			this.textMesh.geometry.dispose();
			if (Array.isArray(this.textMesh.material)) {
				this.textMesh.material.forEach(mat => mat.dispose());
			} else {
				this.textMesh.material.dispose();
			}
		}

		// Recreate text with new uniform values
		await this.createText();
	}

	setUpSettings() {
		this.pane = new Pane();

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight,
			name: 'Point Light',
			scene: this.scene,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 }
		});

		// Add text control uniforms to the pane
		const textFolder = this.pane.addFolder({ title: 'Text Controls' });

		// Add uniform controls with update callbacks
		textFolder.addBinding(this.textScale, 'value', {
			label: 'Text Scale',
			min: 0.001,
			max: 0.01,
			step: 0.0001
		}).on('change', () => this.updateTextGeometry());

		textFolder.addBinding(this.planePadding, 'value', {
			label: 'Plane Padding',
			min: 1.0,
			max: 5.0,
			step: 0.1
		}).on('change', () => this.updateTextGeometry());

		textFolder.addBinding(this.lineSpacing, 'value', {
			label: 'Line Spacing',
			min: 0.5,
			max: 5.0,
			step: 0.1
		}).on('change', () => this.updateTextGeometry());

	}

	async render() {
		if (!this.isPlaying) return;

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
