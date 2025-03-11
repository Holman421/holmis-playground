uniform float uTime;
uniform vec2 pixels;
uniform sampler2D uPositions;

varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.1415926535897932384626433832795;

void main() {
    vUv = uv;
    vec4 pos = texture2D(uPositions, uv);
    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
    gl_PointSize = 10.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}