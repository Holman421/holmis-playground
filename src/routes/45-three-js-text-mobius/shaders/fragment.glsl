uniform float uTime;

varying float vDebug;
varying vec2 vUv;

void main() {
    vec3 color = vec3(0.0);

    gl_FragColor = vec4(vUv, 0.0, 1.0);
}
