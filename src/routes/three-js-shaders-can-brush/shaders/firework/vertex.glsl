uniform float uSize;
uniform vec2 uResolution;
uniform float uProgress;
uniform vec2 uMousePosition;

attribute float aTimeMultiplier;

varying float vProgress;
varying float vRotation;  // Add this to pass rotation to fragment shader

// Hash function to generate pseudo-random values
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec3 newPosition = vec3(0.0, 0.0, 0.0);

    float progress = uProgress * aTimeMultiplier;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);

    modelPosition.x += uMousePosition.x * 8.5 + 2.0;
    modelPosition.y -= uMousePosition.y * 8.5;

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // Generate rotation based on position and progress
    vRotation = random(modelPosition.xy) * 3.14159 * 2.0;

    gl_PointSize = uSize * uResolution.y * 0.5;

    if(gl_PointSize < 1.0) {
        gl_Position = vec4(9999.0);
    }

    vProgress = progress;
}