import { createDerivedMaterial, voidMainRegExp } from 'troika-three-utils';
import { Color, Vector2, Vector4, Matrix3 } from 'three';

// language=GLSL
const VERTEX_DEFS = `
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform vec4 uTroikaTotalBounds;
uniform vec4 uTroikaClipRect;
uniform mat3 uTroikaOrient;
uniform bool uTroikaUseGlyphColors;
uniform float uTroikaEdgeOffset;
uniform float uTroikaBlurRadius;
uniform vec2 uTroikaPositionOffset;
uniform float uTroikaCurveRadius;
attribute vec4 aTroikaGlyphBounds;
attribute float aTroikaGlyphIndex;
attribute vec3 aTroikaGlyphColor;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec3 vTroikaGlyphColor;
varying vec2 vTroikaGlyphDimensions;
varying vec2 vUv;
`;

// language=GLSL prefix="void main() {" suffix="}"
const VERTEX_TRANSFORM = `
vec4 bounds = aTroikaGlyphBounds;
bounds.xz += uTroikaPositionOffset.x;
bounds.yw -= uTroikaPositionOffset.y;

vec4 outlineBounds = vec4(
  bounds.xy - uTroikaEdgeOffset - uTroikaBlurRadius,
  bounds.zw + uTroikaEdgeOffset + uTroikaBlurRadius
);
vec4 clippedBounds = vec4(
  clamp(outlineBounds.xy, uTroikaClipRect.xy, uTroikaClipRect.zw),
  clamp(outlineBounds.zw, uTroikaClipRect.xy, uTroikaClipRect.zw)
);

vec2 clippedXY = (mix(clippedBounds.xy, clippedBounds.zw, position.xy) - bounds.xy) / (bounds.zw - bounds.xy);

position.xy = mix(bounds.xy, bounds.zw, clippedXY);

uv = (position.xy - uTroikaTotalBounds.xy) / (uTroikaTotalBounds.zw - uTroikaTotalBounds.xy);

float rad = uTroikaCurveRadius;
if (rad != 0.0) {
  float angle = position.x / rad;
  position.xz = vec2(sin(angle) * rad, rad - cos(angle) * rad);
  normal.xz = vec2(sin(angle), cos(angle));
}
  
position = uTroikaOrient * position;
normal = uTroikaOrient * normal;
vUv = uv;

vTroikaGlyphUV = clippedXY.xy;
vTroikaGlyphDimensions = vec2(bounds[2] - bounds[0], bounds[3] - bounds[1]);

${
	'' /* NOTE: it seems important to calculate the glyph's bounding texture UVs here in the
  vertex shader, rather than in the fragment shader, as the latter gives strange artifacts
  on some glyphs (those in the leftmost texture column) on some systems. The exact reason
  isn't understood but doing this here, then mix()-ing in the fragment shader, seems to work. */
}
float txCols = uTroikaSDFTextureSize.x / uTroikaSDFGlyphSize;
vec2 txUvPerSquare = uTroikaSDFGlyphSize / uTroikaSDFTextureSize;
vec2 txStartUV = txUvPerSquare * vec2(
  mod(floor(aTroikaGlyphIndex / 4.0), txCols),
  floor(floor(aTroikaGlyphIndex / 4.0) / txCols)
);
vTroikaTextureUVBounds = vec4(txStartUV, vec2(txStartUV) + txUvPerSquare);
vTroikaTextureChannel = mod(aTroikaGlyphIndex, 4.0);
`;

