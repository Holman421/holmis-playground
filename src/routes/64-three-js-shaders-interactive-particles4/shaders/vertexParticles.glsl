uniform sampler2D uPositions;
uniform float uTime;
uniform float uCanvasSize;

varying vec2 vUv;
varying vec4 vColor;
float PI = 3.141592653589793238;

void main() {
    vUv = uv;

    vec4 pos = texture2D(uPositions, vUv);

    vColor = vec4(1.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);

    // Base size scaled by canvas size (300 is the smaller breakpoint)
    float baseSize = 1.0 * (300.0 / uCanvasSize);
    gl_PointSize = baseSize;

    gl_Position = projectionMatrix * mvPosition;
}
