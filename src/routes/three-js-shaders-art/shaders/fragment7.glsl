varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

float random(in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) *
        43758.5453123);
}

vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(in vec2 p) {
    const float K1 = 0.366025404;
    const float K2 = 0.211324865;

    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x);
    vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
    return dot(n, vec3(70.0));
}

#define OCTAVES 6
float fbm(in vec2 st) {
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;

    for(int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

void main() {
    vec2 st = vUv;
    float aspect = uResolution.x / uResolution.y;
    st.x *= aspect;
    vec3 color = vec3(0.0);

    // determines size
    vec2 p = st * 3.;

    // Set constant turbulence since we removed mouse interaction
    float turbulence = 0.5;
    p.x += uTime * 0.01 * turbulence;

    // undercurrent relative velocity
    float t1 = uTime * -0.05;
    // river relative velocity
    float t2 = uTime * 0.01;
    // pollution relative velocity
    float t3 = uTime * 0.1;

    vec2 q = p + t1;
    float s = fbm(p + t3);
    float r = fbm(p + t2 + s) * turbulence;

    color += fbm(q + r);
    color += 0.15;
    color.r += s + 0.05;
    color.b += r + 0.3;
    color.g += s / 2.5;

    gl_FragColor = vec4(color, 1.0);
}