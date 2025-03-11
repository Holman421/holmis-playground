uniform sampler2D tDiffuse;
uniform sampler2D uTrailTexture;
uniform float uTime;
uniform float uPixelSize;
uniform vec2 uResolution;
uniform float uScrollProgress; // New uniform for scroll progress
uniform bool uIsMobile; // New uniform for mobile detection
uniform bool uPixelationEnabled; // Add new uniform
uniform bool uDistortionEnabled;
uniform float uDistortionAmount;
uniform float uDistortionSpeed;
varying vec2 vUv;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);

    float res = mix(mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x), mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

// Function to create a distorted circle with noise
float noisyCircle(vec2 uv, vec2 center, float radius, float noiseAmount, float noiseScale, float timeOffset) {
    // Add time-based animation to the noise with controllable speed
    float t = uTime * (uDistortionEnabled ? uDistortionSpeed * 0.025 : 0.0) + timeOffset;

    // Calculate standard distance from center
    vec2 distVec = uv - center;

    // Apply noise distortion to the distance vector with proper scaling
    float noiseVal = 0.0;
    if(uDistortionEnabled) {
        noiseVal = noise(uv * noiseScale + vec2(sin(t), cos(t))) * noiseAmount * uDistortionAmount;
    }
    float dist = length(distVec) + noiseVal * radius * 0.4;

    // Create soft falloff from center
    return 1.0 - smoothstep(0.0, radius * (1.0 + noiseVal * 0.2), dist);
}

void main() {
    // Get absolute pixel size in screen space
    float pixelSizeInPixels = uPixelSize;

    // Calculate normalized pixel size (different for x and y to ensure square pixels)
    vec2 pixelSize;
    pixelSize.y = pixelSizeInPixels / uResolution.y;
    pixelSize.x = pixelSizeInPixels / uResolution.x;

    // Sample coordinates based on pixelation setting
    vec2 samplePoint;
    if(uPixelationEnabled) {
        // This ensures the pixels are square in screen space
        vec2 pixelCoord = floor(vUv / pixelSize) * pixelSize;
        // Sample from center of each square
        samplePoint = pixelCoord + pixelSize * 0.5;
    } else {
        samplePoint = vUv;
    }

    // Sample the trail texture at the pixelated coordinate
    vec4 trailColor = texture2D(uTrailTexture, samplePoint);
    float trailColorFinal = trailColor.r;
    trailColorFinal = step(0.5, trailColorFinal);
    trailColorFinal *= 0.07;

    // Set up static background color (#171615)
    vec3 bgColor = vec3(0.09, 0.086, 0.082); // #171615 in RGB

    // Mix the background with white based on the trail intensity
    // vec3 finalColor = mix(bgColor, vec3(1.0), trailColorFinal);

    // Use pixelated coordinates for the circle to match the overall pixelation effect
    float circle = noisyCircle(samplePoint, vec2(0.0, 1.0), 0.6, 4.0, 30.0, 0.0);
    float circle1Opacity = 1.1 * (1.0 - uScrollProgress * 2.0);
    circle1Opacity = clamp(circle1Opacity, 0.0, 1.0);
    circle *= circle1Opacity;
    circle = step(0.2, circle) * 0.075; 

    // Adjust the opacity calculation based on mobile view
    float circle2Opacity;
    if(uIsMobile) {
        // On mobile, make the circle appear earlier and fade in faster
        circle2Opacity = 0.75 * (uScrollProgress * 2.5 - 0.015);
    } else {
        // Original calculation for larger screens
        circle2Opacity = 0.75 * (uScrollProgress * 2.0 - 0.5);
    }

    float circle2 = noisyCircle(samplePoint, vec2(0.5, 0.5), 0.7, 2.0, 30.0, 0.0);
    circle2 = smoothstep(0.0, 1.0, circle2);
    circle2Opacity = clamp(circle2Opacity, 0.0, 1.0);
    circle2 *= circle2Opacity;
    circle2 = step(0.2, circle2) * 0.075;

    float circles = circle + circle2;
    circles = max(circles, trailColorFinal);

    // Mix the circles with the existing color based on their scroll-dependent opacities
    vec3 finalColor = mix(bgColor, vec3(1.0), circles);

    gl_FragColor = vec4(finalColor, 1.0);
}