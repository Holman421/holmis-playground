import * as THREE from 'three/webgpu';
import {
	uniform,
	texture,
	varying,
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
	max,
	min
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
	initialEdgeCenter?: number; // MSDF median threshold center
	initialEdgeWidth?: number; // Width around center
}

interface ProcessedLineChar {
	char: string;
	uvX1: number;
	uvY1: number;
	uvX2: number;
	uvY2: number;
	xPosition: number;
	width: number;
}

export class MSDFText {
	public mesh!: THREE.Mesh;
	public uniforms = {
		textScale: uniform(0.0025),
		planePadding: uniform(4.0),
		lineSpacing: uniform(1.7),
		edgeCenter: uniform(0.5),
		edgeWidth: uniform(0.1),
		showCircles: uniform(1),
		circleRadius: uniform(0.4),
		circleFeather: uniform(1.5),
		charHeight: uniform(0.0), // average glyph pixel height * scale (baseline to top approximation)
		glyphPad: uniform(0.0), // extra horizontal padding for debug circle mask (in glyph width units after scale)
		glyphPadY: uniform(0.0) // vertical padding for circle presence (does not affect layout)
	};

	private options: MSDFTextOptions;
	private fontTexture!: THREE.Texture;
	private fontData: any;
	private atlasWidth = 512;
	private atlasHeight = 512;
	private charMap!: Map<string, MsdfChar>;

	// Cached layout data to allow shader-only rebuilds
	private lineCharacterData: ProcessedLineChar[][] = [];
	private lineActualWidths: number[] = [];
	private maxLineWidth = 0;
	private totalWidth = 0;
	private totalHeight = 0;

	constructor(options: MSDFTextOptions) {
		this.options = options;
		Object.assign(this.uniforms, {
			textScale: uniform(options.initialScale ?? 0.0025),
			planePadding: uniform(options.initialPadding ?? 4.0),
			lineSpacing: uniform(options.initialLineSpacing ?? 1.7),
			edgeCenter: uniform(options.initialEdgeCenter ?? 0.5),
			edgeWidth: uniform(options.initialEdgeWidth ?? 0.1),
			showCircles: uniform(1),
			circleRadius: uniform(0.4),
			circleFeather: uniform(1.5),
			glyphPad: uniform(0.0),
			glyphPadY: uniform(0.0)
		});
	}

