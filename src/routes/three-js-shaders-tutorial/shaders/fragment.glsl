precision mediump float;

varying float vGreen;
varying float vRed;
varying float vBlue;
varying vec3 vColor;
void main() {
    gl_FragColor = vec4(vRed, vGreen, vBlue, 1.0);
}