// language=GLSL
const FRAGMENT_DEFS = `
uniform sampler2D uTroikaSDFTexture;
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform float uTroikaSDFExponent;
uniform float uTroikaEdgeOffset;
uniform float uTroikaFillOpacity;
uniform float uTroikaBlurRadius;
uniform vec3 uTroikaStrokeColor;
uniform float uTroikaStrokeWidth;
uniform float uTroikaStrokeOpacity;
uniform bool uTroikaSDFDebug;
uniform float uProgress1;
uniform float uProgress2;
uniform float uProgress3;
uniform float uProgress4;
uniform vec3 uFinalTextColor;
uniform vec3 uFirstOutlineColor;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec2 vTroikaGlyphDimensions;
varying vec2 vUv;

float troikaSdfValueToSignedDistance(float alpha) {
  // Inverse of exponential encoding in webgl-sdf-generator
  ${
		'' /* TODO - there's some slight inaccuracy here when dealing with interpolated alpha values; those
    are linearly interpolated where the encoding is exponential. Look into improving this by rounding
    to nearest 2 whole texels, decoding those exponential values, and linearly interpolating the result.
  */
	}
  float maxDimension = max(vTroikaGlyphDimensions.x, vTroikaGlyphDimensions.y);
  float absDist = (1.0 - pow(2.0 * (alpha > 0.5 ? 1.0 - alpha : alpha), 1.0 / uTroikaSDFExponent)) * maxDimension;
  float signedDist = absDist * (alpha > 0.5 ? -1.0 : 1.0);
  return signedDist;
}

float troikaGlyphUvToSdfValue(vec2 glyphUV) {
  vec2 textureUV = mix(vTroikaTextureUVBounds.xy, vTroikaTextureUVBounds.zw, glyphUV);
  vec4 rgba = texture2D(uTroikaSDFTexture, textureUV);
  float ch = floor(vTroikaTextureChannel + 0.5); //NOTE: can't use round() in WebGL1
  return ch == 0.0 ? rgba.r : ch == 1.0 ? rgba.g : ch == 2.0 ? rgba.b : rgba.a;
}

float troikaGlyphUvToDistance(vec2 uv) {
  return troikaSdfValueToSignedDistance(troikaGlyphUvToSdfValue(uv));
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);

    float res = mix(mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x), mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float troikaGetAADist() {
  #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
  return length(fwidth(vTroikaGlyphUV * vTroikaGlyphDimensions)) * 0.5;
  #else
  return vTroikaGlyphDimensions.x / 64.0;
  #endif
}

float troikaGetFragDistValue() {
  vec2 clampedGlyphUV = clamp(vTroikaGlyphUV, 0.5 / uTroikaSDFGlyphSize, 1.0 - 0.5 / uTroikaSDFGlyphSize);
  float distance = troikaGlyphUvToDistance(clampedGlyphUV);
 
  // Extrapolate distance when outside bounds:
  distance += clampedGlyphUV == vTroikaGlyphUV ? 0.0 : 
    length((vTroikaGlyphUV - clampedGlyphUV) * vTroikaGlyphDimensions);

  return distance;
}

float troikaGetEdgeAlpha(float distance, float distanceOffset, float aaDist) {
  #if defined(IS_DEPTH_MATERIAL) || defined(IS_DISTANCE_MATERIAL)
  float alpha = step(-distanceOffset, -distance);
  #else

  float alpha = smoothstep(
    distanceOffset + aaDist,
    distanceOffset - aaDist,
    distance
  );
  #endif

  return alpha;
}
`;

// language=GLSL prefix="void main() {" suffix="}"
const FRAGMENT_TRANSFORM = `
float aaDist = troikaGetAADist();
float fragDistance = troikaGetFragDistValue();
float edgeAlpha = uTroikaSDFDebug ?
  troikaGlyphUvToSdfValue(vTroikaGlyphUV) :
  troikaGetEdgeAlpha(fragDistance, uTroikaEdgeOffset, max(aaDist, uTroikaBlurRadius));

#if !defined(IS_DEPTH_MATERIAL) && !defined(IS_DISTANCE_MATERIAL)
vec4 fillRGBA = gl_FragColor;
fillRGBA.a *= uTroikaFillOpacity;
vec3 stroke1Color = uFirstOutlineColor;
vec4 strokeRGBA = uTroikaStrokeWidth == 0.0 ? fillRGBA : vec4(stroke1Color, uTroikaStrokeOpacity);
vec4 strokeRGBA2 = uTroikaStrokeWidth == 0.0 ? fillRGBA : vec4(uTroikaStrokeColor, uTroikaStrokeOpacity);

float x = floor(vUv.x * 10.0);
float y = floor(vUv.y * 10.0);
float pattern = noise(vec2(x, y));

float w = 0.75;
// Stroke animations
float p0 = uProgress1;
p0 = map(p0, 0.0, 1.0, -w, 1.0);
p0 = smoothstep(p0, p0 + w, vUv.x);
p0 = 1.0 - p0;
float _p0 = 2.0 * p0 - pattern;

float p1 = uProgress2;
p1 = map(p1, 0.0, 1.0, -w, 1.0);
p1 = smoothstep(p1, p1 + w, vUv.x);
p1 = 1.0 - p1;
float _p1 = 2.0 * p1 - pattern;

// Fill animations
float p2 = uProgress3;
p2 = map(p2, 0.0, 1.0, -w, 1.0);
p2 = smoothstep(p2, p2 + w, vUv.x);
p2 = 1.0 - p2;
float _p2 = 2.0 * p2 - pattern;

float p3 = uProgress4;
p3 = map(p3, 0.0, 1.0, -w, 1.0);
p3 = smoothstep(p3, p3 + w, vUv.x);
p3 = 1.0 - p3;
float _p3 = 2.0 * p3 - pattern;

// Strokes
vec4 whiteStroke = vec4(strokeRGBA.rgb, strokeRGBA.a * max(0.0, _p0));
vec4 coloredStroke = vec4(strokeRGBA2.rgb, strokeRGBA2.a * max(0.0, _p1));

// Fill colors - first original color, then final color
vec4 whiteFill = vec4(fillRGBA.rgb, fillRGBA.a * max(0.0, _p2));
vec4 coloredFill = vec4(uFinalTextColor, fillRGBA.a * max(0.0, _p3));

// Initialize with black fill
vec4 ultraFinalFillRGBA = vec4(vec3(0.0), fillRGBA.a);

// Initialize with no stroke
vec4 ultraFinalStrokeRGBA = vec4(0.0);

// Layer the strokes
if (_p0 > 0.0 && uProgress1 > 0.0) {
    ultraFinalStrokeRGBA = whiteStroke;
}
if (_p1 > 0.0 && uProgress2 > 0.0) {
    ultraFinalStrokeRGBA = coloredStroke;
}

// Layer the fills
if (_p2 > 0.0 && uProgress3 > 0.0) {
    ultraFinalFillRGBA = whiteFill;
}
if (_p3 > 0.0 && uProgress4 > 0.0) {
    // Transition from original fill color to final text color based on _p3
    vec3 lerpedColor = mix(fillRGBA.rgb, uFinalTextColor, _p3);
    ultraFinalFillRGBA = vec4(lerpedColor, fillRGBA.a);
    ultraFinalStrokeRGBA = vec4(uFinalTextColor, strokeRGBA.a * max(0.0, _p3));
}

if (fillRGBA.a == 0.0) fillRGBA.rgb = strokeRGBA.rgb;
gl_FragColor = mix(ultraFinalFillRGBA, ultraFinalStrokeRGBA, smoothstep(
  -uTroikaStrokeWidth - aaDist,
  -uTroikaStrokeWidth + aaDist,
  fragDistance
));
gl_FragColor.a *= edgeAlpha;
#endif

if (edgeAlpha == 0.2) {
  discard;
}
`;

