precision mediump float;

varying float vGreen;
varying float vRed;
varying float vBlue;

void main() {
    float blue = mix(vBlue, 0.0, 0.5);

    gl_FragColor = vec4(vRed, vGreen, blue, 1.0);
}