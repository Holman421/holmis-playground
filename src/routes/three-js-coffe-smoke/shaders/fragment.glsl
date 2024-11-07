uniform sampler2D uPerlinTexture;
uniform float uTime;

varying vec2 vUv;

float PI = 3.14159265359;

void main() {
    // Scale & Animate
    vec2 smokeUv = vUv;
    smokeUv.x *= 0.5;
    smokeUv.y *= 0.2;
    smokeUv.y -= uTime * 0.02;

    // Smoke
    float smoke = texture(uPerlinTexture, smokeUv).r;
    smoke = smoothstep(0.4, 1.0, smoke);
    smoke *= sin(PI * vUv.x * 1.2 - 0.3);
    smoke *= sin(PI * vUv.y * 1.2 - 0.3);

    // Final color
    gl_FragColor = vec4(1.0, 1.0, 1.0, smoke);
    // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}