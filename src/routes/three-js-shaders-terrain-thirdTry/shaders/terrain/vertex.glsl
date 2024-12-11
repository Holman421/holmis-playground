#include ../includes/simplexNoise2d.glsl

uniform float uGridSize;
uniform float uPositionFrequency;
uniform float uWarpFrequency;
uniform float uWarpStrength;
uniform float uStrength;
uniform float uBaseHeight;
uniform float uTime;
uniform float uAnimationSpeed;  // Add this line

float getElevation(vec2 position) {
    vec2 steppedPosition = floor(position / (1.0 / uGridSize)) * (1.0 / uGridSize);

    vec2 warpedPosition = steppedPosition;
    warpedPosition += uTime * uAnimationSpeed; // Modify this line
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

varying vec3 vWorldPosition; // World position for accurate elevation
varying float vElevation;    // Elevation value for coloring
varying float vUpDot;        // For slope detection
varying vec3 vLocalPosition; // Add this new varying

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

    // Calculate world position for varyings
    vec4 meshWorldPos = instanceMatrix * vec4(pos, 1.0);

    // Set varyings
    vWorldPosition = meshWorldPos.xyz;
    vElevation = elevation;
    vUpDot = dot(normalMatrix * vec3(0.0, 1.0, 0.0), normalize(meshWorldPos.xyz));
    vLocalPosition = pos;
}