uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;
varying vec3 vColor;

void main() {
    gl_FragColor = vec4(vColor, 1.0);
}
