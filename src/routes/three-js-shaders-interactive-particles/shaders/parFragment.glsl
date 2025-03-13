uniform float uTime;
uniform float uProgress;
uniform sampler2D uPositions;
uniform vec4 uResolution;

varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.1415926535897932384626433832795;

void main() {
    vec4 pos = texture2D(uPositions, vUv);
    gl_FragColor = vec4(vUv, 0.0, 1.0);
}