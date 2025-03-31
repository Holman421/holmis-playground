uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;

varying vec2 vUv;

void main() {
    vUv = uv;

    // Create wave distortion
    vec3 pos = position;
    float wave = sin(position.x * 6.0 + uTime) * 0.2;
    // pos.y += wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
