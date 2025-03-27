uniform sampler2D uPositions;
uniform float uTime;
uniform float uProgress;

varying vec2 vUv;
varying vec4 vColor;
float PI = 3.141592653589793238;

void main() {
    vUv = uv;

    vec4 pos = texture2D(uPositions, vUv);

    float angle = atan(pos.y, pos.x);

    float scaledAngle = sin(angle + uTime * 0.3);

    scaledAngle = smoothstep(-0.9, 0.75, scaledAngle);

    vec4 baseColor = vec4(0.05 + 0.95 * scaledAngle);

    float scaledProgress = smoothstep(0.0, 0.25, uProgress);

    vColor = mix(baseColor, vec4(1.0), scaledProgress);

    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
    gl_PointSize = 1.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
