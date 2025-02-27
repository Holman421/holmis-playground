attribute vec3 aPositionTarget;
attribute float aRandomSize;

uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec3 vColor;
varying vec3 vPosition;

#include ./simplexNoise3D.glsl

void main() {
    // Mixed position
    float noiseOrigin = simplexNoise3d(position * 0.2);
    float noiseTarget = simplexNoise3d(aPositionTarget * 0.2);
    float noise = mix(noiseOrigin, noiseTarget, uProgress);
    noise = smoothstep(-1.0, 1.0, noise);

    float duration = 0.4;
    float delay = (1.0 - duration) * noise;
    float end = delay + duration;
    float progress = smoothstep(delay, end, uProgress);

    vec3 mixedPosition = mix(position, aPositionTarget, progress);

    // Final position
    vec4 modelPosition = modelMatrix * vec4(mixedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = vec4(projectedPosition.xy, 0.0, 1.0); // Remove perspective

    // Point size
    float finalRandomSize = smoothstep(0.2, 1.0, aRandomSize);
    float distanceToCenter = length(mixedPosition);
    // float distanceScale = 1.1 - smoothstep(0.5, 3.0, distanceToCenter);
    gl_PointSize = uSize * uResolution.y * finalRandomSize * 1.0;
    gl_PointSize *= (1.5 / -viewPosition.z);

    // Varyings
    vColor = mix(uColorA, uColorB, noise);
    vPosition = mixedPosition;
}