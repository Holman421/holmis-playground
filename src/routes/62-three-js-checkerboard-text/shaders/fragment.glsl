varying vec2 vUv;

uniform sampler2D uTexture;

void main() {
    vec4 texColor = texture2D(uTexture, vec2(vUv.x * 0.25, vUv.y * 0.5));

    // gl_FragColor = vec4(vUv.x, vUv.y, 1.0, 1.0);
    gl_FragColor = vec4(vec3(1.0, 0.0, 1.0), 1.0);
    // float finalColor = step(0.5, texColor.r);
    // gl_FragColor = vec4(vec3(finalColor), 1.0);
}
