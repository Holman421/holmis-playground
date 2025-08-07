import * as THREE from 'three/webgpu';
import {
	uniform,
	texture,
	varying,
	max,
	min,
	smoothstep,
	vec2,
	vec3,
	vec4,
	positionLocal,
	uv,
	float,
	Fn,
	step,
	mix,
	sub,
	mul,
	add
} from 'three/tsl';

// Interfaces for font data and class options
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

interface MSDFTextOptions {
	text: string;
	fontTexturePath: string;
	fontDataPath: string;
	initialScale?: number;
	initialPadding?: number;
	initialLineSpacing?: number;
}

export class MSDFText {
	public mesh!: THREE.Mesh;
	public uniforms: {
		textScale: ReturnType<typeof uniform>;
		planePadding: ReturnType<typeof uniform>;
		lineSpacing: ReturnType<typeof uniform>;
	};

	private options: MSDFTextOptions;
	private fontTexture!: THREE.Texture;
	private fontData: any;
	private atlasWidth: number = 512;
	private atlasHeight: number = 512;
	private charMap!: Map<string, MsdfChar>;

	constructor(options: MSDFTextOptions) {
		this.options = options;

		// Initialize uniforms for external control (e.g., via Tweakpane)
		this.uniforms = {
			textScale: uniform(options.initialScale ?? 0.0025),
			planePadding: uniform(options.initialPadding ?? 2.0),
			lineSpacing: uniform(options.initialLineSpacing ?? 1.7)
		};
	}

	/** Loads font assets. Should be called once. */
	async loadAssets() {
		const [fontTexture, fontData] = await Promise.all([
			new THREE.TextureLoader().loadAsync(this.options.fontTexturePath),
			fetch(this.options.fontDataPath).then((res) => res.json())
		]);

		Object.assign(fontTexture, {
			magFilter: THREE.LinearFilter,
			minFilter: THREE.LinearFilter,
			wrapS: THREE.ClampToEdgeWrapping,
			wrapT: THREE.ClampToEdgeWrapping
		});

		if (!fontData?.chars?.length) throw new Error('Invalid font data');

		this.fontTexture = fontTexture;
		this.fontData = fontData;
		this.atlasWidth = fontData.atlas?.width ?? fontData.common?.scaleW ?? 512;
		this.atlasHeight = fontData.atlas?.height ?? fontData.common?.scaleH ?? 512;
		this.charMap = new Map(
			fontData.chars.map((char: MsdfChar) => [
				String.fromCharCode(char.id),
				char
			])
		);
	}

	/** Creates the text mesh. Can be called again to update geometry/layout. */
	public async createMesh() {
		// --- 1. Layout Calculation ---
		const { text } = this.options;
		const scale = this.uniforms.textScale.value as number;
		const lines = text.split('\n');

		const lineWidths = lines.map((line) => {
			let width = 0;
			for (const char of line) {
				if (char === ' ') {
					width += 20 * scale; // Approximate width for a space
					continue;
				}
				const charInfo = this.charMap.get(char);
				if (charInfo) width += charInfo.xadvance * scale;
			}
			return width;
		});
		const maxLineWidth = Math.max(...lineWidths);

		const lineData = lines.map((line, idx) => {
			const centeringOffset = (maxLineWidth - lineWidths[idx]) / 2;
			return this.processLine(line, scale, centeringOffset);
		});

		const lineCharacterData = lineData.map((d) => d.characters);
		const [line1ActualWidth, line2ActualWidth] = lineData.map(
			(d) => d.actualWidth
		);

		const avgCharHeight =
			this.fontData.chars.reduce((s: number, c: MsdfChar) => s + c.height, 0) /
			this.fontData.chars.length;
		const textLineHeight =
			avgCharHeight * scale * (this.uniforms.lineSpacing.value as number);
		const totalTextHeight = textLineHeight * lines.length;
		const totalWidth = maxLineWidth * (this.uniforms.planePadding.value as number);
		const totalHeight = totalTextHeight * (this.uniforms.planePadding.value as number);

		// --- 2. Geometry and Material Setup ---
		const geometry = new THREE.PlaneGeometry(totalWidth, totalHeight);

		const material = new THREE.NodeMaterial();
		Object.assign(material, {
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
			positionNode: positionLocal
		});

		// --- 3. Shader Logic (TSL) ---
		const fontShader = this.buildFontShader(
			lineCharacterData,
			[line1ActualWidth, line2ActualWidth],
			maxLineWidth
		);

		material.colorNode = Fn(() => {
			// Directly render the text without any other effects
			return fontShader(varying(uv()));
		})();

		// --- 4. Finalize Mesh ---
		if (this.mesh) this.dispose(); // Clean up old mesh if it exists
		this.mesh = new THREE.Mesh(geometry, material);
	}

	/** Helper to process a single line of text into character data */
	private processLine(line: string, scale: number, centeringOffset: number) {
		const characters: Array<{
			char: string;
			uvX1: number;
			uvY1: number;
			uvX2: number;
			uvY2: number;
			xPosition: number;
			width: number;
		}> = [];
		let currentLineWidth = centeringOffset;
		const SPACE_WIDTH = 20 * scale;

		for (const char of line) {
			if (char === ' ') {
				characters.push({
					char: ' ',
					xPosition: currentLineWidth,
					width: SPACE_WIDTH,
					uvX1: 0,
					uvY1: 0,
					uvX2: 0,
					uvY2: 0
				});
				currentLineWidth += SPACE_WIDTH;
				continue;
			}
			const charInfo = this.charMap.get(char);
			if (!charInfo) continue;

			characters.push({
				char,
				uvX1: charInfo.x / this.atlasWidth,
				uvY1: 1 - (charInfo.y + charInfo.height) / this.atlasHeight,
				uvX2: (charInfo.x + charInfo.width) / this.atlasWidth,
				uvY2: 1 - charInfo.y / this.atlasHeight,
				xPosition: currentLineWidth,
				width: charInfo.width * scale
			});
			currentLineWidth += charInfo.xadvance * scale;
		}
		return { characters, actualWidth: currentLineWidth };
	}

