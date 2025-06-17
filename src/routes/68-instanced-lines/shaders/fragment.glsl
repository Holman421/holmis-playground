varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uTrailTexture; // Mouse trail texture
uniform vec2 uResolution; // Screen resolution
uniform float uTime;
uniform float uAspect; // Screen aspect ratio (width/height)
uniform float uTextureAspect; // Texture aspect ratio (width/height)
uniform float uTextureScale; // Texture scaling factor (1.0 = normal, >1.0 = zoom in, <1.0 = zoom out)
uniform float uBlurStrength; // Blur strength controlled by UI

// Function to calculate correct UV coordinates that maintain aspect ratio
vec2 preserveAspectRatioUV(vec2 uv, float textureAspect) {
    // Calculate the container aspect ratio
    float screenAspect = uResolution.x / uResolution.y;
    
    // Compare the texture aspect ratio with the container aspect ratio
    vec2 newUV = uv - 0.5; // Center the UVs around origin
    
    // Apply texture scale factor (zoom in/out)
    // When scale < 1, we zoom out (more of the texture is visible)
    // When scale > 1, we zoom in (texture appears larger, more cropping)
    newUV /= uTextureScale;
    
    if (screenAspect > textureAspect) {
        // Screen is wider than texture - adjust X coordinates
        // Scale by the ratio of aspects to maintain texture aspect
        newUV.x *= screenAspect / textureAspect;
    } else {
        // Screen is taller than texture - adjust Y coordinates
        newUV.y *= textureAspect / screenAspect;
    }
    
    return newUV + 0.5; // Shift back to 0-1 range
}

// Gaussian blur function adapted from test.glsl
vec4 blur(sampler2D textureSampler, vec2 uv, vec2 resolution, float radius) {
    float w0 = 0.3780 / pow(radius, 1.975);
    float rr = radius * radius;
    vec2 p;
    vec4 col = vec4(0.0, 0.0, 0.0, 0.0);
    
    // Pre-calculate step sizes
    float dx = 1.0 / resolution.x;
    float dy = 1.0 / resolution.y;
    
    for (float i = -radius; i <= radius; i += 1.0) {
        float xx = i * i;
        p.x = uv.x + (i * dx);
        
        for (float j = -radius; j <= radius; j += 1.0) {
            float yy = j * j;
            p.y = uv.y + (j * dy);
            
            if (xx + yy <= rr) {
                float w = w0 * exp((-xx - yy) / (2.0 * rr));
                col += texture(textureSampler, p) * w;
            }
        }
    }
    return col;
}

void main() {
    // Use blur strength from uniform with fallback value
    float blurStrength = uBlurStrength > 0.0 ? uBlurStrength : 10.0;
    
    // Apply blur to the texture
    vec2 resolution = vec2(1024.0, 1024.0); // Default resolution if uniform not provided
    if (uResolution != vec2(0.0)) {
        resolution = uResolution;
    }
      // Use the actual texture aspect ratio from the uniform
    float textureAspect = uTextureAspect;
    
    // Get correct UV coordinates that preserve aspect ratio
    vec2 adjustedUV = preserveAspectRatioUV(vUv, textureAspect);

    
    // Check if the adjusted UVs are outside the 0-1 range (texture boundaries)
    // If so, we'll use black color instead of the texture
    vec4 texColor;
    if (adjustedUV.x < 0.0 || adjustedUV.x > 1.0 || adjustedUV.y < 0.0 || adjustedUV.y > 1.0) {
        texColor = vec4(0.0, 0.0, 0.0, 1.0); // Black for areas outside texture
    } else {
        // Get the base image color with blur using the adjusted UVs
        texColor = blur(uTexture, adjustedUV, resolution, blurStrength);
    }

    
    // Get the mouse trail color (no blur for trail)
    vec4 trailColor = texture2D(uTrailTexture, vUv);

    gl_FragColor = vec4(trailColor);

    
    // Scale the trail intensity for a more controlled effect
    float trailIntensity = trailColor.r * 1.5; // Scale up but don't overdo it
    
    // Combine for displacement calculation
    float baseDisplacement = (texColor.r + texColor.g + texColor.b) / 20.0;
    float trailDisplacement = trailIntensity / 4.0; // More subtle trail effect
    
    // Max displacement value - adjust as needed
    float maxDisplacement = 0.1;
    
    // Combined displacement with smooth transition
    float displacement = (baseDisplacement + trailDisplacement) * maxDisplacement;

    // Apply the displacement to create the line effect
    float modifiedY = vUv.y - displacement;
    vec3 finalColor = vec3(modifiedY);

    finalColor *= 75.0;
    finalColor = fract(finalColor);

    float smoothstepSize = 0.1;
    float line = smoothstep(0.5 - smoothstepSize, 0.5, finalColor.r);
    line -= smoothstep(0.5, 0.5 + smoothstepSize, finalColor.r);
    
    gl_FragColor = vec4(vec3(line), 1.0);
}
