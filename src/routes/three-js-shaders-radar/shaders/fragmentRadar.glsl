varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse; // Mouse position uniform
uniform vec2 uFbmOffset; // Add new uniform for FBM offset control
uniform float uPulses[30]; // [pulse1X, pulse1Y, pulse1TimeOffset, pulse2X, pulse2Y, pulse2TimeOffset, ...]
uniform int uPulseCount;  // Add pulse count uniform

#define PI 3.1415926535897932384626433832795
#define OCTAVES 4
#define MAX_PULSES 10
#define DELETION_FLASH_DURATION 0.5

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

// Function declarations moved up before they're used
float calculateInteractiveWave(vec2 uv, vec2 pulsesPos[MAX_PULSES], vec2 objectCenter, float objectRadius, float time) {
    float closestPulseDist = 1000.0;

    // Find closest pulse
    for(int i = 0; i < 10; i++) { // WebGL1 requires constant loop bounds
        if(i >= uPulseCount)
            break;
        float dist = length(pulsesPos[i] - objectCenter);
        closestPulseDist = min(closestPulseDist, dist);
    }

    // Calculate distance from current fragment to object's edge
    float distToObject = length(uv - objectCenter) - objectRadius;

    // Maximum distance at which the effect starts to fade
    float maxDistance = 0.15;

    // Create a field that is strongest at the object's edge
    float distFactor = 1.0 - smoothstep(0.0, maxDistance, abs(distToObject));

    // Calculate proximity factor based on closest pulse
    float pulseProximity = 1.0 - smoothstep(0.0, maxDistance, closestPulseDist);
    pulseProximity = pow(pulseProximity, 2.0);

    float baseWaveStrength = 0.0005;
    float maxAddedStrength = 0.0075;

    float waveStrength = baseWaveStrength + (maxAddedStrength * pulseProximity * distFactor);
    waveStrength *= (sin(time * 25.0) * 0.5 + 0.5);

    return waveStrength;
}

// Enhanced function to apply wave distortion with noise and variable frequency
vec2 applyWaveDistortion(vec2 uv, float waveStrength, float waveFrequency, float time) {
    // Calculate distance from center and angle for position-dependent variation
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Create variable frequency based on position and time
    float variableFreq = waveFrequency * (0.8 + 0.4 * noise(uv * 2.0 + time * 0.1));

    // Adjust wave strength and phase based on angle and distance
    float angleModifier = 0.5 + 0.5 * sin(angle * 3.0 + time);
    float distModifier = 0.5 + 0.5 * cos(dist * 4.0 - time * 0.5);

    // Create non-uniform wave distortion with circular and radial components
    vec2 distortedUv = uv;
    distortedUv.x += sin(uv.y * variableFreq + angle * 2.0 + time * 0.3) * waveStrength * angleModifier;
    distortedUv.y += sin(uv.x * (variableFreq * 0.9) - dist * 3.0 + time * 0.2) * waveStrength * distModifier;

    // Add spiral component for more interesting distortion
    float spiralFactor = 0.3 * waveStrength * sin(dist * 10.0 - angle * 4.0 + time);
    distortedUv.x += spiralFactor * sin(angle);
    distortedUv.y += spiralFactor * cos(angle);

    // Use both our noise functions to create complex distortion
    float noiseScale = 4.0;
    float timeScale = 0.05;
    float noiseValue1 = noise(vec2(distortedUv.x * noiseScale, distortedUv.y * noiseScale + time * timeScale));
    float noiseValue2 = noise(vec2(distortedUv.y * noiseScale, distortedUv.x * noiseScale - time * timeScale));

    // Scale the noise effect based on the wave strength and position
    float noiseAmount = waveStrength * 3.0 * (0.8 + 0.4 * sin(dist * 6.0 + time));

    // Apply the noise distortion with variation based on position
    distortedUv.x += noiseValue1 * noiseAmount * (1.0 + 0.3 * sin(uv.y * 3.0 + angle));
    distortedUv.y += noiseValue2 * noiseAmount * (1.0 + 0.3 * cos(uv.x * 3.0 + dist * 5.0));

    return distortedUv;
}

