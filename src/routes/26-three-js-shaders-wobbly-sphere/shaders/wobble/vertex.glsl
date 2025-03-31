#include ../includes/simplexNoise4d.glsl

attribute vec4 tangent;

uniform float uTime;
uniform float uPositionFrequency;
uniform float uTimeFrequency;
uniform float uStrength;

uniform float uWarpPositionFrequency;
uniform float uWarpTimeFrequency;
uniform float uWarpStrength;

uniform vec2 uMousePosition;

varying float vWobble;

float getWobble(vec3 position) {
    // Calculate view-space position
    vec3 viewPosition = normalize(position);

    // Calculate distance from mouse position to current point
    vec2 spherePos = vec2(viewPosition.x, viewPosition.y);
    float distanceToMouse = length(spherePos - uMousePosition);

    // Create a falloff effect
    float mouseFalloff = 1.2 - smoothstep(0.0, 0.75, distanceToMouse);

    vec3 warpedPosition = position;
    warpedPosition += simplexNoise4d(vec4(warpedPosition * uWarpPositionFrequency, uTime * uWarpTimeFrequency)) * uWarpStrength;

    float noise = simplexNoise4d(vec4(warpedPosition * uPositionFrequency, uTime * uTimeFrequency));
    return noise * uStrength * mouseFalloff;
}

void main() {
    vec3 biTangent = cross(normal, tangent.xyz);

    // Neighbours
    float shift = 0.01;
    vec3 position1 = csm_Position + tangent.xyz * shift;
    vec3 position2 = csm_Position + biTangent * shift;

    // Wobble
    float wobble = getWobble(csm_Position);
    csm_Position += wobble * normal;
    position1 += getWobble(position1) * normal;
    position2 += getWobble(position2) * normal;

    // Compute normal
    vec3 toA = normalize(position1 - csm_Position);
    vec3 toB = normalize(position2 - csm_Position);
    csm_Normal = cross(toA, toB);

    // Varyings 
    vWobble = wobble / uStrength;
}