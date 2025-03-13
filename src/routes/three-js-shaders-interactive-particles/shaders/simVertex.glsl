uniform float uTime;
uniform vec2 pixels;
uniform sampler2D uPositions;

varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.1415926535897932384626433832795;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}