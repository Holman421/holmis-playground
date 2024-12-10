#include ../includes/simplexNoise2d.glsl

uniform float uGridSize;
uniform float uPositionFrequency;
uniform float uWarpFrequency;
uniform float uWarpStrength;
uniform float uStrength;
uniform float uBaseHeight;

float getElevation(vec2 position) {
    vec2 steppedPosition = floor(position / (1.0 / uGridSize)) * (1.0 / uGridSize);

    vec2 warpedPosition = steppedPosition;
    warpedPosition += simplexNoise2d(warpedPosition * uWarpFrequency) * uWarpStrength;

    float elevation = 0.0;
    elevation += simplexNoise2d(warpedPosition * uPositionFrequency) / 2.0;
    elevation += simplexNoise2d(warpedPosition * uPositionFrequency * 2.0) / 4.0;
    elevation += simplexNoise2d(warpedPosition * uPositionFrequency * 4.0) / 8.0;

    return elevation * uStrength;
}

varying vec3 vWorldPosition; // World position for accurate elevation
varying float vElevation;    // Elevation value for coloring
varying float vUpDot;        // For slope detection

void main() {
    int index = gl_InstanceID;
    float x = mod(float(index), uGridSize) / uGridSize;
    float z = floor(float(index) / uGridSize) / uGridSize;

    float elevation = getElevation(vec2(x, z)); // Compute elevation
    float height = max(elevation + uBaseHeight, 0.0);

    vec3 pos = position;
    pos.y *= height * 1.0;  // Apply height to the Y-axis
    pos.y += uBaseHeight;

    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;

    // Pass data to fragment shader
    vWorldPosition = worldPosition.xyz;
    vElevation = pos.y - 0.75; // Pass actual height after elevation adjustment
    vUpDot = dot(normalMatrix * vec3(0.0, 1.0, 0.0), normalize(worldPosition.xyz));
}