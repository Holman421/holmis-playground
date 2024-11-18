attribute float aIntensity;
attribute float aAngle;

uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uPictureTextureNext;
uniform sampler2D uDisplacementTexture;
uniform vec3 uColor;
uniform float uProgress;
uniform float uTotalDisplacement;

varying vec3 vColor;

#include "./sNoise.glsl";

void main() {
    // Displacement
    vec3 newPosition = position;
    float displacementIntensity = texture(uDisplacementTexture, uv).r;
    displacementIntensity = smoothstep(0.2, 0.3, displacementIntensity);

    vec3 displacement = vec3(cos(aAngle) * 5.0, sin(aAngle) * 5.0, 2.0);
    displacement = normalize(displacement);
    displacement *= displacementIntensity + uTotalDisplacement;
    displacement *= 1.0;
    displacement *= aIntensity;
    newPosition += displacement;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    float noice = snoise(uv * 10.0) * 0.25;
    float progress = smoothstep(noice, 1.0, uProgress);

    // Point size transition
    float startPictureIntensity = texture(uPictureTexture, uv).r;
    float endPictureIntensity = texture(uPictureTextureNext, uv).r;
    float mixedPictureIntensity = mix(startPictureIntensity, endPictureIntensity, progress);

    // Point size
    gl_PointSize = 0.1 * mixedPictureIntensity * uResolution.y - (displacementIntensity * 75.0);
    gl_PointSize *= (1.0 / -viewPosition.z);

    // Varyings
    vColor = vec3(pow(mixedPictureIntensity, 2.0));
    vColor = mix(vColor, uColor, newPosition.z);
}