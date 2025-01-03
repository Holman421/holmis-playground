attribute float aIntensity;
attribute float aAngle;

uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;

varying float vDisplacementIntensity;
varying vec3 vColor;

void main() {
    // Displacement
    vec3 newPosition = position;
    float displacementIntensity = texture(uDisplacementTexture, uv).r;
    displacementIntensity = smoothstep(0.1, 1.5, displacementIntensity);

    vec3 displacement = vec3(cos(aAngle) * 0.2, sin(aAngle) * 0.2, 1.0);
    displacement = normalize(displacement);
    displacement *= displacementIntensity;
    displacement *= 1.0;
    displacement *= aIntensity;

    newPosition += displacement;

    // Final positionw
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    float pictureIntensity = texture(uPictureTexture, uv).r;

    // Point size
    gl_PointSize = 0.1 * pictureIntensity * uResolution.y;
    gl_PointSize *= (1.0 / -viewPosition.z);

    // Varyings
    // vColor = vec3(pow(pictureIntensity, 2.0));
    vColor = mix(vColor, vec3(1.0, 0.0, 0.0), newPosition.z);
    vDisplacementIntensity = displacementIntensity;
}