	// --- Shader Builder Functions ---
	private buildFontShader(
		lineCharacterData: any[][],
		actualWidths: number[],
		maxActualLineWidth: number
	) {
		// This shader is constructed here to have access to layout variables in its closure.
		return Fn(([texCoord]: any): any => {
			const lines = this.options.text.split('\n');
			const line1Characters = lineCharacterData[0] || [];
			const line2Characters = lineCharacterData[1] || [];

			// --- Start of MSDF Shader Logic (copied from original) ---
			const vLocalPos = varying(positionLocal);

			const paddingFactor = float(1.0).div(this.uniforms.planePadding);
			const paddedUV = texCoord
				.sub(0.5)
				.mul(this.uniforms.planePadding)
				.add(0.5);

			const isWithinPaddedArea = step(float(0.0), paddedUV.x)
				.mul(step(paddedUV.x, float(1.0)))
				.mul(step(float(0.0), paddedUV.y))
				.mul(step(paddedUV.y, float(1.0)));

			const numLines = float(lines.length);
			const lineSection = paddedUV.y.mul(numLines);
			const currentLineIndex = lineSection.floor();
			const yInSection = lineSection.fract();
			const lineContentRatio = float(1.0).div(this.uniforms.lineSpacing);
			const isWithinTextArea = step(yInSection, lineContentRatio);
			const yWithinLine = yInSection.div(lineContentRatio);

			const line1Width = float(actualWidths[0]);
			const line2Width = float(actualWidths[1]);
			const maxActualWidth = float(maxActualLineWidth);

			const isLine1 = step(currentLineIndex, float(0.5));
			const currentActualWidth = mix(line2Width, line1Width, isLine1);

			const lineWidthRatio = currentActualWidth.div(maxActualWidth);
			const adjustedX = paddedUV.x.div(lineWidthRatio);
			const isWithinLineWidth = step(adjustedX, float(1.0));
			const currentPixelX = adjustedX.mul(currentActualWidth);
			const isValidChar = step(currentPixelX, currentActualWidth)
				.mul(isWithinLineWidth)
				.mul(isWithinPaddedArea)
				.mul(isWithinTextArea);

			// Recursive-like TSL function to find the current character
			const buildLineUV = (
				characters: any[],
				index: number
			): { uvX1: any; uvY1: any; uvX2: any; uvY2: any; localU: any } => {
				if (index >= Math.min(characters.length, 20)) {
					// Limiting recursion depth for safety
					return {
						uvX1: float(0.0),
						uvY1: float(0.0),
						uvX2: float(0.0),
						uvY2: float(0.0),
						localU: float(0.0)
					};
				}
				const char = characters[index];
				const charStartPos = float(char.xPosition);
				const charEndPos = charStartPos.add(float(char.width));
				const charMask = step(charStartPos, currentPixelX).mul(
					step(currentPixelX, charEndPos)
				);
				const charLocalU = currentPixelX
					.sub(charStartPos)
					.div(float(char.width));
				const clampedLocalU = max(float(0.0), min(float(1.0), charLocalU));
				const nextUV = buildLineUV(characters, index + 1);
				return {
					uvX1: mix(nextUV.uvX1, float(char.uvX1), charMask),
					uvY1: mix(nextUV.uvY1, float(char.uvY1), charMask),
					uvX2: mix(nextUV.uvX2, float(char.uvX2), charMask),
					uvY2: mix(nextUV.uvY2, float(char.uvY2), charMask),
					localU: mix(nextUV.localU, clampedLocalU, charMask)
				};
			};

			const line1UV = buildLineUV(line1Characters, 0);
			const line2UV = buildLineUV(line2Characters, 0);
			const uvX1 = mix(line2UV.uvX1, line1UV.uvX1, isLine1);
			const uvY1 = mix(line2UV.uvY1, line1UV.uvY1, isLine1);
			const uvX2 = mix(line2UV.uvX2, line1UV.uvX2, isLine1);
			const uvY2 = mix(line2UV.uvY2, line1UV.uvY2, isLine1);
			const localU = mix(line2UV.localU, line1UV.localU, isLine1);

			const charUV = vec2(
				uvX1.add(localU.mul(uvX2.sub(uvX1))),
				uvY1.add(yWithinLine.mul(uvY2.sub(uvY1)))
			);
			const hasValidUV = step(float(0.001), uvX2.sub(uvX1)).mul(
				step(float(0.001), uvY2.sub(uvY1))
			);

			const fontSample = texture(this.fontTexture, charUV);
			const median = max(
				min(fontSample.r, fontSample.g),
				min(max(fontSample.r, fontSample.g), fontSample.b)
			);
			const textAlpha = smoothstep(float(0.45), float(0.55), median)
				.mul(isValidChar)
				.mul(hasValidUV);

			const bgColor = vec3(0.0);
			const textColor = vec3(1.0, 1.0, 1.0);
			const finalText = mix(bgColor, textColor, textAlpha);


			return vec4(finalText.add(0.0), 1.0);
		});
	}

	/** Cleans up GPU resources. */
	public dispose() {
		this.mesh?.geometry.dispose();
		if (this.mesh?.material) {
			(this.mesh.material as THREE.Material).dispose();
		}
	}
}