// Enhanced circle function that includes wave distortion
vec3 circle(vec2 uv, vec2 center, float radius, float width, vec3 color, vec2 pulsesPos[MAX_PULSES], float time, vec2 fbmOffset) {
    // Calculate wave strength using our encapsulated function
    float waveStrength = calculateInteractiveWave(uv, pulsesPos, center, radius, time);
    waveStrength *= 1.25;

    // Apply wave distortion
    float waveFrequency = 250.0;
    vec2 wavyUv = applyWaveDistortion(uv, waveStrength, waveFrequency, time);

    // Draw the circle with the distorted coordinates
    float dist = length(wavyUv - center);
    dist = abs(dist - radius);
    float circle_value = 1.0 - smoothstep(width, width + 0.0025, dist);

    return color * circle_value;
}

vec3 _cross(vec2 uv, vec2 center, float radius, vec3 color) {
    vec2 d = uv - center;        // Get displacement vector from center
    float r = length(d);         // Calculate distance from center

    if(r > radius)
        return vec3(0.0);   // Outside the circle radius

    // Create thin lines along x=y and x=-y
    float lineWidth = 0.0025;
    float line1 = smoothstep(lineWidth, 0.0, abs(d.x - d.y));
    float line2 = smoothstep(lineWidth, 0.0, abs(d.x + d.y));

    return color * max(line1, line2);
}

vec2 wave(vec2 uv) {
    float angle = atan(uv.y, uv.x);
    angle = mod(angle + uTime * 1.5, 2.0 * PI);

    // Create a half-circle wide gradient (PI/2 width)
    float halfCircle = PI / 1.0;
    float normalizedAngle = mod(angle, halfCircle) / halfCircle;

    // Create gradient effect only within the first half of the circle
    float isInFirsthalf = step(0.0, angle) * step(angle, halfCircle);

    // Create a smooth gradient that starts at 0, rises quickly to 1, then falls smoothly to 0
    float risePoint = 0.05;
    float rise = smoothstep(0.0, risePoint, normalizedAngle);

    // Use smoothstep for the fall from 1 to 0 in the remaining 80% of the range
    float fall = 1.0 - smoothstep(risePoint, 1.0, normalizedAngle);

    // Combine rise and fall for smooth bell-shaped curve
    float waveFullIntensity = rise * fall * isInFirsthalf;

    // Half intensity gradient (0 to 0.5)
    float waveHalfIntensity = waveFullIntensity * 0.5;

    float fullCircle = length(uv);
    fullCircle = smoothstep(0.7, 0.701, fullCircle);
    fullCircle = 1.0 - fullCircle;

    return vec2(waveHalfIntensity * fullCircle, waveFullIntensity * fullCircle);
}

// Refactored pulseCircle function with adjusted intensity
vec4 pulseCircle(vec2 uv, vec3 color, float time, vec2 offset, float waveIntensity) {
    // Apply the offset to the uv coordinates
    vec2 center = uv + offset * 0.005;

    // Reduce pulse animation speed from 15.0 to 5.0
    float pulse = step(0.0, sin(time * 5.0));
    float innerCircle = length(center);
    innerCircle = smoothstep(0.015, 0.02, innerCircle);

    vec2 dummyPulses[MAX_PULSES];
    for(int i = 0; i < MAX_PULSES; i++) {
        dummyPulses[i] = vec2(-10.0);
    }

    vec3 outerRing = circle(center, vec2(0.0), 0.03, 0.0025, color, dummyPulses, time, vec2(0.0));
    float outerRingValue = outerRing.r;

    float waveMaxDistance = 0.35;
    float timeFragment = mod(time * 0.2, waveMaxDistance) / waveMaxDistance;

    float pulseWave = length(center) - mod(time * 0.2, waveMaxDistance) + 1.0;
    pulseWave = smoothstep(0.9, 1.0, pulseWave);
    float pulseWaveCutOff = step(1.0, pulseWave);
    pulseWaveCutOff = 1.0 - pulseWaveCutOff;
    pulseWave = pulseWaveCutOff * pulseWave;

    float waveOpacity = 1.0 - smoothstep(0.8, 1.0, timeFragment);

    pulseWave *= waveOpacity;

    innerCircle = 1.0 - innerCircle;
    float intensity = (innerCircle * pulse + outerRingValue + pulseWave) * waveIntensity;

    // Scale down intensity for better visual balance when using addition
    intensity *= 0.65;

    // Return vec4 with center position and intensity
    return vec4(center, intensity, 0.0);
}

mat2 rotate2d(float _angle) {
    return mat2(cos(_angle), -sin(_angle), sin(_angle), cos(_angle));
}

