varying vec2 vUv;

uniform float uProgress1;
uniform float uProgress2;
uniform float uProgress3;
uniform float uProgress4;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
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

void main() {
    float x = floor(vUv.x * 10.0);
    float y = floor(vUv.y * 10.0);
    float pattern = noise(vec2(x, y));

    float w = 0.5;
    float p0 = uProgress1;
    p0 = map(p0, 0.0, 1.0, -w, 1.0);
    p0 = smoothstep(p0, p0 + w, vUv.x);
    p0 = 1.0 - p0;
    float _p0 = 2.0 * p0 - pattern;

    // gl_FragColor = vec4(vec3(_p0), 1.0);
    gl_FragColor = vec4(vec3(0.0), 1.0);
}
