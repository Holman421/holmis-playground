uniform sampler2D uPositions;
uniform float uTime;

varying vec2 vUv;
varying vec4 vColor;
float PI = 3.141592653589793238;

void main() {
    vUv = uv;

    vec4 pos = texture2D(uPositions, vUv);

    vColor = vec4(1.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
    gl_PointSize = 1.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