vec3 triangle(vec2 uv, float radius, float width) {
    int N = 3;

    // Angle and radius from the current pixel
    float a = atan(uv.x, uv.y) + PI;
    float r = (PI * 2.0) / float(N);

    // Shaping function that modulate the distance
    float d = cos(floor(.5 + a / r) * r - a) * length(uv);

    return vec3(1.0 - smoothstep(.02, .025, d));
}

// Domain warping function to create swirling, flowing patterns
vec2 warp(vec2 pos, float time) {
    vec2 offset = vec2(noise(pos * 0.5 + vec2(time * 0.1, 0.0)), noise(pos * 0.5 + vec2(0.0, time * 0.1)));
    return pos + offset * 0.8;
}

// Ridge noise for creating ridge-like features
float ridge(float n) {
    return 1.0 - abs(n * 2.0 - 1.0); // Transform noise into ridges
}

// Enhanced fbm function for ocean floor terrain
float fbm(vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = 0.25;
    float frequency = 1.5;
    float lacunarity = 2.2;  // Controls how quickly frequency increases (> 2.0 creates more detail)
    float gain = 0.5;        // Controls how quickly amplitude decreases (< 0.5 creates deeper valleys)
    float ridgeOffset = 0.9; // Blend factor for ridge noise

    // Warp the coordinates slightly to create more organic patterns
    vec2 warpedSt = warp(st, uTime * 0.05);

    // Loop of octaves
    for(int i = 0; i < OCTAVES; i++) {
        // Standard noise
        float n = noise(warpedSt * frequency);

        // Ridge noise component
        float ridgeN = ridge(n * 2.0 - 0.3);

        // Blend standard noise with ridge noise
        float blended = mix(n, ridgeN, ridgeOffset);

        value += blended * amplitude;

        // Domain turbulence - slightly warp coordinates for next octave
        warpedSt = warpedSt + vec2(n * 0.15, n * 0.15);

        // Increase frequency and decrease amplitude for next octave
        frequency *= lacunarity;
        amplitude *= gain;
    }

    // Add very low frequency undulation to simulate large seafloor features
    value += noise(st * 0.3) * 0.4;

    // Add some small scale details for texture
    value += noise(st * 5.0) * 0.1;

    // Normalize to 0-1 range and add subtle depth variations
    value = value * 0.6 + 0.4;

    // Create occasional deeper trenches
    float trench = pow(noise(st * 0.5), 0.25) * 0.4;
    value -= trench;

    return clamp(value, 0.0, 1.0);
}

