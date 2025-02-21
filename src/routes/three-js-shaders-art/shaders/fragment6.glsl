varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

// New uniforms
uniform vec3 uBaseColor1;      // default: vec3(0.1, 0.4, 0.4)
uniform vec3 uBaseColor2;      // default: vec3(0.5, 0.7, 0.0)
uniform vec3 uAccentColor1;    // default: vec3(0.35, 0.0, 0.1)
uniform vec3 uAccentColor2;    // default: vec3(0.0, 0.2, 1.0)
uniform vec3 uAccentColor3;    // default: vec3(0.3, 0.0, 0.0)
uniform vec3 uAccentColor4;    // default: vec3(0.0, 0.5, 0.0)
uniform float uNoiseScale;     // default: 0.004
uniform float uTimeScale;      // default: 0.007
uniform float uContrast;       // default: 2.0
uniform float uVignetteIntensity; // default: 0.65

// domain warping based on the master's notes at https://iquilezles.org/articles/warp

// Basic random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// NOISE ////
float noise(in vec2 x) {
vec2 p = floor(x);
vec2 f = fract(x);
f = f * f * (3.0 - 2.0 * f);

float n = p.x + p.y * 57.0;
float a = random(p);
float b = random(p + vec2(1.0, 0.0));
float c = random(p + vec2(0.0, 1.0));
float d = random(p + vec2(1.0, 1.0));

return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

const mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
    float f = 0.0;

    f += 0.500000 * noise(p);
    p = mtx * p * 2.02;
    f += 0.250000 * noise(p);
    p = mtx * p * 2.03;
    f += 0.125000 * noise(p);
    p = mtx * p * 2.01;
    f += 0.062500 * noise(p);
    p = mtx * p * 2.04;
    f += 0.031250 * noise(p);
    p = mtx * p * 2.01;
    f += 0.015625 * noise(p);

    return f / 0.96875;
}

// -----------------------------------------------------------------------

float pattern(in vec2 p, in float t, in vec2 uv, out vec2 q, out vec2 r, out vec2 g) {
    q = vec2(fbm(p), fbm(p + vec2(10, 1.3)));

    float s = dot(uv.x + 0.5, uv.y + 0.5);
    r = vec2(fbm(p + 4.0 * q + vec2(t) + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(t) + vec2(8.3, 2.8)));

    g = vec2(fbm(p + 2.0 * r + vec2(t * 20.0) + vec2(2, 6)), fbm(p + 2.0 * r + vec2(t * 10.0) + vec2(5, 3)));

    return fbm(p + 5.5 * g + vec2(-t * 7.0));
}

void main() {
    vec2 q, r, g;
    float noise = pattern(vUv * uResolution * vec2(uNoiseScale), uTime * uTimeScale, vUv, q, r, g);

    // base color based on main noise
    vec3 col = mix(uBaseColor1, uBaseColor2, smoothstep(0.0, 1.0, noise));

    // other lower-octave colors and mixes
    col = mix(col, uAccentColor1, dot(q, q) * 1.0);
    col = mix(col, uAccentColor2, 0.2 * g.y * g.y);
    col = mix(col, uAccentColor3, smoothstep(0.0, .6, 0.6 * r.g * r.g));
    col = mix(col, uAccentColor4, 0.1 * g.x);

    // some dark outlines/contrast and different steps
    col = mix(col, vec3(0), smoothstep(0.3, 0.5, noise) * smoothstep(0.5, 0.3, noise));
    col = mix(col, vec3(0), smoothstep(0.7, 0.8, noise) * smoothstep(0.8, 0.7, noise));

    // contrast
    col *= noise * uContrast;

    // vignette
    col *= 0.70 + uVignetteIntensity * sqrt(70.0 * vUv.x * vUv.y * (1.0 - vUv.x) * (1.0 - vUv.y));

    gl_FragColor = vec4(col, 1.0);
}