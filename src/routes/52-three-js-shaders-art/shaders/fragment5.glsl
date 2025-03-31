varying vec2 vUv;
uniform float uTime;
uniform float uNoiseScale;
uniform vec2 uResolution;

// Basic random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Replacement for Shadertoy's texture noise
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

const mat2 mtx = mat2(0.85, 0.60, -0.60, 0.80);

float fbm3(vec2 p) {
    float f = 0.0;

    f += 0.8000 * (-1.0 + 2.0 * noise(p));
    p = mtx * p * 2.02;
    f += 0.250000 * noise(p);
    p = mtx * p * 2.03;
    f += 0.5500 * (-1.0 + 2.0 * noise(p));
    p = mtx * p * 2.03;
    f += 0.1625 * (-1.0 + 2.0 * noise(p));

    return f / 1.8375;
}

float fbm7(vec2 p) {
    float f = 0.0;

    f += 0.005000 * noise(p);
    p = mtx * p * 2.02;
    f += 0.250000 * noise(p);
    p = mtx * p * 2.03;
    f += 0.125000 * noise(p);
    p = mtx * p * 2.01;
    f += 0.562500 * noise(p);
    p = mtx * p * 2.04;
    f += 0.831250 * noise(p);
    p = mtx * p * 2.01;
    f += 0.312500 * noise(p);
    p = mtx * p * 2.02;
    f += 0.15625 * noise(p);

    return f / 5.41875;
}

vec2 fbm3_2(vec2 p) {
    return vec2(fbm3(p + vec2(1.5)), fbm3(p + vec2(3.2)));
}

vec2 fbm7_2(vec2 p) {
    return vec2(fbm7(p + vec2(3.2)), fbm7(p + vec2(9.7)));
}

// Domain Warping
float warp(vec2 q, out vec2 o, out vec2 n) {
    // Replace static animation with uTime
    q += 0.1 * sin(vec2(0.11, 0.13) * .16 * uTime * 4.0 + length(q) * 4.0);
    q *= 0.8 * uNoiseScale; // Apply noise scale here

    o = 0.5 + 0.5 * fbm3_2(q);

    o += 0.04 * sin(vec2(0.11, 0.11) * .1 * uTime * 4.0 * length(o));
    o *= 1.1;

    n = fbm7_2(.95 * o);

    vec2 p = q + 2.0 * n + 1.0;

    float f = 0.5 + 0.5 * fbm3(2.0 * p);

    f = mix(f, f * f * f * 3.5, f * abs(n.x));

    f *= 1.0 - 0.5 * pow(0.5 + 0.5 * sin(8.0 * p.x) * sin(8.0 * p.y), 8.0);

    return f;
}

float warps(in vec2 q) {
    vec2 t1, t2;
    return warp(q, t1, t2);
}

void main() {
    vec2 fragCoord = vUv * uResolution;

    vec3 tot = vec3(0.0);

    // Use actual resolution from uniform
    for(int mi = 0; mi < 2; mi++) for(int ni = 0; ni < 2; ni++) {
        vec2 q = (2.0 * fragCoord - uResolution.xy) / uResolution.y;
        vec2 o, n;

        float f = warp(q, o, n);

        vec3 col = vec3(0.2, 0.7, 0.3);
        col = mix(col, vec3(0.2, 0.25, 0.35), f);
        col = mix(col, vec3(0.9, 0.9, 0.9), dot(n, n));
        col = mix(col, vec3(0.5, 0.4, 0.1), 0.5 * o.y * o.y);
        col = mix(col, vec3(0.6, 0.2, 0.4), 0.5 * smoothstep(1.2, 1.3, abs(n.y) + abs(n.x)));
        col *= f * 2.0;

        vec2 ex = vec2(1.0 / uResolution.x, 0.0);
        vec2 ey = vec2(0.0, 1.0 / uResolution.y);

        vec3 nor = normalize(vec3(warps(q + ex) - f, ex.x, warps(q + ey) - f));

        vec3 lig = normalize(vec3(0.9, -0.2, -0.4));
        float dif = clamp(0.3 + 0.7 * dot(nor, lig), 0.0, 1.0);

        vec3 bdrf;
        bdrf = vec3(0.85, 0.90, 0.95) * (nor.y * 0.5 + 0.5);
        bdrf += vec3(0.15, 0.10, 0.55) * dif;
        bdrf = vec3(0.85, 0.90, 0.95) * (nor.y * 0.5 + 0.5);
        bdrf += vec3(0.15, 0.10, 0.05) * dif;

        col *= 2.1 * bdrf;
        col = vec3(1.0) - col;
        col = col * col;
        col *= vec3(1.1, 1.25, 1.2);

        tot += col;
    }

    tot /= 4.0; // Adjusted for fewer samples

    vec2 p = fragCoord / uResolution.xy;
    tot *= 0.5 + 0.5 * sqrt(16.0 * p.x * p.y * (1.0 - p.x) * (1.0 - p.y));

    gl_FragColor = vec4(tot, 1.0);
}