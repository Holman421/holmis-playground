precision mediump float;

varying float vGreen;
varying float vRed;
varying float vBlue;
void main() {
    gl_FragColor = vec4(vRed, vGreen, vBlue, 1.0);
}