varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uTrailTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAspect;
uniform float uTextureAspect;
uniform float uTextureScale;
uniform float uBlurStrength;

vec2 preserveAspectRatioUV(vec2 uv, float textureAspect) {
    float screenAspect = uResolution.x / uResolution.y;

    vec2 newUV = uv - 0.5;

    newUV /= uTextureScale;

    if(screenAspect > textureAspect) {
        newUV.x *= screenAspect / textureAspect;
    } else {
        newUV.y *= textureAspect / screenAspect;
    }

    return newUV + 0.5;
}

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
                col += texture(textureSampler, p) * w;
            }
        }
    }
    return col;
}

void main() {
    float blurStrength = uBlurStrength > 0.0 ? uBlurStrength : 10.0;

    vec2 resolution = vec2(1024.0, 1024.0);
    if(uResolution != vec2(0.0)) {
        resolution = uResolution;
    }
    float textureAspect = uTextureAspect;

    vec2 adjustedUV = preserveAspectRatioUV(vUv, textureAspect);

    vec4 texColor;
    if(adjustedUV.x < 0.0 || adjustedUV.x > 1.0 || adjustedUV.y < 0.0 || adjustedUV.y > 1.0) {
        texColor = vec4(0.0, 0.0, 0.0, 1.0); // Black for areas outside texture
    } else {
        texColor = blur(uTexture, adjustedUV, resolution, blurStrength);
    }
    vec4 trailColor = texture2D(uTrailTexture, vUv);

    // Straight lines section
    float bgGradient = vUv.y;
    bgGradient *= 75.0;
    bgGradient = fract(bgGradient);
    float smoothstepSize = 0.075;
    float lines = smoothstep(0.5 - smoothstepSize, 0.5, bgGradient);
    lines -= smoothstep(0.5, 0.5 + smoothstepSize, bgGradient);

    // Currently unused mouse effect
    float trailIntensity = trailColor.r * 1.5;
    float trailDisplacement = trailIntensity / 4.0;

    float finalColorTest = lines * 0.75;

    gl_FragColor = vec4(vec3(finalColorTest), 1.0);

}