	/** Loads font assets. Should be called once. */
	async loadAssets() {
		const [fontTexture, fontData] = await Promise.all([
			new THREE.TextureLoader().loadAsync(this.options.fontTexturePath),
			fetch(this.options.fontDataPath).then((r) => r.json())
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
			fontData.chars.map((c: MsdfChar) => [String.fromCharCode(c.id), c])
		);
	}

	/** Public API to change text. Forces full layout + geometry update. */
	public async setText(text: string) {
		if (text !== this.options.text) {
			this.options.text = text;
			await this.createMesh(true);
		}
	}

	/** Update parameters that only affect layout/shader. Geometry remains unless text changed. */
	public async updateParameters(
		p: Partial<{
			textScale: number;
			planePadding: number;
			lineSpacing: number;
			edgeCenter: number;
			edgeWidth: number;
			showCircles: number;
			circleRadius: number;
			circleFeather: number;
			glyphPad: number;
			glyphPadY: number;
		}>
	) {
		let relayout = false;
		let shaderOnly = false;
		if (p.textScale !== undefined) {
			this.uniforms.textScale.value = p.textScale;
			relayout = true;
		}
		if (p.planePadding !== undefined)
			this.uniforms.planePadding.value = p.planePadding;
		if (p.lineSpacing !== undefined) {
			this.uniforms.lineSpacing.value = p.lineSpacing;
			relayout = true;
		}
		if (p.edgeCenter !== undefined) {
			this.uniforms.edgeCenter.value = p.edgeCenter;
			shaderOnly = true;
		}
		if (p.edgeWidth !== undefined) {
			this.uniforms.edgeWidth.value = p.edgeWidth;
			shaderOnly = true;
		}
		if (p.showCircles !== undefined) {
			this.uniforms.showCircles.value = p.showCircles;
			shaderOnly = true;
		}
		if (p.circleRadius !== undefined) {
			this.uniforms.circleRadius.value = p.circleRadius;
			shaderOnly = true;
		}
		if (p.circleFeather !== undefined) {
			this.uniforms.circleFeather.value = p.circleFeather;
			shaderOnly = true;
		}
		if (relayout) {
			this.computeLayout();
			this.rebuildShader();
		} else if (shaderOnly) {
			this.rebuildShader();
		}
	}

	private get spaceAdvance(): number {
		// derive from metrics (id 32) else fallback
		const space = this.charMap.get(' ');
		return (space?.xadvance ?? 20) * (this.uniforms.textScale.value as number);
	}

	private computeLineWidth(line: string, scale: number) {
		return Array.from(line).reduce((w, ch) => {
			if (ch === ' ') return w + this.spaceAdvance;
			const info = this.charMap.get(ch);
			return info ? w + info.xadvance * scale : w;
		}, 0);
	}

	private processLine(line: string, scale: number, offset: number) {
		const chars: ProcessedLineChar[] = [];
		let x = offset;
		const SPACE = this.spaceAdvance;
		for (const ch of line) {
			if (ch === ' ') {
				chars.push({
					char: ' ',
					xPosition: x,
					width: SPACE,
					uvX1: 0,
					uvY1: 0,
					uvX2: 0,
					uvY2: 0
				});
				x += SPACE;
				continue;
			}
			const c = this.charMap.get(ch);
			if (!c) continue;
			const w = c.width * scale;
			chars.push({
				char: ch,
				xPosition: x,
				width: w,
				uvX1: c.x / this.atlasWidth,
				uvY1: 1 - (c.y + c.height) / this.atlasHeight,
				uvX2: (c.x + c.width) / this.atlasWidth,
				uvY2: 1 - c.y / this.atlasHeight
			});
			x += c.xadvance * scale;
		}
		return { characters: chars, actualWidth: x };
	}

	private computeLayout() {
		const scale = this.uniforms.textScale.value as number;
		const lines = this.options.text.split('\n');
		const widths = lines.map((l) => this.computeLineWidth(l, scale));
		this.maxLineWidth = Math.max(0, ...widths);
		const processed = lines.map((l, i) =>
			this.processLine(l, scale, (this.maxLineWidth - widths[i]) / 2)
		);
		this.lineCharacterData = processed.map((p) => p.characters);
		this.lineActualWidths = processed.map((p) => p.actualWidth);
		const avgCharHeight =
			this.fontData.chars.reduce((s: number, c: MsdfChar) => s + c.height, 0) /
			this.fontData.chars.length;
		const baseCharHeight = avgCharHeight * scale; // height of glyph box (without extra line spacing multiplier)
		const lineH = baseCharHeight * (this.uniforms.lineSpacing.value as number);
		const h = lineH * lines.length;
		const pad = this.uniforms.planePadding.value as number;
		this.totalWidth = this.maxLineWidth * pad;
		this.totalHeight = h * pad;
		// store for shader (used to build 2D circle distance)
		this.uniforms.charHeight.value = baseCharHeight;
	}

	/** Creates the text mesh. Rebuild geometry only when forceGeometry is true or mesh missing. */
	public async createMesh(forceGeometry = false) {
		this.computeLayout();
		if (!this.mesh || forceGeometry) {
			// --- Geometry and base material setup (one-time) ---
			const geom = new THREE.PlaneGeometry(this.totalWidth, this.totalHeight);
			const mat = new THREE.NodeMaterial();
			Object.assign(mat, {
				transparent: true,
				side: THREE.DoubleSide,
				depthWrite: false,
				positionNode: positionLocal
			});

			this.dispose();
			this.mesh = new THREE.Mesh(geom, mat);
		} else {
			// Optionally adjust geometry scale to approximate new bounds without full recreation
			const g = this.mesh.geometry as THREE.PlaneGeometry;
			const p = g.parameters;
			this.mesh.scale.set(
				this.totalWidth / p.width,
				this.totalHeight / p.height,
				1
			);
		}
		this.rebuildShader();
	}

	/** Rebuild only the shader graph (colorNode) based on latest layout data. */
	private rebuildShader() {
		if (!this.mesh) return;
		const mat = this.mesh.material as THREE.NodeMaterial;
		mat.colorNode = this.buildFontShader(
			this.lineCharacterData,
			this.lineActualWidths,
			this.maxLineWidth
		)();
		mat.needsUpdate = true;
	}

	/** Helper to process a single line of text into character data */
	private buildFontShader(
		lineCharacterData: ProcessedLineChar[][],
		actualWidths: number[],
		maxActualLineWidth: number
	) {
		return Fn((): any => {
			const texCoord = varying(uv());
			const lines = this.options.text.split('\n');
			const l1 = lineCharacterData[0] || [];
			const l2 = lineCharacterData[1] || [];
			varying(positionLocal);
			const paddedUV = texCoord
				.sub(0.5)
				.mul(this.uniforms.planePadding)
				.add(0.5);
			const inPad = step(float(0.0), paddedUV.x)
				.mul(step(paddedUV.x, float(1.0)))
				.mul(step(float(0.0), paddedUV.y))
				.mul(step(paddedUV.y, float(1.0)));
			const numLines = float(lines.length);
			const section = paddedUV.y.mul(numLines);
			const lineIndex = section.floor();
			const frac = section.fract();
			const contentRatio = float(1.0).div(this.uniforms.lineSpacing);
			const inTextY = step(frac, contentRatio);
			const yWithinLine = frac.div(contentRatio);
			const yLocal = max(float(0.0), min(float(1.0), yWithinLine));
			const w1 = float(actualWidths[0] || 0.0),
				w2 = float(actualWidths[1] || 0.0),
				wMax = float(maxActualLineWidth || 1.0);
			const isLine1 = step(lineIndex, float(0.5));
			const cw = mix(w2, w1, isLine1);
			const ratio = cw.div(wMax.max(float(0.00001)));
			const adjX = paddedUV.x.div(ratio.max(float(0.00001)));
			const inWidth = step(adjX, float(1.0));
			const pixelX = adjX.mul(cw);
			const validChar = step(pixelX, cw).mul(inWidth).mul(inPad).mul(inTextY);

			// Character picker (same as before, returns centerX & width)
			const pick = (chars: any[], i: number): any =>
				i >= Math.min(chars.length, 64)
					? {
							uvX1: float(0),
							uvY1: float(0),
							uvX2: float(0),
							uvY2: float(0),
							localU: float(0),
							centerX: float(0),
							width: float(1.0)
						}
					: (() => {
							const c = chars[i];
							const xs = float(c.xPosition),
								w = float(c.width),
								xe = xs.add(w);
							const mask = step(xs, pixelX).mul(step(pixelX, xe));
							const localU = pixelX.sub(xs).div(w.max(float(0.00001)));
							const clamped = max(float(0.0), min(float(1.0), localU));
							const next = pick(chars, i + 1);
							const cx = xs.add(w.mul(0.5));
							return {
								uvX1: mix(next.uvX1, float(c.uvX1), mask),
								uvY1: mix(next.uvY1, float(c.uvY1), mask),
								uvX2: mix(next.uvX2, float(c.uvX2), mask),
								uvY2: mix(next.uvY2, float(c.uvY2), mask),
								localU: mix(next.localU, clamped, mask),
								centerX: mix(next.centerX, cx, mask),
								width: mix(next.width, w, mask)
							};
						})();

			const p1 = pick(l1, 0),
				p2 = pick(l2, 0);
			const uvX1 = mix(p2.uvX1, p1.uvX1, isLine1),
				uvY1 = mix(p2.uvY1, p1.uvY1, isLine1),
				uvX2 = mix(p2.uvX2, p1.uvX2, isLine1),
				uvY2 = mix(p2.uvY2, p1.uvY2, isLine1),
				localU = mix(p2.localU, p1.localU, isLine1);
			const centerX = mix(p2.centerX, p1.centerX, isLine1);
			const charWidth = mix(p2.width, p1.width, isLine1);
			// Use clamped yLocal for sampling to stop duplication outside glyph vertical bounds
			const charUV = vec2(
				uvX1.add(localU.mul(uvX2.sub(uvX1))),
				uvY1.add(yLocal.mul(uvY2.sub(uvY1)))
			);
			const hasUV = step(float(0.001), uvX2.sub(uvX1)).mul(
				step(float(0.001), uvY2.sub(uvY1))
			);
			const fontSample = texture(this.fontTexture, charUV);
			const median = max(
				min(fontSample.r, fontSample.g),
				min(max(fontSample.r, fontSample.g), fontSample.b)
			);
			const halfW = float(this.uniforms.edgeWidth).mul(0.5);
			const edgeStart = float(this.uniforms.edgeCenter).sub(halfW);
			const edgeEnd = float(this.uniforms.edgeCenter).add(halfW);
			const textAlpha = smoothstep(edgeStart, edgeEnd, median)
				.mul(validChar)
				.mul(hasUV);
			let baseColor = mix(vec3(0.0), vec3(1.0), textAlpha);
			// --- Fused Circle Field (additive clamp, no iso threshold) ---
			const showCircles = float(this.uniforms.showCircles);
			const radius = float(this.uniforms.circleRadius);
			const feather = float(this.uniforms.circleFeather);
			const charH = float(this.uniforms.charHeight);
			const lineSpacing = float(this.uniforms.lineSpacing);
			const lineHeight = charH.mul(lineSpacing);
			const numLinesHeight = lineHeight.mul(numLines);
			const pixelYGlobal = paddedUV.y.mul(numLinesHeight);
			const circleAccum = (chars: any[], i: number, lineY: any): any =>
				i >= Math.min(chars.length, 64)
					? float(0.0)
					: (() => {
							const c = chars[i];
							const xs = float(c.xPosition);
							const w = float(c.width);
							const cx = xs.add(w.mul(0.5));
							const isGlyph = step(
								float(0.001),
								float(c.uvX2).sub(float(c.uvX1))
							).mul(step(float(0.001), float(c.uvY2).sub(float(c.uvY1))));
							const cy = lineY.add(charH.mul(0.5));
							const dx = pixelX.sub(cx);
							const dy = pixelYGlobal.sub(cy);
							const dist = dx.mul(dx).add(dy.mul(dy)).sqrt();
							const inner = radius.mul(float(1.0).sub(feather));
							const contrib = float(1.0)
								.sub(smoothstep(inner, radius, dist))
								.mul(isGlyph);
							return contrib.add(circleAccum(chars, i + 1, lineY));
						})();
			const sum0 = circleAccum(l1, 0, float(0.0));
			const sum1 = circleAccum(l2, 0, lineHeight);
			// Clamp summed field to 1 for fusion (smooth union look without Voronoi seams)
			const fused = min(float(1.0), sum0.add(sum1)).step(0.5);
			const circleMask = showCircles;
			const circleColor = vec3(1.0).mul(fused);
			baseColor = mix(baseColor, circleColor, fused.mul(circleMask));
			const finalAlpha = max(textAlpha, fused.mul(circleMask));
			return vec4(baseColor, finalAlpha);
		});
	}

	/** Cleans up GPU resources. */
	public dispose() {
		this.mesh?.geometry.dispose();
		this.mesh?.material && (this.mesh.material as THREE.Material).dispose();
	}
}

// Notes:
// - Space width derived from metrics when available.
// - Layout + shader logic condensed while retaining original behaviour.
// - Future: generalise to N lines via data texture / UBO.
