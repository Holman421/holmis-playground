varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPattern;
varying float vDisplacement;

uniform float uTime;
uniform vec3 uInwardColor;     // Add this
uniform vec3 uOutwardColor;    // Add this
uniform float uThreshold;      // Add this
uniform float uSmoothness;     // Add this

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
    vec3 inwardColor = uInwardColor;
    vec3 outwardColor = uOutwardColor;

    float threshold = uThreshold;
    float smoothness = uSmoothness;

    float outwardFactor = smoothstep(threshold - smoothness, threshold + smoothness, vDisplacement);
    float inwardFactor = smoothstep(-threshold - smoothness, -threshold + smoothness, -vDisplacement);
    float baseFactor = 1.0 - outwardFactor - inwardFactor;

    vec3 finalColor = outwardColor * outwardFactor +
    inwardColor * inwardFactor + baseFactor;

    // finalColor *= pnoise(vec3(vPosition.z * 15.0));

    gl_FragColor = vec4(finalColor, 1.0);
}