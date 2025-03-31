// Core uniforms
uniform sampler2D tDiffuse;
uniform sampler2D uTrailTexture;
uniform float uTime;
uniform vec2 uResolution;

// Add ripple uniforms
uniform vec2 uRippleCenter;
uniform float uRippleProgress;
uniform bool uRippleActive;

// Effect toggles
uniform bool uPixelationEnabled;
uniform bool uDistortionEnabled;
uniform bool uStepEnabled;

// Effect parameters
uniform float uPixelSize;
uniform float uDistortionAmount;
uniform float uDistortionSpeed;
uniform float uDistortionScale; // Add new uniform
uniform float uColorOpacity;

// Visual properties
uniform vec3 uTrailColor;
uniform float uScrollProgress;
uniform bool uIsMobile;

varying vec2 vUv;

// -------- Noise functions --------
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

// -------- Effect functions --------
vec2 calculatePixelation(vec2 uv) {
    if(!uPixelationEnabled)
    return uv;

    vec2 pixelSize = vec2(uPixelSize / uResolution.x, uPixelSize / uResolution.y);

    vec2 pixelCoord = floor(uv / pixelSize) * pixelSize;
    return pixelCoord + pixelSize * 0.5;
}

float calculateDistortion(vec2 uv, float baseRadius, float noiseAmount, float noiseScale) {
    if(!uDistortionEnabled)
    return 0.0;

    float t = uTime * uDistortionSpeed * 0.025;
    return noise(uv * noiseScale * uDistortionScale + vec2(sin(t), cos(t))) * noiseAmount * uDistortionAmount;
}

float createNoisyCircle(vec2 uv, vec2 center, float radius, float noiseAmount, float noiseScale) {
    vec2 distVec = uv - center;
    float noiseVal = calculateDistortion(uv, radius, noiseAmount, noiseScale);
    float dist = length(distVec) + noiseVal * radius * 0.4;

    return 1.0 - smoothstep(0.0, radius * (1.0 + noiseVal * 0.2), dist);
}

float createNoisyRectangle(vec2 uv, vec2 center, vec2 dimensions, float cornerRadius, float noiseAmount, float noiseScale) {
    vec2 distVec = abs(uv - center);
    float scaledNoise = noiseScale * 2.5;
    float noiseVal = calculateDistortion(uv, max(dimensions.x, dimensions.y), noiseAmount, scaledNoise);

    // Calculate rounded rectangle
    vec2 roundedDist = distVec - dimensions * 0.5 + cornerRadius;
    float outsideDistance = length(max(roundedDist, 0.0)) + min(max(roundedDist.x, roundedDist.y), 0.0) - cornerRadius;

    // Add noise to the edges
    outsideDistance += noiseVal * 0.015;

    return 1.0 - smoothstep(0.0, 0.1, outsideDistance);
}

float applyStep(float value, float threshold1, float threshold2) {
    if(!uStepEnabled) {
        return value;
    }

    // Apply three-level stepping
    if(value > threshold1) {
        return 1.0;    // High intensity
    } else if(value > threshold2) {
        return 0.5;    // Medium intensity
    } else {
        return 0.0;    // Low intensity
    }
}

// -------- Circle calculations --------
float calculateCircle1(vec2 samplePoint) {
    // Get trail influence
    vec4 trailSample = texture2D(uTrailTexture, samplePoint);
    float trailInfluence = smoothstep(0.0, 1.0, trailSample.r) * 0.3;

    // Modify circle position based on trail
    vec2 circleCenter = vec2(1.0, 1.0) + trailInfluence * vec2(sin(uTime), cos(uTime));
    float radius = 0.6 + trailInfluence * 0.2;

    float circle = createNoisyCircle(samplePoint, circleCenter, radius, 4.0 + trailInfluence * 8.0, 30.0);
    float opacity = 1.1 * (1.0 - uScrollProgress * 2.0);
    return circle * opacity;
}

