// Fragment shader for gradient glass effect
uniform float uTime;
uniform vec3 uBaseFirstColor;
uniform vec3 uBaseSecondColor;
uniform vec3 uAccentColor;
uniform float uNoiseSpeed;
uniform float uNoiseScale;
uniform float uPatternFrequency;
uniform float uFirstOffset;
uniform float uSecondOffset;
varying vec2 vUv;
varying vec3 vPosition;
float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 perm(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}
float noise(vec3 p) {
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

float line(vec2 uv, float offset) {
    return smoothstep(0.0, 0.5 + offset * 0.5, abs(0.5 * (sin(uv.x * uPatternFrequency) + offset * 2.0)));
}

mat2 rotate2D(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    float n = noise(vPosition * uNoiseScale + uTime * uNoiseSpeed);
    vec3 baseFirst = uBaseFirstColor;
    vec3 accent = uAccentColor;
    vec3 baseSecond = uBaseSecondColor;

    vec2 baseUV = rotate2D(n * 1.75) * vPosition.xy * 0.6;
    float basePattern = line(baseUV, uFirstOffset);
    float secondPattern = line(baseUV, uSecondOffset);

    vec3 baseColor = mix(baseFirst, baseSecond, basePattern);
    vec3 secondBaseColor = mix(baseColor, accent, secondPattern);

    gl_FragColor = vec4(secondBaseColor, 1.0);
}
