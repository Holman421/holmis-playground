uniform float uSize;
uniform vec2 uResolution;
uniform float uProgress;
uniform vec2 uMousePosition;

attribute float aTimeMultiplier;

varying float vProgress;

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

    vProgress = progress;
}