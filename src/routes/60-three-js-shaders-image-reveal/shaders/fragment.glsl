uniform float uProgress;
uniform float uTime;
uniform float uCircles[14]; // max 7 circles * 2 coordinates
uniform int uNumCircles;
uniform sampler2D uTexture;

varying vec2 vUv;

float noise(vec2 point) {
    float frequency = 1.0;
    float angle = atan(point.y, point.x) + uTime * 0.1;

    float w0 = (cos(angle * 3. * frequency) + 3.0) / 2.0; // normalize [0 - 1]
    float w1 = (sin(5. * angle * frequency) + 1.0) / 2.0; // normalize [0 - 1]
    float w2 = (cos(2. * angle * frequency) + 1.0) / 2.0; // normalize [0 - 1]
    float wave = (w0 + w1 + w2) / 3.0; // normalize [0 - 1]
    return wave;
}

float circleSDF(vec2 pos, float rad, int index) {
    float amt = sin(uTime * 1.0 + float(index) * 0.5) * 0.1 + 0.5;
    float circle = length(pos);
    circle += noise(pos) * rad * amt;
    return 1.0 - smoothstep(-0.01, 0.0, circle - rad);
}

void main() {
    float finalColor = 0.0;
    float scaledProgress = uProgress * 5.0;

    for(int i = 0; i < 7; i++) {
        if(i >= uNumCircles)
        break;
        vec2 center = vec2(uCircles[i * 2], uCircles[i * 2 + 1]);
        finalColor += circleSDF(vUv - center, scaledProgress * 0.5, i);
    }

    float mask = step(0.5, finalColor);
    vec4 texture = texture2D(uTexture, vUv);

    vec3 finalResult = mix(vec3(0.0), texture.rgb, mask);

    gl_FragColor = vec4(finalResult, 1.0);
}
