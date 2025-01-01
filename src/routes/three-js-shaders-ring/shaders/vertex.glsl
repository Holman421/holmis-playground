varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPattern;
varying float vDisplacement;

uniform float uTime;
uniform float uNoiseFrequency;
uniform float uNoiseAmplitude;
uniform float uNoiseSpeed;
uniform float uSmoothStart;    // Add this
uniform float uSmoothEnd;      // Add this
uniform float uPowFactor;      // Add this

#define PI 3.14159265358979
#define MOD3 vec3(.1031,.11369,.13787)

vec3 hash33(vec3 p3) {
    p3 = fract(p3 * MOD3);
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
}

// ? Perlin noise
float pnoise(vec3 p) {
    vec3 pi = floor(p);
    vec3 pf = p - pi;
    vec3 w = pf * pf * (3. - 2.0 * pf);
    return mix(mix(mix(dot(pf - vec3(0, 0, 0), hash33(pi + vec3(0, 0, 0))), dot(pf - vec3(1, 0, 0), hash33(pi + vec3(1, 0, 0))), w.x), mix(dot(pf - vec3(0, 0, 1), hash33(pi + vec3(0, 0, 1))), dot(pf - vec3(1, 0, 1), hash33(pi + vec3(1, 0, 1))), w.x), w.z), mix(mix(dot(pf - vec3(0, 1, 0), hash33(pi + vec3(0, 1, 0))), dot(pf - vec3(1, 1, 0), hash33(pi + vec3(1, 1, 0))), w.x), mix(dot(pf - vec3(0, 1, 1), hash33(pi + vec3(0, 1, 1))), dot(pf - vec3(1, 1, 1), hash33(pi + vec3(1, 1, 1))), w.x), w.z), w.y);
}

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;

    float noiseMultiplier = pow(smoothstep(uSmoothStart, uSmoothEnd, abs(uv.x - 0.5) * 2.0), uPowFactor);
    vPattern = vec3(noiseMultiplier);
    float noise = pnoise(vPosition * uNoiseFrequency + uTime * uNoiseSpeed) * uNoiseAmplitude;
    float displacement = noise * noiseMultiplier;
    vDisplacement = displacement;
    vec3 newPosition = vPosition + vNormal * displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}