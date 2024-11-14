uniform vec3 uColor;
uniform vec2 uResolution;
uniform vec2 uMousePosition;

varying vec2 vUv;

void main() {
    float point = distance(vUv, uMousePosition);
    point = 1.0 - smoothstep(0.0, 0.02, point);

    // Apply an effect based on the distance
    gl_FragColor = vec4(uColor * point, point);
}