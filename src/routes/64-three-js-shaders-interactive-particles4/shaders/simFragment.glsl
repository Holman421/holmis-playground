varying vec2 vUv;
uniform sampler2D uPositions;
uniform sampler2D uInfo;
uniform vec2 uCurrentMouse;  // Add this line
uniform float uTime;
uniform float uMouseMode;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uAttractionStrength;
uniform float shaderResetPointsOffset;
float PI = 3.141592653589793238;
#define PI 3.1415926538

const float EPS = 0.001;
vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}
float permute(float x) {
    return mod289(((x * 34.0) + 1.0) * x);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}
float taylorInvSqrt(float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}
#define F4 0.309016994374947451

vec4 simplexNoiseDerivatives(vec4 v) {
    const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
    vec4 i = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    i = mod289(i);
    float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute(permute(permute(permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4(i1.z, i2.z, i3.z, 1.0)) + i.y + vec4(i1.y, i2.y, i3.y, 1.0)) + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0, ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point

    vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
    vec3 m0 = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0); //(0.5 - x^2) where x is the distance

    vec2 m1 = max(0.5 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    vec3 temp0 = -6.0 * m0 * m0 * values0;
    vec2 temp1 = -6.0 * m1 * m1 * values1;
    vec3 mmm0 = m0 * m0 * m0;
    vec2 mmm1 = m1 * m1 * m1;
    float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
    float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
    float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
    // float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;

    // return vec4(dx, dy, dz, dw) * 49.0;
    return vec4(dx, dy, dz, 0.0) * 49.0;
}
vec3 curl(in vec3 p, in float noiseTime, in float persistence) {
    vec4 xNoisePotentialDerivatives = vec4(0.0);
    vec4 yNoisePotentialDerivatives = vec4(0.0);
    // vec4 zNoisePotentialDerivatives = vec4(0.0);

    for(int i = 0; i < 2; ++i) {
        float twoPowI = pow(2.0, float(i));
        float scale = 0.5 * twoPowI * pow(persistence, float(i));
        xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * scale;
        yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
        // zNoisePotentialDerivatives += snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
    }
    return vec3(yNoisePotentialDerivatives[1] - xNoisePotentialDerivatives[1], yNoisePotentialDerivatives[2] - xNoisePotentialDerivatives[2], yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[0]);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec4 pos = texture2D(uPositions, vUv);
    vec4 info = texture2D(uInfo, vUv);

    vec2 mouse = uCurrentMouse.xy;
    mouse.y += 0.05;
    mouse *= 0.3;
    vec2 atractionPoint = mouse;

    vec2 direction = atractionPoint - pos.xy;
    float dist = length(direction);

    // Random reset logic based on time and distance from mouse
    float baseResetProbability = 0.002;
    float closeRange = smoothstep(0.5, 0.0, dist); // Steeper close range influence
    float farRange = smoothstep(2.0, 0.5, dist);
    float distanceInfluence = pow(closeRange, 5.0) + pow(farRange, 3.0); // Much steeper near center
    float resetProbability = baseResetProbability * (1.0 + distanceInfluence * 0.8); // Increased multiplier
    float randomValue = random(vUv + vec2(uTime));

    if(randomValue < resetProbability) {
        float randomValue = random(vUv + vec2(uTime * 2.0));
        float xDistance = 1.0 - shaderResetPointsOffset * 0.3;
        float xSpread = 2.0;
        float xRandomValue = random(vUv + vec2(uTime * 0.5));
        pos.x = xRandomValue > 0.5 ? (xRandomValue * xSpread + xDistance - xSpread / 2.) : (xRandomValue * xSpread - xDistance - xSpread / 2.);
        float scaledRandomValue = randomValue * 0.2;
        float yDistance = 1.0;
        pos.y = randomValue > 0.5 ? scaledRandomValue + yDistance : scaledRandomValue - yDistance;
    }

    if(-1.0 < 0.0) {
        if(dist > 0.01) {
            direction = normalize(direction);
            // Modified smoothstep range and kept original strength multiplier
            float strength = smoothstep(6.0, 0.0, dist) * uAttractionStrength * 0.04;

            if(strength > 0.0001) {
                vec3 noiseForce = curl(pos.xyz * uNoiseScale, uTime * 0.25, 0.1);
                float noiseMask = smoothstep(2.0, 0.0, dist);
                pos.xy += noiseForce.xy * uNoiseStrength * strength * 10.0;
                pos.xy += direction * strength;
            }
        }
    } else {
        // When not clicked, only apply very subtle random movement
        vec3 randomForce = curl(pos.xyz * 2.0 + uTime * 0.1, uTime * 0.1, 0.1);
        pos.xy += randomForce.xy * 0.0003;
    }

    gl_FragColor = pos;
}