vec3 sectorCircle(vec2 uv, vec2 center, float radius, float width, float targetAngle, vec3 color) {
    vec2 p = uv - center;
    float dist = length(p);

    // Get angle in range [0, 2PI]
    float angle = atan(p.y, p.x) + PI;

    // Create sector centered around target angle
    float sectorWidth = PI * 0.02; // Narrow beam
    float angleDiff = mod(angle - targetAngle, 2.0 * PI);
    float inSector = 1.0 - step(sectorWidth, angleDiff);

    // Draw thin ring
    float ring = smoothstep(radius - width, radius, dist);
    ring *= 1.0 - smoothstep(radius, radius, dist);

    // Pulse the intensity
    ring *= sin(uTime * 5.0) * 0.5 + 0.5;

    return color * ring * inSector;
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    // Apply FBM offset to our entire coordinate system for consistent movement
    vec2 offsetUv = uv;

    // Create a scaled version of the FBM offset for visual elements
    vec2 scaledFbmOffset = uFbmOffset * 7.0;

    vec3 colorBlue = vec3(0.44, 0.78, 0.97);
    vec3 colorBlueDark = vec3(0.16, 0.3, 0.45);
    vec3 colorWhite = vec3(1.0);
    vec3 colorOrange = vec3(1.0, 0.36, 0.25);
    vec3 colorGray = vec3(0.5, 0.5, 0.5); // Gray color for the cross
    vec3 colorGreen = vec3(0.0, 0.68, 0.22);
    vec3 colorRed = vec3(1.0, 0.0, 0.0);

    // Highlight effect based on mouse position
    vec2 mousePos = uMouse * 2.0 - 1.0; // Convert mouse from 0-1 to -1 to 1

    // Wave now returns vec2 with (halfIntensity, fullIntensity)
    vec2 waveValues = wave(offsetUv);
    float waveHalfIntensity = waveValues.x; // 0-0.5 range for color mixing
    float waveFullIntensity = waveValues.y; // 0-1 range for pulse masking

    // Create array of pulse positions
    vec2 pulsePositions[MAX_PULSES];
    float pulseIntensities[MAX_PULSES];
    float deletionEffects[MAX_PULSES];

    // Initialize arrays
    for(int i = 0; i < MAX_PULSES; i++) {
        pulsePositions[i] = vec2(-10.0);
        pulseIntensities[i] = 0.0;
        deletionEffects[i] = 0.0;
    }

    // Process all pulses
    for(int i = 0; i < MAX_PULSES; i++) {
        if(i >= uPulseCount)
            break;
        int idx = i * 4; // Updated stride to include deletion time
        pulsePositions[i] = offsetUv - vec2(uPulses[idx], uPulses[idx + 1]);

        // Calculate deletion effect (flash) intensity
        float deletionTime = uPulses[idx + 3];
        if(deletionTime > 0.0) {
            float timeSinceDeletion = uTime - deletionTime;
            if(timeSinceDeletion < DELETION_FLASH_DURATION) {
                deletionEffects[i] = 1.0 - (timeSinceDeletion / DELETION_FLASH_DURATION);
            }
        }

        vec4 pulse = pulseCircle(pulsePositions[i], vec3(1.0), uTime + uPulses[idx + 2], scaledFbmOffset, waveFullIntensity);
        pulseIntensities[i] = pulse.z;
    }

    // Find minimum distance to center for triangle coloring
    float minDist = 1000.0;
    for(int i = 0; i < MAX_PULSES; i++) {
        if(i >= uPulseCount)
            break;
        int idx = i * 4;  // Fix: Changed from 3 to 4 to match correct stride
        float dist = length(vec2(uPulses[idx], uPulses[idx + 1]));
        minDist = min(minDist, dist);
    }

    // Calculate triangle color based on minimum distance
    float distanceToPulse = smoothstep(0.1, 0.3, minDist);
    distanceToPulse = 1.0 - distanceToPulse;
    distanceToPulse = clamp(distanceToPulse, 0.0, 1.0);

    // Create colored circles using the enhanced circle function
    vec3 circle1 = circle(offsetUv, vec2(0.0, 0.0), 0.025, 0.001, colorBlue, pulsePositions, uTime, scaledFbmOffset);
    vec3 circle2 = circle(offsetUv, vec2(0.0, 0.0), 0.3, 0.001, colorBlue, pulsePositions, uTime, scaledFbmOffset);
    vec3 circle3 = circle(offsetUv, vec2(0.0, 0.0), 0.5, 0.001, colorBlue, pulsePositions, uTime, scaledFbmOffset);
    vec3 circle4 = circle(offsetUv, vec2(0.0, 0.0), 0.7, 0.003, colorBlue, pulsePositions, uTime, scaledFbmOffset);

    // Create dummy array for static circles
    vec2 dummyPulses[MAX_PULSES];
    for(int i = 0; i < MAX_PULSES; i++) {
        dummyPulses[i] = vec2(-10.0);
    }

    vec3 circle5 = circle(offsetUv, vec2(0.0), 0.75, 0.003, colorBlueDark, dummyPulses, uTime, vec2(0.0));
    vec3 circle6 = circle(offsetUv, vec2(0.0), 0.85, 0.006, colorWhite, dummyPulses, uTime, vec2(0.0));

    vec3 cross = _cross(offsetUv, vec2(0.0), 0.7, colorGray);

    float circle5CutOff = abs(offsetUv.y);
    circle5CutOff = step(sin(uTime) * 0.125 + 0.17, circle5CutOff);
    circle5CutOff -= step(abs(offsetUv.x), sin(uTime) * 0.125 + 0.17);
    circle5 = circle5 * vec3(circle5CutOff);

    float circle6CutOff = abs(offsetUv.y);
    circle6CutOff = step(0.05, circle6CutOff);
    circle6CutOff -= step(abs(offsetUv.x), 0.05);
    float testCutOff = abs(offsetUv.x + offsetUv.y);
    testCutOff = step(0.1, testCutOff);
    float testCutOff2 = abs(offsetUv.x - offsetUv.y);
    testCutOff2 = step(0.1, testCutOff2);
    testCutOff = min(testCutOff, testCutOff2);
    circle6CutOff *= testCutOff;
    circle6 = circle6 * vec3(circle6CutOff);

    // Number of sides of your shape
    float scaledOscilation = sin(uTime * 2.0) * 0.05 + 0.05;

    // Apply FBM offset to triangle coordinates
    vec2 offsetWithOscillation = vec2(0.0, 0.815 + scaledOscilation);
    vec2 triangleRotatedUv1 = offsetUv * rotate2d(PI * 1.0);
    vec2 triangleRotatedUv2 = offsetUv * rotate2d(PI * 0.5);
    vec2 triangleRotatedUv3 = offsetUv * rotate2d(PI * 1.5);

    // Generate the basic triangle shapes
    vec3 triangleValue1 = triangle(vec2(triangleRotatedUv1.x, triangleRotatedUv1.y) + offsetWithOscillation, 0.5, 0.0025);
    vec3 triangleValue2 = triangle(vec2(offsetUv.x, offsetUv.y) + offsetWithOscillation, 0.5, 0.0025);
    vec3 triangleValue3 = triangle(vec2(triangleRotatedUv2.x, triangleRotatedUv2.y) + offsetWithOscillation, 0.5, 0.0025);
    vec3 triangleValue4 = triangle(vec2(triangleRotatedUv3.x, triangleRotatedUv3.y) + offsetWithOscillation, 0.5, 0.0025);

    // Mix the triangle colors with red based on distanceToPulse
    // Get the intensity of each triangle (since they're white by default)
    float triangle1Intensity = length(triangleValue1);
    float triangle2Intensity = length(triangleValue2);
    float triangle3Intensity = length(triangleValue3);
    float triangle4Intensity = length(triangleValue4);

    // Mix between white and red using distanceToPulse as the mix factor
    // The original triangle function returns white, so we need to create colored versions
    triangleValue1 = triangle1Intensity * mix(colorWhite, colorRed, distanceToPulse);
    triangleValue2 = triangle2Intensity * mix(colorWhite, colorRed, distanceToPulse);
    triangleValue3 = triangle3Intensity * mix(colorWhite, colorRed, distanceToPulse);
    triangleValue4 = triangle4Intensity * mix(colorWhite, colorRed, distanceToPulse);

    // Apply FBM with the offset uniform 
    float circleBg = length(offsetUv) - 0.0;
    circleBg = step(abs(circleBg), 0.7);
    float fbmValue = fbm(offsetUv * 3.0 + uFbmOffset);
    vec3 circleBgColor = colorBlue * circleBg * fbmValue;

    // Create green wave color component
    vec3 waveColor = colorGreen * waveHalfIntensity;

    // Start with a base composition of the static elements
    vec3 color = circle1 + circle2 + circle3 + circle4 +
        circle5 + circle6 + cross + triangleValue1 + triangleValue2 +
        triangleValue3 + triangleValue4 + circleBgColor + waveColor;

    // Add sector circles for each pulse
    vec3 sectorEffects = vec3(0.0);
    for(int i = 0; i < MAX_PULSES; i++) {
        if(i >= uPulseCount)
            break;

        int idx = i * 4;
        vec2 pulsePos = vec2(uPulses[idx], uPulses[idx + 1]);
        float pulseDistFromCenter = length(pulsePos);

        // Only show sector for pulses far from center and not deleted
        if(pulseDistFromCenter > 0.7 && uPulses[idx + 3] < 0.0) {
            // Calculate angle towards pulse
            float targetAngle = atan(pulsePos.y, pulsePos.x) + PI;
            vec3 sectorEffect = sectorCircle(offsetUv, vec2(0.0), 0.7, 0.04, targetAngle, colorOrange);
            sectorEffects += sectorEffect;
        }
    }

    // Add sector effects to final color
    color += sectorEffects;

    // Apply all pulse intensities
    for(int i = 0; i < MAX_PULSES; i++) {
        if(i >= uPulseCount)
            break;
        color = mix(color, colorOrange, pulseIntensities[i] * 0.7);
    }

    // Apply deletion flash effect with green color
    vec3 flashColor = vec3(0.0, 1.0, 0.2); // Bright green flash
    float totalFlashEffect = 0.0;

    for(int i = 0; i < MAX_PULSES; i++) {
        if(i >= uPulseCount)
            break;
        totalFlashEffect = max(totalFlashEffect, deletionEffects[i]);
    }

    // Apply the brightest flash effect
    color = mix(color, flashColor, totalFlashEffect * 0.7);

    gl_FragColor = vec4(color, 1.0);
}
