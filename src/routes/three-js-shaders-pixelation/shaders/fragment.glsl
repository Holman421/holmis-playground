uniform float uTime;
uniform sampler2D uTexture;
uniform vec4 resolution;
uniform sampler2D uDataTexture;

varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.14159265359;

void main() {
    vec2 newUV = (vUv - vec2(0.5)) * resolution.zw + vec2(0.5);
    vec4 offset = texture2D(uDataTexture, vUv);

    gl_FragColor = texture2D(uTexture, newUV - offset.rg);
}
