varying vec2 vUv;
uniform sampler2D uTexture; // first pass result
uniform sampler2D uDisplacementTexture; // original loaded texture
uniform sampler2D uTrailTexture; // mouse trail

// --- Displacement logic from original fragment shader ---
vec4 blur(sampler2D textureSampler, vec2 uv, vec2 resolution, float radius) {
    float w0 = 0.3780 / pow(radius, 1.975);
    float rr = radius * radius;
    vec2 p;
    vec4 col = vec4(0.0, 0.0, 0.0, 0.0);
    float dx = 1.0 / resolution.x;
    float dy = 1.0 / resolution.y;
    for(float i = -radius; i <= radius; i += 1.0) {
        float xx = i * i;
        p.x = uv.x + (i * dx);
        for(float j = -radius; j <= radius; j += 1.0) {
            float yy = j * j;
            p.y = uv.y + (j * dy);
            if(xx + yy <= rr) {
                float w = w0 * exp((-xx - yy) / (2.0 * rr));
                col += texture2D(textureSampler, p) * w;
            }
        }
    }
    return col;
}

void main() {
    float blurStrength = 5.0;
    vec2 resolution = vec2(1924.0, 1924.0);
    // Use the original loaded texture for displacement
    vec4 dispColor = blur(uDisplacementTexture, vUv, resolution, blurStrength);
    float baseDisplacement = (dispColor.r + dispColor.g + dispColor.b) / 20.0;
    float maxDisplacement = 0.75;
    float displacement = baseDisplacement * maxDisplacement;
    // --- Trail logic ---
    vec4 trailColor = texture2D(uTrailTexture, vUv);
    float trailIntensity = trailColor.r * 1.5;
    float trailDisplacement = trailIntensity / 4.0;
    // Combine displacements
    float totalDisplacement = displacement + trailDisplacement;
    vec2 displacedUv = vUv - (totalDisplacement - 0.5) * 0.2;
    // vec4 finalColor = texture2D(uTexture, vec2(vUv.x, vUv.y + vUv.x));
    // vec4 finalColor = texture2D(uTexture, displacedUv);
    // --- DEBUG: visualize trail ---

    vec4 finalColor = texture2D(uTexture, vUv - (0.1 * totalDisplacement));

    vec4 finalFinalColor = vec4(finalColor.r, finalColor.g, finalColor.b, 1.0);

    gl_FragColor = finalFinalColor; 

    // gl_FragColor = finalColor;
}