float calculateCircle2(vec2 samplePoint) {
    // Get trail influence
    vec4 trailSample = texture2D(uTrailTexture, samplePoint);
    float trailInfluence = smoothstep(0.0, 1.0, trailSample.r) * 0.25;

    float distortionAmount = 2.0 - uScrollProgress * 2.0;
    float radius = 1.7 * (uScrollProgress * 1.25) + trailInfluence;
    vec2 circleCenter = vec2(0.5, 0.5) + trailInfluence * vec2(cos(uTime * 0.5), sin(uTime * 0.5));

    float circle = createNoisyCircle(samplePoint, circleCenter, radius, distortionAmount + trailInfluence * 4.0, 30.0);
    circle = smoothstep(0.0, 1.0, circle);

    float opacity = uIsMobile ? 0.75 * (uScrollProgress * 1.5 - 0.015) : 0.75 * (uScrollProgress * 0.5 + 0.2);
    return circle * opacity;
}

float calculateRipple(vec2 uv) {
    if(!uRippleActive)
    return 0.0;

    float dist = length(uv - uRippleCenter);
    float maxRadius = 0.2; // Maximum radius of the ripple
    float rippleWidth = 0.025; // Thinner ring
    float rippleFront = uRippleProgress * maxRadius;
    float rippleEdge = max(0.0, rippleFront - rippleWidth);

    // Power loss over distance
    float powerFalloff = 1.0 - smoothstep(0.0, maxRadius, rippleFront);

    // Create ring effect with power falloff
    float ring = smoothstep(rippleFront, rippleEdge, dist) *
    smoothstep(rippleEdge - rippleWidth, rippleEdge, dist) *
    powerFalloff;

    // Add subtle fade at the end of animation
    float fadeOut = 1.0 - smoothstep(0.8, 1.0, uRippleProgress);

    ring = applyStep(ring, 0.5, 0.3);

    return ring * fadeOut * 0.8; // Slightly reduce overall intensity
}

float calculateRectangle(vec2 samplePoint) {
    // Get trail influence
    vec4 trailSample = texture2D(uTrailTexture, samplePoint);
    float trailInfluence = smoothstep(0.0, 1.0, trailSample.r) * 0.2;

    // Make rectangle react to trail
    vec2 rectCenter = vec2(0.3, 0.6) + trailInfluence * vec2(cos(uTime * 0.7), sin(uTime * 0.7));
    float viewportAspectRatio = uResolution.x / uResolution.y;
    vec2 rectDimensions = vec2(0.3 / viewportAspectRatio + trailInfluence * 0.1, 0.1 + trailInfluence * 0.05);
    float cornerRadius = 0.02 + trailInfluence * 0.03;

    float rect = createNoisyRectangle(samplePoint, rectCenter, rectDimensions, cornerRadius, 2.0 + trailInfluence * 4.0, 20.0);

    float opacity = 1.0 - smoothstep(0.0, 0.3, uScrollProgress);
    return rect * opacity;
}

void main() {
    // Calculate pixelated sampling point
    vec2 samplePoint = calculatePixelation(vUv);

    // Process trail
    vec4 trailColor = texture2D(uTrailTexture, samplePoint);
    // trailColor = smoothstep(-0.5, 1.0, trailColor);
    float trailColorFinal = applyStep(trailColor.r, 0.9, 0.5) * uColorOpacity;
    // trailColorFinal = pow(trailColorFinal, 2.0);

    // Process circles and rectangle
    float circle1 = calculateCircle1(samplePoint);
    float circle2 = calculateCircle2(samplePoint);
    float rectangle = calculateRectangle(samplePoint);

    if(uStepEnabled) {
        circle1 = applyStep(circle1, 0.55, 0.3) * uColorOpacity;
        circle2 = applyStep(circle2, 0.4, 0.3) * uColorOpacity;
        rectangle = applyStep(rectangle, 0.6, 0.3) * uColorOpacity;
    }

    // Combine effects
    float circles = max(max(circle1 + circle2, rectangle), trailColorFinal);

    // Add ripple effect
    float ripple = calculateRipple(samplePoint);
    circles = max(circles, ripple);

    // Create color variations
    vec3 bgColor = vec3(0.09, 0.086, 0.082);
    vec3 brightColor = uTrailColor * 1.2;
    vec3 darkColor = uTrailColor * 0.7;

    // Final color mixing
    vec3 finalColor = mix(bgColor, mix(darkColor, brightColor, step(0.75, circles)), circles);

    gl_FragColor = vec4(finalColor, 1.0);
}