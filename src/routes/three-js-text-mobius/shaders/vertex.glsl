uniform float uTime;
uniform vec3 uMin;
uniform vec3 uMax;

float radius = 0.5;

varying float vDebug;
varying vec2 vUv;

float PI = 3.1415926535897932384626433832795;

float mapRange(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
    float x = mapRange(position.x, uMin.x, uMax.x, -PI, PI);
    vec3 dir = vec3(sin(x), cos(x), 0.0);
    vec3 pos = radius * dir + vec3(0.0, 0.0, position.z) + dir * position.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vUv = uv;
    vDebug = x;
}