/**
 * Create a material for rendering text, derived from a baseMaterial
 */
export function createTextDerivedMaterial(baseMaterial) {
	const textMaterial = createDerivedMaterial(baseMaterial, {
		chained: true,
		extensions: {
			derivatives: true
		},
		uniforms: {
			uTroikaSDFTexture: { value: null },
			uTroikaSDFTextureSize: { value: new Vector2() },
			uTroikaSDFGlyphSize: { value: 0 },
			uTroikaSDFExponent: { value: 0 },
			uTroikaTotalBounds: { value: new Vector4(0, 0, 0, 0) },
			uTroikaClipRect: { value: new Vector4(0, 0, 0, 0) },
			uTroikaEdgeOffset: { value: 0 },
			uTroikaFillOpacity: { value: 1 },
			uTroikaPositionOffset: { value: new Vector2() },
			uTroikaCurveRadius: { value: 0 },
			uTroikaBlurRadius: { value: 0 },
			uTroikaStrokeWidth: { value: 0 },
			uTroikaStrokeColor: { value: new Color() },
			uTroikaStrokeOpacity: { value: 1 },
			uTroikaOrient: { value: new Matrix3() },
			uTroikaUseGlyphColors: { value: true },
			uTroikaSDFDebug: { value: false },
			uProgress1: { value: 0 },
			uProgress2: { value: 0 },
			uProgress3: { value: 0 },
			uProgress4: { value: 0 },
			uFinalTextColor: { value: new Color(1.0, 1.0, 1.0) },
			uFirstOutlineColor: { value: new Color(1.0, 1.0, 1.0) }
		},
		vertexDefs: VERTEX_DEFS,
		vertexTransform: VERTEX_TRANSFORM,
		fragmentDefs: FRAGMENT_DEFS,
		fragmentColorTransform: FRAGMENT_TRANSFORM,
		customRewriter({ vertexShader, fragmentShader }) {
			let uDiffuseRE = /\buniform\s+vec3\s+diffuse\b/;
			if (uDiffuseRE.test(fragmentShader)) {
				// Replace all instances of `diffuse` with our varying
				fragmentShader = fragmentShader
					.replace(uDiffuseRE, 'varying vec3 vTroikaGlyphColor')
					.replace(/\bdiffuse\b/g, 'vTroikaGlyphColor');
				// Make sure the vertex shader declares the uniform so we can grab it as a fallback
				if (!uDiffuseRE.test(vertexShader)) {
					vertexShader = vertexShader.replace(
						voidMainRegExp,
						'uniform vec3 diffuse;\n$&\nvTroikaGlyphColor = uTroikaUseGlyphColors ? aTroikaGlyphColor / 255.0 : diffuse;\n'
					);
				}
			}
			return { vertexShader, fragmentShader };
		}
	});

	// Force transparency - TODO is this reasonable?
	textMaterial.transparent = true;

	// Force single draw call when double-sided
	textMaterial.forceSinglePass = true;

	Object.defineProperties(textMaterial, {
		isTroikaTextMaterial: { value: true },

		// WebGLShadowMap reverses the side of the shadow material by default, which fails
		// for planes, so here we force the `shadowSide` to always match the main side.
		shadowSide: {
			get() {
				return this.side;
			},
			set() {
				//no-op
			}
		}
	});

	return textMaterial;
}
