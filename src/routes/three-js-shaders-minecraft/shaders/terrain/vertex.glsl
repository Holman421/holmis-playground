#include ../includes/simplexNoise2d.glsl

uniform float uGridSize;
uniform float uPositionFrequency;
uniform float uWarpFrequency;
uniform float uWarpStrength;
uniform float uStrength;
uniform float uBaseHeight;
uniform float uTime;
uniform float uAnimationSpeed;  // Add this line

uniform vec3 uColorWaterDeep;
uniform vec3 uColorWaterSurface;
uniform vec3 uColorSand;
uniform vec3 uColorGrass;
uniform vec3 uColorRock;
uniform vec3 uColorSnow;

float getElevation(vec2 position) {
    // Center the position around origin
    vec2 centeredPosition = position - 0.5;

    // Step the position based on grid size
    vec2 steppedPosition = floor(centeredPosition * uGridSize) / uGridSize;

    // Apply warping from center
    vec2 warpedPosition = steppedPosition;
    warpedPosition += uTime * (uAnimationSpeed * 0.25) - vec2(0.0, 0.1);
    warpedPosition += simplexNoise2d(warpedPosition * uWarpFrequency) * uWarpStrength;

    float elevation = 0.0;
    elevation += simplexNoise2d(warpedPosition * uPositionFrequency) / 2.0;
    elevation += simplexNoise2d(warpedPosition * uPositionFrequency * 2.0) / 4.0;
    elevation += simplexNoise2d(warpedPosition * uPositionFrequency * 4.0) / 8.0;

    // Apply strength to make terrain more extreme
    elevation *= uStrength;

    // Apply the squaring effect
    float elevationSign = sign(elevation);
    elevation = pow(abs(elevation), 2.0) * elevationSign;

    // Use strength to control the number of levels (more strength = more discrete levels)
    float levels = 2.0 + (uStrength * 15.0); // This will give between 10 and 40 levels
    elevation = floor(elevation * levels) / levels;

    return elevation;
}

varying vec3 vColor;  // New varying for color

// Need to declare csm_Position as an output
out vec3 csm_Position;

void main() {
    // Start with the position attribute
    vec3 pos = position;

    int index = gl_InstanceID;
    float x = mod(float(index), uGridSize) / uGridSize;
    float z = floor(float(index) / uGridSize) / uGridSize;

    float elevation = getElevation(vec2(x, z));

    // Modify Y position based on elevation
    if(pos.y > 0.0) {
        pos.y = (uBaseHeight + elevation);
    }

    // Set csm_Position
    csm_Position = pos;

    // Calculate color in vertex shader
    float height = floor((pos.y - 0.5) * 80.0) / 80.0;

    // Define threshold levels
    float waterLevel = 0.2;
    float waterDeepLevel = waterLevel * 0.4;
    float sandLevel = 0.25;
    float grassLevel = 0.55;
    float snowLevel = 0.9;

    // Use step function for sharp transitions
    vec3 color = uColorWaterDeep;
    color = mix(color, uColorWaterSurface, step(waterDeepLevel, height));
    color = mix(color, uColorSand, step(waterLevel, height));
    color = mix(color, uColorGrass, step(sandLevel, height));
    color = mix(color, uColorRock, step(grassLevel, height));
    color = mix(color, uColorSnow, step(snowLevel, height));

    // Set varyings
    vColor = color;  // Pass color to fragment shader
}