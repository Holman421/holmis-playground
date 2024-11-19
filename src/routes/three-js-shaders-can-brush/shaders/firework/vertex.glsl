uniform float uSize;
uniform vec2 uResolution;
uniform float uProgress;
uniform vec2 uMousePosition;

attribute float aTimeMultiplier;
attribute float aRotation; // New attribute for random rotation

varying float vProgress;
varying vec2 vUv; // New varying for rotated UVs

// Rotation matrix helper function
mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

void main() {
    vec3 newPosition = vec3(0.0, 0.0, 0.0);

    float progress = uProgress * aTimeMultiplier;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);

    modelPosition.x += uMousePosition.x * 8.5 + 2.0;
    modelPosition.y -= uMousePosition.y * 8.5;

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = uSize * uResolution.y * 0.5;

    if(gl_PointSize < 1.0) {
        gl_Position = vec4(9999.0);
    }

    // Calculate rotated UV coordinates
    vec2 uv = position.xy; // Original position as UV
    // Rotate UVs around center point (0.5, 0.5)
    vec2 rotatedUv = rotate2d(aRotation) * (uv - 0.5) + 0.5;
    vUv = rotatedUv;

    vProgress = progress;
}