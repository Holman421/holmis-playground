uniform vec3 color;
uniform float opacity;
uniform vec3 strokeColor;
uniform float strokeOpacity;
uniform float uTime;

varying vec2 vUv;

void main() {
    vec3 finalColor = color;

    gl_FragColor = vec4(finalColor, opacity);

    gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
}
